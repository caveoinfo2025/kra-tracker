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

async function totalCollectionsWithoutGst(employeeId: number) {
  const rows = await prisma.collection.findMany({
    where: { employeeId },
    select: { amountWithoutGstLakhs: true },
  });
  return rows.reduce((s, r) => s + r.amountWithoutGstLakhs, 0);
}

async function avgGrossProfit(employeeId: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { grossProfitPct: true },
  });
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r.grossProfitPct, 0) / rows.length;
}

/**
 * On-time collection rate = invoice value of "Fully Received" records
 * divided by total invoice value.  "Overdue" / "Pending" / "Partially Received"
 * records all count as NOT collected within the due date.
 */
async function onTimeCollectionRate(employeeId: number) {
  const rows = await prisma.collection.findMany({
    where: { employeeId },
    select: { collectionStatus: true, invoiceValueLakhs: true },
  });
  if (!rows.length) return { rate: 0, fullyReceived: 0, total: 0 };
  const totalValue       = rows.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const fullyReceivedVal = rows
    .filter((r) => r.collectionStatus === "Fully Received")
    .reduce((s, r) => s + r.invoiceValueLakhs, 0);
  return {
    rate: totalValue > 0 ? fullyReceivedVal / totalValue : 0,
    fullyReceived: fullyReceivedVal,
    total: totalValue,
  };
}

/** Category-wise Closed Won booking from Sales Funnel */
async function bookingByCategory(employeeId: number) {
  const rows = await prisma.salesFunnel.findMany({
    where: { employeeId, stage: "Closed Won" },
    select: { solutionCategory: true, dealValueLakhs: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) {
    const cat = r.solutionCategory?.trim() || "Other";
    map[cat] = (map[cat] ?? 0) + r.dealValueLakhs;
  }
  return map;
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
      // Booking = Closed Won deal value from Sales Funnel
      const booking       = await closedWonBooking(employeeId);
      // Billing KRA target = 90% of closed-won booking (dynamic)
      const billingTarget = booking * 0.9;
      // Billing achieved = Total (Without GST) from Collections
      const billing       = await totalCollectionsWithoutGst(employeeId);
      const gpTarget      = targets["average gross profit margin"] ?? 10;
      const gp            = await avgGrossProfit(employeeId);
      // Collection KRA = % of invoice value Fully Received within due date
      const collTarget    = targets["payment collections within due dates & credit days reduction"] ?? 0.9;
      const collData      = await onTimeCollectionRate(employeeId);
      const coll          = collData.rate;

      const bookPct = bookingTarget > 0 ? (booking / bookingTarget) * 100 : 0;
      const billPct = billingTarget > 0 ? (billing / billingTarget) * 100 : 0;
      const gpPct   = gpTarget      > 0 ? (gp      / gpTarget)      * 100 : 0;
      const collPct = collTarget    > 0 ? (coll     / collTarget)    * 100 : 0;

      progress = clamp(Math.round((bookPct * 0.375 + billPct * 0.375 + gpPct * 0.125 + collPct * 0.125)));
      notes = [
        `Booking (Closed Won): ₹${booking.toFixed(1)}L / ₹${bookingTarget}L (${bookPct.toFixed(0)}%)`,
        `Billing (ex-GST): ₹${billing.toFixed(1)}L / ₹${billingTarget.toFixed(1)}L (${billPct.toFixed(0)}%)`,
        `On-time Collections: ₹${collData.fullyReceived.toFixed(1)}L / ₹${collData.total.toFixed(1)}L (${(coll * 100).toFixed(0)}%)`,
        `Gross Profit: ${gp.toFixed(1)}% / ${gpTarget}% (${gpPct.toFixed(0)}%)`,
      ].join(" | ");
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
      // Get booking target from the employee's Sales Revenue KRA (pipeline target is a multiplier)
      const salesKraForPip = await prisma.kRA.findFirst({
        where: { employeeId, status: "active", title: { contains: "sales revenue" } },
        select: { target: true },
      });
      const salesTargetsForPip = salesKraForPip ? parseTargets(salesKraForPip.target) : {};
      const bookingTargetForPip = salesTargetsForPip["total sales revenue - booking"] ?? 70;
      const poc = await pocCount(employeeId);
      const nc = await newCustomersClosed(employeeId);
      const pipRatio = await activePipelineRatio(employeeId, pipTarget * bookingTargetForPip);

      const pocPct = pocTarget > 0 ? (poc / pocTarget) * 100 : 0;
      const ncPct = ncTarget > 0 ? (nc / ncTarget) * 100 : 0;
      const pipPct = clamp(pipRatio * 100);
      progress = clamp(Math.round((pocPct * 0.25 + ncPct * 0.5 + pipPct * 0.25)));
      notes = `PoC: ${poc}/${pocTarget} | New customers/upsell: ${nc}/${ncTarget}`;
    }

    // ── Focus area revenue achievement (Closed Won from Sales Funnel) ────
    else if (t.includes("focus area")) {
      // Targets are proportions of the booking target (e.g. 0.35 = 35%)
      // Get booking target from the employee's Sales Revenue KRA
      const salesKra = await prisma.kRA.findFirst({
        where: { employeeId, status: "active", title: { contains: "sales revenue" } },
        select: { target: true },
      });
      const salesTargets = salesKra ? parseTargets(salesKra.target) : {};
      const bookingTarget = salesTargets["total sales revenue - booking"] ?? 70;

      const nsProp    = targets["network & security"]         ?? 0;
      const ssProp    = targets["server & storage"]           ?? 0;
      const msspProp  = targets["mssp services"]              ?? 0;
      const cloudProp = targets["cloud security & services"]  ?? 0;

      // Actual lakh targets = proportion × booking target
      const nsTarget    = bookingTarget * nsProp;
      const ssTarget    = bookingTarget * ssProp;
      const msspTarget  = bookingTarget * msspProp;
      const cloudTarget = bookingTarget * cloudProp;

      const catMap = await bookingByCategory(employeeId);
      const ns    = catMap["Network & Security"] ?? catMap["Network"] ?? 0;
      const ss    = catMap["Server & Storage"]   ?? catMap["Server"]  ?? 0;
      const mssp  = catMap["MSSP Services"]      ?? catMap["MSSP"]    ?? 0;
      const cloud = catMap["Cloud Security & Services"] ?? catMap["Cloud"] ?? 0;

      const catScores: number[] = [];
      const catNotes: string[]  = [];
      const addCat = (label: string, achieved: number, target: number) => {
        if (target > 0) {
          const pct = clamp((achieved / target) * 100);
          catScores.push(pct);
          catNotes.push(`${label}: ₹${achieved.toFixed(1)}L / ₹${target.toFixed(1)}L (${pct.toFixed(0)}%)`);
        } else if (achieved > 0) {
          catScores.push(100);
          catNotes.push(`${label}: ₹${achieved.toFixed(1)}L`);
        }
      };
      addCat("N&S",   ns,    nsTarget);
      addCat("S&S",   ss,    ssTarget);
      addCat("MSSP",  mssp,  msspTarget);
      addCat("Cloud", cloud, cloudTarget);

      progress = catScores.length > 0
        ? clamp(Math.round(catScores.reduce((a, b) => a + b, 0) / catScores.length))
        : 0;
      notes = catNotes.length > 0
        ? `(Booking target: ₹${bookingTarget}L) ` + catNotes.join(" | ")
        : "No Closed Won deals in any focus category yet.";
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
