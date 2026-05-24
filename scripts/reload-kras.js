/**
 * Clears all existing KRAs (and cascaded reviews + weekly commits) for the 7
 * employees in KRA.xlsx, then inserts the updated KRA set.
 *
 * Run: node scripts/reload-kras.js
 */

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.resolve(__dirname, "../prisma/dev.db");
const db = new Database(DB_PATH);

// Enable FK constraints so cascades work
db.pragma("foreign_keys = ON");

// ── Employee IDs (verified against DB) ───────────────────────────────────────
const EMP = {
  Mariarussell:    5,
  NizamuddinK:     6,
  SangeethaM:      7,
  SangeethaJ:      8,
  SaravanakumarM:  9,
  AkshayahM:       10,
  Vijesh:          4,
};

// Q1 2026 deadline
const DEADLINE = "2026-06-30T00:00:00.000Z";

// ── KRA definitions ───────────────────────────────────────────────────────────
const KRAS = [

  // ── Mariarussell (BDE) ────────────────────────────────────────────────────
  {
    employeeId: EMP.Mariarussell,
    title: "Sales Revenue targets",
    description: "Q1 2026 revenue targets: booking, billing (ex-GST), gross profit margin, and on-time payment collections.",
    target: "total sales revenue - booking: 70; total sales revenue - billing: 63; average gross profit margin: 6.5; payment collections within due dates & credit days reduction: 0.9",
    weight: 50,
  },
  {
    employeeId: EMP.Mariarussell,
    title: "Customer & Business Development",
    description: "Customer retention rate and qualified lead generation.",
    target: "customer retention rate: 0.9; qualified leads generation: 20",
    weight: 10,
  },
  {
    employeeId: EMP.Mariarussell,
    title: "Sales management",
    description: "PoC closures, new customer / upsell deals, and active pipeline coverage.",
    target: "non-obligatory\" proof of concept (poc): 4; new customers or upsell closure: 8; pipeline: 2",
    weight: 20,
  },
  {
    employeeId: EMP.Mariarussell,
    title: "Focus area revenue achievement",
    description: "Closed Won revenue split across the four focus solution categories (proportions of booking target).",
    target: "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10",
    weight: 15,
  },
  {
    employeeId: EMP.Mariarussell,
    title: "Sales Operations Excellence",
    description: "Forecast accuracy (auto) and product certifications (manual).",
    target: "forecast accuracy: 0.9; certification and product training: 2",
    weight: 5,
  },

  // ── Nizamuddin K (BDM) ───────────────────────────────────────────────────
  {
    employeeId: EMP.NizamuddinK,
    title: "Sales Revenue targets",
    description: "Q1 2026 revenue targets: booking, billing (ex-GST), gross profit margin, and on-time payment collections.",
    target: "total sales revenue - booking: 120; total sales revenue - billing: 108; average gross profit margin: 10; payment collections within due dates & credit days reduction: 0.9",
    weight: 50,
  },
  {
    employeeId: EMP.NizamuddinK,
    title: "Customer & Business Development",
    description: "New customer acquisition and qualified lead generation.",
    target: "new customers: 8; qualified leads generation: 20",
    weight: 20,
  },
  {
    employeeId: EMP.NizamuddinK,
    title: "Sales management",
    description: "PoC closures and active pipeline coverage ratio.",
    target: "non-obligatory\" proof of concept (poc): 4; pipeline: 2",
    weight: 15,
  },
  {
    employeeId: EMP.NizamuddinK,
    title: "Focus area revenue achievement",
    description: "Closed Won revenue split across the four focus solution categories.",
    target: "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10",
    weight: 10,
  },
  {
    employeeId: EMP.NizamuddinK,
    title: "Sales Operations Excellence",
    description: "Forecast accuracy (auto) and product certifications (manual).",
    target: "forecast accuracy: 0.9; certification and product training: 2",
    weight: 5,
  },

  // ── Sangeetha M (Sales Coordinator) ──────────────────────────────────────
  {
    employeeId: EMP.SangeethaM,
    title: "Sales Revenue targets",
    description: "Q1 2026 revenue targets: booking, billing (ex-GST), gross profit margin, and on-time payment collections.",
    target: "total sales revenue - booking: 120; total sales revenue - billing: 108; average gross profit margin: 12; payment collections within due dates & credit days reduction: 0.9",
    weight: 50,
  },
  {
    employeeId: EMP.SangeethaM,
    title: "Customer & Business Development",
    description: "Customer retention rate and qualified lead generation.",
    target: "customer retention rate: 0.9; qualified leads generation: 20",
    weight: 10,
  },
  {
    employeeId: EMP.SangeethaM,
    title: "Sales management",
    description: "PoC closures, new customer / upsell deals, and active pipeline coverage.",
    target: "non-obligatory\" proof of concept (poc): 4; new customers or upsell closure: 8; pipeline: 2",
    weight: 20,
  },
  {
    employeeId: EMP.SangeethaM,
    title: "Focus area revenue achievement",
    description: "Closed Won revenue split across the four focus solution categories.",
    target: "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10",
    weight: 15,
  },
  {
    employeeId: EMP.SangeethaM,
    title: "Sales Operations Excellence",
    description: "Forecast accuracy (auto) and product certifications (manual).",
    target: "forecast accuracy: 0.9; certification and product training: 2",
    weight: 5,
  },

  // ── Sangeetha J (ISR) ─────────────────────────────────────────────────────
  {
    employeeId: EMP.SangeethaJ,
    title: "Sales Revenue targets",
    description: "Q1 2026 revenue targets: booking, billing (ex-GST), gross profit margin, and on-time payment collections.",
    target: "total sales revenue - booking: 75; total sales revenue - billing: 67.5; average gross profit margin: 8; payment collections within due dates & credit days reduction: 0.9",
    weight: 50,
  },
  {
    employeeId: EMP.SangeethaJ,
    title: "Customer & Business Development",
    description: "New customer acquisition and qualified lead generation.",
    target: "new customers: 5; qualified leads generation: 30",
    weight: 20,
  },
  {
    employeeId: EMP.SangeethaJ,
    title: "Sales management",
    description: "PoC closures and active pipeline coverage ratio.",
    target: "non-obligatory\" proof of concept (poc): 10; pipeline: 2",
    weight: 15,
  },
  {
    employeeId: EMP.SangeethaJ,
    title: "Focus area revenue achievement",
    description: "Closed Won revenue split across the four focus solution categories.",
    target: "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10",
    weight: 10,
  },
  {
    employeeId: EMP.SangeethaJ,
    title: "Sales Operations Excellence",
    description: "Forecast accuracy (auto) and product certifications (manual).",
    target: "forecast accuracy: 0.9; certification and product training: 2",
    weight: 5,
  },

  // ── Saravanakumar M (BDM) ─────────────────────────────────────────────────
  {
    employeeId: EMP.SaravanakumarM,
    title: "Sales Revenue targets",
    description: "Q1 2026 revenue targets: booking, billing (ex-GST), gross profit margin, and on-time payment collections.",
    target: "total sales revenue - booking: 150; total sales revenue - billing: 135; average gross profit margin: 15; payment collections within due dates & credit days reduction: 0.9",
    weight: 50,
  },
  {
    employeeId: EMP.SaravanakumarM,
    title: "Customer & Business Development",
    description: "New customer acquisition and qualified lead generation.",
    target: "new customers: 10; qualified leads generation: 20",
    weight: 20,
  },
  {
    employeeId: EMP.SaravanakumarM,
    title: "Sales management",
    description: "PoC closures and active pipeline coverage ratio.",
    target: "non-obligatory\" proof of concept (poc): 4; pipeline: 2",
    weight: 15,
  },
  {
    employeeId: EMP.SaravanakumarM,
    title: "Focus area revenue achievement",
    description: "Closed Won revenue split across the four focus solution categories.",
    target: "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10",
    weight: 10,
  },
  {
    employeeId: EMP.SaravanakumarM,
    title: "Sales Operations Excellence",
    description: "Forecast accuracy (auto) and product certifications (manual).",
    target: "forecast accuracy: 0.9; certification and product training: 2",
    weight: 5,
  },

  // ── Akshayah M (ISR - Inside Sales) ──────────────────────────────────────
  {
    employeeId: EMP.AkshayahM,
    title: "Lead Generation Activity",
    description: "Total outbound calls and meaningful connects achieved.",
    target: "total outbound calls made: 180; meaningful connects achieved: 50",
    weight: 30,
  },
  {
    employeeId: EMP.AkshayahM,
    title: "Pipeline Building",
    description: "Qualified leads generated and appointments fixed for BDM / sales closure team.",
    target: "qualified leads generated: 25; appointments fixed for bdm / sales closure team: 25",
    weight: 25,
  },
  {
    employeeId: EMP.AkshayahM,
    title: "Funnel Creation",
    description: "Total funnel / pipeline value and number of opportunities created.",
    target: "total funnel / pipeline value created (₹ lakhs): 75; number of funnel opportunities created: 10",
    weight: 20,
  },
  {
    employeeId: EMP.AkshayahM,
    title: "Marketing Activities",
    description: "Customer webinars organised and blitz days conducted (manual entry).",
    target: "customer webinars organised: 2; blitz days conducted: 3",
    weight: 15,
  },
  {
    employeeId: EMP.AkshayahM,
    title: "Sales Operations Excellence",
    description: "CRM data accuracy and timely lead updates (auto) + certifications (manual).",
    target: "crm data accuracy & timely lead updates: 0.9; certification and product training: 2",
    weight: 10,
  },

  // ── Vijesh (Head of Sales) ─────────────────────────────────────────────────
  {
    employeeId: EMP.Vijesh,
    title: "Revenue & Profitability",
    description: "Team-wide booking, billing (ex-GST), average GP margin, and collections efficiency.",
    target: "total team booking target achievement (₹ lakhs): 500; total team billing achievement: 450; gross profit margin (%): 12; collections efficiency (% within due dates): 0.9",
    weight: 40,
  },
  {
    employeeId: EMP.Vijesh,
    title: "Market Growth & Business Development",
    description: "New strategic logos, new projects in pipeline, and focus area revenue mix achievement.",
    target: "new logos / strategic accounts acquired by team: 10; new projects & strategic deals initiated: 15; focus area revenue mix achievement (n&s, s&s, mssp, cloud): 0.85",
    weight: 25,
  },
  {
    employeeId: EMP.Vijesh,
    title: "Team Leadership & Talent Development",
    description: "Team aggregate KRA achievement rate (auto) + talent retention and training completion (manual).",
    target: "team aggregate kra achievement rate: 0.9; sales talent retention (attrition below threshold): 0.9; team training & certification completion rate: 0.9",
    weight: 20,
  },
  {
    employeeId: EMP.Vijesh,
    title: "Pipeline Health & Strategic Execution",
    description: "Total team pipeline coverage, forecast accuracy, and average deal win rate.",
    target: "total team pipeline coverage (₹ lakhs): 1500; forecast accuracy: 0.9; average deal win rate: 0.3",
    weight: 15,
  },
];

