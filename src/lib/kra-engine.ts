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
  if (progress >= 90)  return 9;
  if (progress >= 75)  return 8;
  if (progress >= 60)  return 7;
  if (progress >= 50)  return 6;
  if (progress >= 40)  return 5;
  if (progress >= 30)  return 4;
  if (progress >= 20)  return 3;
  return progress > 0 ? 2 : 1;
}

// ── Per-employee helpers ──────────────────────────────────────────────────────

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
 * On-time collection rate = invoice value of "Fully Received" / total invoice value.
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

/**
 * Customer retention rate = customers with ≥2 invoices / total unique customers billed.
 */
async function customerRetentionRate(employeeId: number) {
  const rows = await prisma.collection.findMany({
    where: { employeeId },
    select: { customerName: true },
  });
  if (!rows.length) return { rate: 0, returning: 0, total: 0 };
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const name = r.customerName.trim().toLowerCase();
    counts[name] = (counts[name] ?? 0) + 1;
  }
  const total     = Object.keys(counts).length;
  const returning = Object.values(counts).filter((c) => c >= 2).length;
  return { rate: total > 0 ? returning / total : 0, returning, total };
}

/**
 * Forecast accuracy = % of deals with expectedCloseDate in the past that are Closed Won.
 * Proxy: measures how well the team forecast their close dates.
 */
async function forecastAccuracy(employeeId: number) {
  const pastDue = await prisma.salesFunnel.findMany({
    where: { employeeId, expectedCloseDate: { lt: new Date() } },
    select: { stage: true },
  });
  if (!pastDue.length) return 0;
  const closed = pastDue.filter((d) => d.stage === "Closed Won").length;
  return closed / pastDue.length;
}

/**
 * CRM data accuracy = % of lead gen records with nextActionDate filled in.
 */
