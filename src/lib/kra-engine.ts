/**
 * KRA Engine — computes live KRA progress from activity sheets.
 * Maps KRA titles → aggregation queries on LeadGeneration, SalesFunnel, Collection.
 */
import prisma from "@/lib/prisma";

export type KRAProgress = {
  kraId: number;
  kraTitle: string;
  progress: number;   // 0-100 %
  score: number;      // 1-10
  notes: string;
};

/** Parse the target string stored in the KRA into a map of { kpiLabel → numericTarget } */
function parseTargets(targetStr: string): Record<string, number> {
  const map: Record<string, number> = {};
  targetStr.split(";").forEach((chunk) => {
    const idx = chunk.lastIndexOf(":");
    if (idx === -1) return;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const val = parseFloat(chunk.slice(idx + 1).trim());
    if (!isNaN(val)) map[key] = val;
  });
  return map;
}

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

function toScore(progress: number): number {
  if (progress >= 100) return 10;
  if (progress >= 90) return 9;
  if (progress >= 75) return 8;
  if (progress >= 60) return 7;
  if (progress >= 50) return 6;
  if (progress >= 40) return 5;
  if (progress >= 30) return 4;
  if (progress >= 20) return 3;
  return progress > 0 ? 2 : 1;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function closedWonBooking(employeeId: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

async function closedWonBilling(employeeId: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { billingValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.billingValueLakhs, 0);
}

async function avgGrossProfit(employeeId: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { grossProfitPct: true },
  });
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r.grossProfitPct, 0) / rows.length;
}

async function collectionRate(employeeId: number) {
  const rows = await prisma.collection.findMany({
    where: { employeeId },
    select: { invoiceValueLakhs: true, amountReceivedLakhs: true },
  });
  const total = rows.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const received = rows.reduce((s, r) => s + r.amountReceivedLakhs, 0);
  return total > 0 ? received / total : 0;
}

async function qualifiedLeads(employeeId: number) {
  return prisma.leadGeneration.count({ where: { employeeId, qualifiedFlag: true } });
}

async function newCustomersClosed(employeeId: number) {
  return prisma.salesFunnel.count({ where: { employeeId, newCustomerFlag: true, stage: "Closed Won" } });
}

async function pocCount(employeeId: number) {
  return prisma.salesFunnel.count({ where: { employeeId, pocFlag: true } });
}

async function activePipelineRatio(employeeId: number, targetLakhs: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, status: "Active" },
    select: { dealValueLakhs: true },
  });
  const total = rows.reduce((s, r) => s + r.dealValueLakhs, 0);
  return targetLakhs > 0 ? total / targetLakhs : 0;
}

async function focusAreaRevenue(employeeId: number, category: string) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won", solutionCategory: { contains: category } },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

async function outboundCalls(employeeId: number) {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, activityType: "Call" },
    select: { activityCount: true },
  });
  return rows.reduce((s, r) => s + r.activityCount, 0);
}

async function connects(employeeId: number) {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, activityType: "Connect" },
    select: { activityCount: true },
  });
  return rows.reduce((s, r) => s + r.activityCount, 0);
}

async function appointments(employeeId: number) {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId, activityType: "Meeting" },
    select: { activityCount: true },
  });
  return rows.reduce((s, r) => s + r.activityCount, 0);
}