// ── Employee IDs to clear ─────────────────────────────────────────────────────
const EMP_IDS = Object.values(EMP);

// ── Run ───────────────────────────────────────────────────────────────────────

const clearKras = db.transaction(() => {
  // Delete child records first (SQLite FK cascades require PRAGMA foreign_keys = ON)
  const kraIds = db
    .prepare(`SELECT id FROM KRA WHERE employeeId IN (${EMP_IDS.map(() => "?").join(",")})`)
    .all(...EMP_IDS)
    .map((r) => r.id);

  if (kraIds.length) {
    const placeholders = kraIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM WeeklyCommit WHERE kraId IN (${placeholders})`).run(...kraIds);
    db.prepare(`DELETE FROM WeeklyReview WHERE kraId IN (${placeholders})`).run(...kraIds);
    db.prepare(`DELETE FROM KRA WHERE id IN (${placeholders})`).run(...kraIds);
    console.log(`Deleted ${kraIds.length} old KRAs (and their reviews/commits).`);
  } else {
    console.log("No existing KRAs to delete.");
  }
});

const insertKras = db.transaction(() => {
  const stmt = db.prepare(`
    INSERT INTO KRA (title, description, target, deadline, weight, status, employeeId, createdAt)
    VALUES (@title, @description, @target, @deadline, @weight, 'active', @employeeId, datetime('now'))
  `);
  for (const kra of KRAS) {
    stmt.run({ ...kra, deadline: DEADLINE });
  }
  console.log(`Inserted ${KRAS.length} new KRAs.`);
});

try {
  clearKras();
  insertKras();
  console.log("\nDone! KRAs reloaded from KRA.xlsx (Q1 2026).");

  // Verify
  const counts = db.prepare(`
    SELECT e.name, COUNT(k.id) as kra_count
    FROM Employee e
    LEFT JOIN KRA k ON k.employeeId = e.id AND k.status = 'active'
    WHERE e.id IN (${EMP_IDS.map(() => "?").join(",")})
    GROUP BY e.id, e.name
    ORDER BY e.name
  `).all(...EMP_IDS);

  console.log("\nVerification:");
  counts.forEach((r) => console.log(`  ${r.name}: ${r.kra_count} KRAs`));
} finally {
  db.close();
}