async function crmAccuracy(employeeId: number) {
  const rows = await prisma.leadGeneration.findMany({
    where: { employeeId },
    select: { nextActionDate: true },
  });
  if (!rows.length) return 0;
  const complete = rows.filter((r) => r.nextActionDate !== null).length;
  return complete / rows.length;
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

// ── Team-wide helpers (for Vijesh - Head of Sales) ────────────────────────────

async function teamBooking() {
  const rows = await prisma.salesFunnel.findMany({
    where: { stage: "Closed Won" },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

async function teamBilling() {
  const rows = await prisma.collection.findMany({
    select: { amountWithoutGstLakhs: true },
  });
  return rows.reduce((s, r) => s + r.amountWithoutGstLakhs, 0);
}

async function teamAvgGrossProfit() {
  const rows = await prisma.salesFunnel.findMany({
    where: { stage: "Closed Won" },
    select: { grossProfitPct: true },
  });
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r.grossProfitPct, 0) / rows.length;
}

async function teamCollectionsEfficiency() {
  const rows = await prisma.collection.findMany({
    select: { collectionStatus: true, invoiceValueLakhs: true },
  });
  if (!rows.length) return 0;
  const total    = rows.reduce((s, r) => s + r.invoiceValueLakhs, 0);
  const received = rows.filter((r) => r.collectionStatus === "Fully Received")
    .reduce((s, r) => s + r.invoiceValueLakhs, 0);
  return total > 0 ? received / total : 0;
}

async function teamNewLogos() {
  return prisma.salesFunnel.count({ where: { newCustomerFlag: true, stage: "Closed Won" } });
}

/** New projects = all opportunities added to the funnel (across all employees) */
async function teamNewProjects() {
  return prisma.salesFunnel.count();
}

/**
 * Focus area revenue mix = % of team Closed Won from the 4 focus categories.
 */
async function teamFocusAreaMix() {
  const rows = await prisma.salesFunnel.findMany({
    where: { stage: "Closed Won" },
    select: { solutionCategory: true, dealValueLakhs: true },
  });
  const total = rows.reduce((s, r) => s + r.dealValueLakhs, 0);
  if (total === 0) return 0;
  const focusKeywords = ["network", "server", "mssp", "cloud"];
  const focusTotal = rows
    .filter((r) => {
      const cat = (r.solutionCategory ?? "").toLowerCase();
      return focusKeywords.some((k) => cat.includes(k));
    })
    .reduce((s, r) => s + r.dealValueLakhs, 0);
  return focusTotal / total;
}

/**
 * Team KRA achievement rate = average progress% of last review across all non-manager KRAs.
 */
async function teamKRARate() {
  const employees = await prisma.employee.findMany({
    where: { isManager: false },
    select: { id: true },
  });
  const empIds = employees.map((e) => e.id);
  if (!empIds.length) return 0;

  // Latest review per KRA
  const kras = await prisma.kRA.findMany({
    where: { employeeId: { in: empIds }, status: "active" },
    include: {
      reviews: {
        orderBy: [{ year: "desc" }, { week: "desc" }],
        take: 1,
      },
    },
  });
  const withReview = kras.filter((k) => k.reviews.length > 0);
  if (!withReview.length) return 0;
  return withReview.reduce((s, k) => s + k.reviews[0].progress, 0) / (withReview.length * 100);
}

async function teamPipeline() {
  const rows = await prisma.salesFunnel.findMany({
    where: { status: "Active" },
    select: { dealValueLakhs: true },
  });
  return rows.reduce((s, r) => s + r.dealValueLakhs, 0);
}

/**
 * Team forecast accuracy = % of team deals with expectedCloseDate in the past that are Closed Won.
 */
async function teamForecastAccuracy() {
  const pastDue = await prisma.salesFunnel.findMany({
    where: { expectedCloseDate: { lt: new Date() } },
    select: { stage: true },
  });
  if (!pastDue.length) return 0;
  const closed = pastDue.filter((d) => d.stage === "Closed Won").length;
  return closed / pastDue.length;
}

/** Deal win rate = Closed Won count / total opportunities */
async function teamDealWinRate() {
  const total = await prisma.salesFunnel.count();
  if (total === 0) return 0;
  const won = await prisma.salesFunnel.count({ where: { stage: "Closed Won" } });
  return won / total;
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
      // Use explicit billing target from target string; fall back to 90% of booking target
      const billingTarget = targets["total sales revenue - billing"] ?? (bookingTarget * 0.9);
      const booking       = await closedWonBooking(employeeId);
      const billing       = await totalCollectionsWithoutGst(employeeId);
      const gpTarget      = targets["average gross profit margin"] ?? 10;
      const gp            = await avgGrossProfit(employeeId);
      const collTarget    = targets["payment collections within due dates & credit days reduction"] ?? 0.9;
      const collData      = await onTimeCollectionRate(employeeId);
      const coll          = collData.rate;

      const bookPct = clamp((booking / bookingTarget) * 100);
      const billPct = clamp((billing / billingTarget) * 100);
      const gpPct   = clamp((gp     / gpTarget)      * 100);
      const collPct = clamp((coll   / collTarget)     * 100);

      // Weights from Excel: booking=0.375, billing=0.375, GP=0.125, collections=0.125
      progress = clamp(Math.round(bookPct * 0.375 + billPct * 0.375 + gpPct * 0.125 + collPct * 0.125));
      notes = [
        `Booking (Closed Won): ₹${booking.toFixed(1)}L / ₹${bookingTarget}L (${bookPct.toFixed(0)}%)`,
        `Billing (ex-GST): ₹${billing.toFixed(1)}L / ₹${billingTarget.toFixed(1)}L (${billPct.toFixed(0)}%)`,
        `On-time Collections: ₹${collData.fullyReceived.toFixed(1)}L / ₹${collData.total.toFixed(1)}L (${(coll * 100).toFixed(0)}%)`,
        `Gross Profit: ${gp.toFixed(1)}% / ${gpTarget}% (${gpPct.toFixed(0)}%)`,
      ].join(" | ");
    }

    // ── Customer & Business Development ──────────────────────────────────
    else if (t.includes("customer & business") || t.includes("customer and business")) {
      const retTarget = targets["customer retention rate"];     // optional
      const qlTarget  = targets["qualified leads generation"];  // optional
      const ncTarget  = targets["new customers"];               // optional

      const scores: number[]  = [];
      const noteParts: string[] = [];

      if (retTarget !== undefined) {
        const ret = await customerRetentionRate(employeeId);
        const pct = clamp((ret.rate / retTarget) * 100);
        scores.push(pct);
        noteParts.push(`Retention: ${ret.returning}/${ret.total} customers (${(ret.rate * 100).toFixed(0)}%)`);
      }
      if (qlTarget !== undefined) {
        const ql  = await qualifiedLeads(employeeId);
        const pct = clamp((ql / qlTarget) * 100);
        scores.push(pct);
        noteParts.push(`Qualified leads: ${ql}/${qlTarget}`);
      }
      if (ncTarget !== undefined) {
        const nc  = await newCustomersClosed(employeeId);
        const pct = clamp((nc / ncTarget) * 100);
        scores.push(pct);
        noteParts.push(`New customers: ${nc}/${ncTarget}`);
      }

      progress = scores.length > 0
        ? clamp(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
        : 0;
      notes = noteParts.join(" | ") || "No targets configured.";
    }

    // ── Sales management ─────────────────────────────────────────────────
    else if (t.includes("sales management")) {
      const pocTarget = targets['non-obligatory" proof of concept (poc)'] ?? 4;
      const ncTarget  = targets["new customers or upsell closure"]; // optional
      const pipTarget = targets["pipeline"] ?? 2;

      // Get booking target from the employee's Sales Revenue KRA
      const salesKra = await prisma.kRA.findFirst({
        where: { employeeId, status: "active", title: { contains: "Sales Revenue" } },
        select: { target: true },
      });
      const salesTargets       = salesKra ? parseTargets(salesKra.target) : {};
      const bookingTargetForPip = salesTargets["total sales revenue - booking"] ?? 70;

      const poc      = await pocCount(employeeId);
      const pipRatio = await activePipelineRatio(employeeId, pipTarget * bookingTargetForPip);

      const pocPct = clamp((poc / pocTarget) * 100);
      const pipPct = clamp(pipRatio * 100);

      const scores: number[]    = [pocPct, pipPct];
      const noteParts: string[] = [
        `PoC: ${poc}/${pocTarget}`,
        `Pipeline: ${(pipRatio * 100).toFixed(0)}% of target`,
      ];

      if (ncTarget !== undefined) {
        const nc    = await newCustomersClosed(employeeId);
        const ncPct = clamp((nc / ncTarget) * 100);
        scores.push(ncPct);
        noteParts.splice(1, 0, `New customers/upsell: ${nc}/${ncTarget}`);
      }

      progress = clamp(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
      notes = noteParts.join(" | ");
    }

    // ── Focus area revenue achievement ────────────────────────────────────
    else if (t.includes("focus area")) {
      // Get booking target from the employee's Sales Revenue KRA
      const salesKra = await prisma.kRA.findFirst({
        where: { employeeId, status: "active", title: { contains: "Sales Revenue" } },
        select: { target: true },
      });
      const salesTargets  = salesKra ? parseTargets(salesKra.target) : {};
      const bookingTarget = salesTargets["total sales revenue - booking"] ?? 70;

      // Targets are proportions of booking target (e.g. 0.35 = 35% × bookingTarget ₹L)
      const nsProp    = targets["network & security"]        ?? 0;
      const ssProp    = targets["server & storage"]          ?? 0;
      const msspProp  = targets["mssp services"]             ?? 0;
      const cloudProp = targets["cloud security & services"] ?? 0;

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

    // ── Sales Operations Excellence ───────────────────────────────────────
    else if (t.includes("sales operations")) {
      const forecastTarget = targets["forecast accuracy"];
      const crmTarget      = targets["crm data accuracy & timely lead updates"];
      // Certification is manual — cannot auto-compute

      const scores: number[]    = [];
      const noteParts: string[] = [];

      if (forecastTarget !== undefined) {
        const fc  = await forecastAccuracy(employeeId);
        const pct = clamp((fc / forecastTarget) * 100);
        scores.push(pct);
        noteParts.push(`Forecast: ${(fc * 100).toFixed(0)}% / ${(forecastTarget * 100).toFixed(0)}%`);
      }

      if (crmTarget !== undefined) {
        const crm = await crmAccuracy(employeeId);
        const pct = clamp((crm / crmTarget) * 100);
        scores.push(pct);
        noteParts.push(`CRM accuracy: ${(crm * 100).toFixed(0)}% / ${(crmTarget * 100).toFixed(0)}%`);
      }

      const certTarget = targets["certification and product training"];
      if (certTarget !== undefined) {
        noteParts.push(`Certifications: target ${certTarget} (enter manually)`);
      }

      if (scores.length > 0) {
        progress = clamp(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
        notes = noteParts.join(" | ");
      } else {
        results.push({ kraId: kra.id, kraTitle: kra.title, progress: 0, score: 1, notes: "Enter manually via Weekly Review." });
        continue;
      }
    }

    // ── Lead Generation Activity (Akshayah) ──────────────────────────────
    else if (t.includes("lead generation activity")) {
      const callTarget = targets["total outbound calls made"] ?? 180;
      const connTarget = targets["meaningful connects achieved"] ?? 50;
      const calls = await outboundCalls(employeeId);
      const conns = await connects(employeeId);
      const callPct = clamp((calls / callTarget) * 100);
      const connPct = clamp((conns / connTarget) * 100);
      progress = clamp(Math.round((callPct * 0.5 + connPct * 0.5)));
      notes = `Calls: ${calls}/${callTarget} (${callPct.toFixed(0)}%) | Connects: ${conns}/${connTarget} (${connPct.toFixed(0)}%)`;
    }

    // ── Pipeline Building (Akshayah) ─────────────────────────────────────
    else if (t.includes("pipeline building")) {
      const qlTarget   = targets["qualified leads generated"] ?? 25;
      const apptTarget = targets["appointments fixed for bdm / sales closure team"] ?? 25;
      const ql    = await qualifiedLeads(employeeId);
      const appts = await appointments(employeeId);
      const qlPct   = clamp((ql    / qlTarget)   * 100);
      const apptPct = clamp((appts / apptTarget)  * 100);
      // Weights from Excel: qualified leads=0.13, appointments=0.12 → ~52/48
      progress = clamp(Math.round(qlPct * 0.52 + apptPct * 0.48));
      notes = `Qualified leads: ${ql}/${qlTarget} (${qlPct.toFixed(0)}%) | Appointments: ${appts}/${apptTarget} (${apptPct.toFixed(0)}%)`;
    }

    // ── Funnel Creation (Akshayah) ────────────────────────────────────────
    else if (t.includes("funnel creation")) {
      const valTarget = targets["total funnel / pipeline value created (₹ lakhs)"] ?? 75;
      const cntTarget = targets["number of funnel opportunities created"] ?? 10;
      const val = await totalPipelineValue(employeeId);
      const cnt = await pipelineOpportunities(employeeId);
      const valPct = clamp((val / valTarget) * 100);
      const cntPct = clamp((cnt / cntTarget) * 100);
      // Weights from Excel: value=0.75, count=0.25
      progress = clamp(Math.round(valPct * 0.75 + cntPct * 0.25));
      notes = `Pipeline value: ₹${val.toFixed(1)}L / ₹${valTarget}L (${valPct.toFixed(0)}%) | Opportunities: ${cnt}/${cntTarget} (${cntPct.toFixed(0)}%)`;
    }

    // ── Marketing Activities (Akshayah — manual) ─────────────────────────
    else if (t.includes("marketing activities")) {
      results.push({
        kraId: kra.id, kraTitle: kra.title, progress: 0, score: 1,
        notes: "Enter manually via Weekly Review (webinars organised, blitz days conducted).",
      });
      continue;
    }

    // ── Revenue & Profitability (Vijesh) ──────────────────────────────────
    else if (t.includes("revenue & profitability")) {
      const bookTarget = targets["total team booking target achievement (₹ lakhs)"] ?? 500;
      const billTarget = targets["total team billing achievement"] ?? 450;
      const gpTarget   = targets["gross profit margin (%)"] ?? 12;
      const collTarget = targets["collections efficiency (% within due dates)"] ?? 0.9;

      const booking = await teamBooking();
      const billing = await teamBilling();
      const gp      = await teamAvgGrossProfit();
      const coll    = await teamCollectionsEfficiency();

      const bookPct = clamp((booking / bookTarget) * 100);
      const billPct = clamp((billing / billTarget) * 100);
      const gpPct   = clamp((gp     / gpTarget)   * 100);
      const collPct = clamp((coll   / collTarget)  * 100);

      // Weights from Excel: booking=0.375, billing=0.325, GP=0.200, coll=0.100
      progress = clamp(Math.round(bookPct * 0.375 + billPct * 0.325 + gpPct * 0.2 + collPct * 0.1));
      notes = [
        `Team booking: ₹${booking.toFixed(1)}L / ₹${bookTarget}L (${bookPct.toFixed(0)}%)`,
        `Team billing: ₹${billing.toFixed(1)}L / ₹${billTarget}L (${billPct.toFixed(0)}%)`,
        `Team GP: ${gp.toFixed(1)}% / ${gpTarget}% (${gpPct.toFixed(0)}%)`,
        `Collections efficiency: ${(coll * 100).toFixed(0)}% / ${(collTarget * 100).toFixed(0)}%`,
      ].join(" | ");
    }

    // ── Market Growth & Business Development (Vijesh) ─────────────────────
    else if (t.includes("market growth")) {
      const logosTarget = targets["new logos / strategic accounts acquired by team"] ?? 10;
      const projTarget  = targets["new projects & strategic deals initiated"] ?? 15;
      const mixTarget   = targets["focus area revenue mix achievement (n&s, s&s, mssp, cloud)"] ?? 0.85;

      const logos = await teamNewLogos();
      const projs = await teamNewProjects();
      const mix   = await teamFocusAreaMix();

      const logosPct = clamp((logos / logosTarget) * 100);
      const projsPct = clamp((projs / projTarget)  * 100);
      const mixPct   = clamp((mix   / mixTarget)   * 100);

      // Weights from Excel: logos=0.48 (12/25), projects=0.32 (8/25), mix=0.20 (5/25)
      progress = clamp(Math.round(logosPct * 0.48 + projsPct * 0.32 + mixPct * 0.20));
      notes = [
        `New logos: ${logos}/${logosTarget} (${logosPct.toFixed(0)}%)`,
        `New projects in funnel: ${projs}/${projTarget} (${projsPct.toFixed(0)}%)`,
        `Focus area mix: ${(mix * 100).toFixed(0)}% / ${(mixTarget * 100).toFixed(0)}%`,
      ].join(" | ");
    }

    // ── Team Leadership & Talent Development (Vijesh) ─────────────────────
    else if (t.includes("team leadership")) {
      const kraRateTarget = targets["team aggregate kra achievement rate"] ?? 0.9;

      const kraRate    = await teamKRARate();
      const kraRatePct = clamp((kraRate / kraRateTarget) * 100);

      // Retention and training are manual — use 50% weight for auto-computed portion
      progress = clamp(Math.round(kraRatePct * 0.5));
      notes = `Team KRA rate: ${(kraRate * 100).toFixed(0)}% / ${(kraRateTarget * 100).toFixed(0)}% (${kraRatePct.toFixed(0)}% of target) | Talent retention & training: enter manually via Weekly Review`;
    }

    // ── Pipeline Health & Strategic Execution (Vijesh) ────────────────────
    else if (t.includes("pipeline health")) {
      const pipTarget      = targets["total team pipeline coverage (₹ lakhs)"] ?? 1500;
      const forecastTarget = targets["forecast accuracy"] ?? 0.9;
      const winTarget      = targets["average deal win rate"] ?? 0.3;

      const pipeline = await teamPipeline();
      const forecast = await teamForecastAccuracy();
      const winRate  = await teamDealWinRate();

      const pipPct      = clamp((pipeline / pipTarget)  * 100);
      const forecastPct = clamp((forecast / forecastTarget) * 100);
      const winPct      = clamp((winRate  / winTarget)   * 100);

      // Weights from Excel: pipeline=0.53 (8/15), forecast=0.33 (5/15), win=0.13 (2/15)
      progress = clamp(Math.round(pipPct * 0.53 + forecastPct * 0.33 + winPct * 0.13));
      notes = [
        `Team pipeline: ₹${pipeline.toFixed(1)}L / ₹${pipTarget}L (${pipPct.toFixed(0)}%)`,
        `Forecast accuracy: ${(forecast * 100).toFixed(0)}% / ${(forecastTarget * 100).toFixed(0)}%`,
        `Win rate: ${(winRate * 100).toFixed(0)}% / ${(winTarget * 100).toFixed(0)}%`,
      ].join(" | ");
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