async function totalPipelineValue(employeeId: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

async function pipelineOpportunities(employeeId: number) {
  return prisma.salesFunnel.count({ where: { employeeId } });
}

// Team-wide aggregates (for Vijesh - Head of Sales)
async function teamBooking() {
  const rows = await prisma.salesFunnel.findMany({
    where: { stage: "Closed Won" },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

async function teamNewLogos() {
  return prisma.salesFunnel.count({ where: { newCustomerFlag: true, stage: "Closed Won" } });
}

async function teamPipeline() {
  const rows = await prisma.salesFunnel.findMany({
    where: { status: "Active" },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

// ── Main computation ──────────────────────────────────────────────────────────

export async function computeKRAProgress(
  employeeId: number,
  kras: { id: number; title: string; target: string }[]
): Promise<KRAProgress[]> {
  const results: KRAProgress[] = [];

  for (const kra of kras) {
    const targets = parseTargets(kra.target);
    const t = kra.title.toLowerCase();
    let progress = 0;
    let notes = "Auto-computed from activity sheets.";

    // ── Sales Revenue targets ─────────────────────────────────────────────
    if (t.includes("sales revenue")) {
      const bookingTarget = targets["total sales revenue - booking"] ?? 70;
      const booking = await closedWonBooking(employeeId);
      const billingTarget = targets["total sales revenue - billing"] ?? 0.9;
      const billing = await closedWonBilling(employeeId);
      const gpTarget = targets["average gross profit margin"] ?? 10;
      const gp = await avgGrossProfit(employeeId);
      const collTarget = targets["payment collections within due dates & credit days reduction"] ?? 0.9;
      const coll = await collectionRate(employeeId);

      const bookPct = bookingTarget > 0 ? (booking / bookingTarget) * 100 : 0;
      const billPct = billingTarget > 0 ? (billing / billingTarget) * 100 : 0;
      const gpPct = gpTarget > 0 ? (gp / gpTarget) * 100 : 0;
      const collPct = collTarget > 0 ? (coll / collTarget) * 100 : 0;

      progress = clamp(Math.round((bookPct * 0.375 + billPct * 0.375 + gpPct * 0.125 + collPct * 0.125)));
      notes = `Booking: ₹${booking.toFixed(1)}L/${bookingTarget}L (${bookPct.toFixed(0)}%) | Collections: ${(coll * 100).toFixed(0)}%`;
    }

    // ── Customer & Business Development ──────────────────────────────────
    else if (t.includes("customer & business") || t.includes("customer and business")) {
      const qlTarget = targets["qualified leads generation"] ?? 20;
      const ncTarget = targets["new customers"] ?? 8;
      const ql = await qualifiedLeads(employeeId);
      const nc = await newCustomersClosed(employeeId);

      const qlPct = qlTarget > 0 ? (ql / qlTarget) * 100 : 0;
      const ncPct = ncTarget > 0 ? (nc / ncTarget) * 100 : 0;
      progress = clamp(Math.round((qlPct + ncPct) / 2));
      notes = `Qualified leads: ${ql}/${qlTarget} | New customers: ${nc}/${ncTarget}`;
    }

    // ── Sales management ─────────────────────────────────────────────────
    else if (t.includes("sales management")) {
      const pocTarget = targets["non-obligatory\" proof of concept (poc)"] ?? 4;
      const ncTarget = targets["new customers or upsell closure"] ?? 8;
      const pipTarget = targets["pipeline"] ?? 2;
      const poc = await pocCount(employeeId);
      const nc = await newCustomersClosed(employeeId);
      const pipRatio = await activePipelineRatio(employeeId, pipTarget * 70);

      const pocPct = pocTarget > 0 ? (poc / pocTarget) * 100 : 0;
      const ncPct = ncTarget > 0 ? (nc / ncTarget) * 100 : 0;
      const pipPct = clamp(pipRatio * 100);
      progress = clamp(Math.round((pocPct * 0.25 + ncPct * 0.5 + pipPct * 0.25)));
      notes = `PoC: ${poc}/${pocTarget} | New customers/upsell: ${nc}/${ncTarget}`;
    }

    // ── Focus area revenue achievement ───────────────────────────────────
    else if (t.includes("focus area")) {
      const nsTarget = targets["network & security"] ?? 0.35;
      const ssTarget = targets["server & storage"] ?? 0.2;
      const msspTarget = targets["mssp services"] ?? 0.2;
      const cloudTarget = targets["cloud security & services"] ?? 0.1;

      const ns = await focusAreaRevenue(employeeId, "Network");
      const ss = await focusAreaRevenue(employeeId, "Server");
      const mssp = await focusAreaRevenue(employeeId, "MSSP");
      const cloud = await focusAreaRevenue(employeeId, "Cloud");

      const pcts = [
        nsTarget > 0 ? ns / nsTarget : 0,
        ssTarget > 0 ? ss / ssTarget : 0,
        msspTarget > 0 ? mssp / msspTarget : 0,
        cloudTarget > 0 ? cloud / cloudTarget : 0,
      ];
      progress = clamp(Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100));
      notes = `N&S: ₹${ns.toFixed(2)}L | S&S: ₹${ss.toFixed(2)}L | MSSP: ₹${mssp.toFixed(2)}L | Cloud: ₹${cloud.toFixed(2)}L`;
    }

    // ── Lead Generation Activity (Akshayah) ──────────────────────────────
    else if (t.includes("lead generation activity")) {
      const callTarget = targets["total outbound calls made"] ?? 180;
      const connTarget = targets["meaningful connects achieved"] ?? 50;
      const calls = await outboundCalls(employeeId);
      const conns = await connects(employeeId);
      const callPct = callTarget > 0 ? (calls / callTarget) * 100 : 0;
      const connPct = connTarget > 0 ? (conns / connTarget) * 100 : 0;
      progress = clamp(Math.round((callPct + connPct) / 2));
      notes = `Calls: ${calls}/${callTarget} | Connects: ${conns}/${connTarget}`;
    }

    // ── Pipeline Building (Akshayah) ─────────────────────────────────────
    else if (t.includes("pipeline building")) {
      const qlTarget = targets["qualified leads generated"] ?? 25;
      const apptTarget = targets["appointments fixed for bdm / sales closure team"] ?? 25;
      const ql = await qualifiedLeads(employeeId);
      const appts = await appointments(employeeId);
      const qlPct = qlTarget > 0 ? (ql / qlTarget) * 100 : 0;
      const apptPct = apptTarget > 0 ? (appts / apptTarget) * 100 : 0;
      progress = clamp(Math.round((qlPct + apptPct) / 2));
      notes = `Qualified leads: ${ql}/${qlTarget} | Appointments: ${appts}/${apptTarget}`;
    }

    // ── Funnel Creation (Akshayah) ────────────────────────────────────────
    else if (t.includes("funnel creation")) {
      const valTarget = targets["total funnel / pipeline value created (₹ lakhs)"] ?? 75;
      const cntTarget = targets["number of funnel opportunities created"] ?? 10;
      const val = await totalPipelineValue(employeeId);
      const cnt = await pipelineOpportunities(employeeId);
      const valPct = valTarget > 0 ? (val / valTarget) * 100 : 0;
      const cntPct = cntTarget > 0 ? (cnt / cntTarget) * 100 : 0;
      progress = clamp(Math.round((valPct * 0.75 + cntPct * 0.25)));
      notes = `Pipeline value: ₹${val.toFixed(1)}L/${valTarget}L | Opportunities: ${cnt}/${cntTarget}`;
    }

    // ── Revenue & Profitability (Vijesh) ──────────────────────────────────
    else if (t.includes("revenue & profitability")) {
      const bookTarget = targets["total team booking target achievement (₹ lakhs)"] ?? 500;
      const booking = await teamBooking();
      progress = clamp(Math.round((booking / bookTarget) * 100));
      notes = `Team booking: ₹${booking.toFixed(1)}L / ₹${bookTarget}L target`;
    }

    // ── Market Growth & Business Development (Vijesh) ─────────────────────
    else if (t.includes("market growth")) {
      const logosTarget = targets["new logos / strategic accounts acquired by team"] ?? 10;
      const logos = await teamNewLogos();
      progress = clamp(Math.round((logos / logosTarget) * 100));
      notes = `New logos: ${logos}/${logosTarget}`;
    }

    // ── Pipeline Health & Strategic Execution (Vijesh) ────────────────────
    else if (t.includes("pipeline health")) {
      const pipTarget = targets["total team pipeline coverage (₹ lakhs)"] ?? 1500;
      const pipeline = await teamPipeline();
      progress = clamp(Math.round((pipeline / pipTarget) * 100));
      notes = `Team pipeline: ₹${pipeline.toFixed(1)}L / ₹${pipTarget}L target`;
    }

    // ── Sales Operations Excellence (manual/training) ─────────────────────
    else if (t.includes("sales operations")) {
      // Keep existing manual review — return 0 for auto-compute
      results.push({ kraId: kra.id, kraTitle: kra.title, progress: 0, score: 1, notes: "Enter manually via Weekly Review." });
      continue;
    }

    // ── Team Leadership & Talent Development (Vijesh, manual) ────────────
    else if (t.includes("team leadership")) {
      results.push({ kraId: kra.id, kraTitle: kra.title, progress: 0, score: 1, notes: "Computed from team KRA scores — update weekly." });
      continue;
    }

    // ── Marketing Activities (manual) ─────────────────────────────────────
    else if (t.includes("marketing activities")) {
      results.push({ kraId: kra.id, kraTitle: kra.title, progress: 0, score: 1, notes: "Enter manually via Weekly Review." });
      continue;
    }

    results.push({
      kraId: kra.id,
      kraTitle: kra.title,
      progress,
      score: toScore(progress),
      notes,
    });
  }

  return results;
}
