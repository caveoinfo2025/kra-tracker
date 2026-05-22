/**
 * Seed script — imports employees and KRAs from the Caveo Sales XLSX.
 * Run: node seed.js
 * Requires dev server at http://localhost:3000
 */
const XLSX = require('xlsx');

const BASE = 'http://localhost:3000';

// ── 1. Read spreadsheet ────────────────────────────────────────────────────
const wb = XLSX.readFile('C:/Users/VIJESHVIJAYAN/Caveo_Sales/Caveo_sales_kra_sharepoint_master_q1_2026_27.xlsx');

// Lists sheet → employees + roles
const listRows = XLSX.utils.sheet_to_json(wb.Sheets['Lists'], { defval: '' });
const employeeMeta = {};
listRows.forEach(r => {
  if (r['Employees']) employeeMeta[r['Employees']] = r['Roles'];
});
// Vijesh not in Lists rows — add manually
employeeMeta['Vijesh'] = 'Head of Sales';

// KRA_Targets sheet → KRA definitions
const kraRows = XLSX.utils.sheet_to_json(wb.Sheets['KRA_Targets'], { defval: '' });

// ── 2. Build employee + KRA map ────────────────────────────────────────────
// Group KPIs under their parent KRA name per employee
const empKRAMap = {}; // { empName: { kraTitle: { weight, kpis: [{kpi, kpiWeight, target}] } } }
let currentKRA = {};

kraRows.forEach(row => {
  const emp  = row['Employee'];
  const kra  = row['KRA'];
  const kpi  = row['KPI'];
  const kpiW = row['KPI Weight'];
  const tgt  = row['Target'];
  const kraW = row['KRA Weight'];

  if (!emp || !kpi) return;

  if (!empKRAMap[emp]) empKRAMap[emp] = {};

  // KRA name carries forward until a new non-empty one appears
  if (kra) currentKRA[emp] = kra;
  const kraTitle = currentKRA[emp] || 'General';

  if (!empKRAMap[emp][kraTitle]) {
    empKRAMap[emp][kraTitle] = { weight: 0, kpis: [] };
  }
  // Store first non-empty KRA weight
  if (kraW !== '' && kraW !== 0 && empKRAMap[emp][kraTitle].weight === 0) {
    empKRAMap[emp][kraTitle].weight = Math.round(kraW * 100);
  }
  empKRAMap[emp][kraTitle].kpis.push({ kpi, kpiWeight: kpiW, target: tgt });
});

// ── 3. Email helper ────────────────────────────────────────────────────────
function toEmail(name) {
  return name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@caveoinfosystems.com';
}

// ── 4. API helpers ─────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

// ── 5. Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('── Fetching existing employees ──');
  const existing = await api('GET', '/api/employees');
  const existingNames = new Set(existing.map(e => e.name));

  // Delete demo/test employees not in the real list
  const realNames = new Set(Object.keys(empKRAMap));
  for (const emp of existing) {
    if (!realNames.has(emp.name)) {
      console.log(`  🗑  Removing test employee: ${emp.name}`);
      await api('DELETE', `/api/employees/${emp.id}`);
    }
  }

  // Re-fetch after deletions
  const after = await api('GET', '/api/employees');
  const nameToId = {};
  after.forEach(e => { nameToId[e.name] = e.id; });

  console.log('\n── Creating / verifying employees ──');
  const empOrder = ['Vijesh', 'Mariarussell', 'Nizamuddin K', 'Sangeetha M', 'Sangeetha J', 'Saravanakumar M', 'Akshayah M'];

  for (const name of empOrder) {
    if (nameToId[name]) {
      console.log(`  ✓ Already exists: ${name} (id=${nameToId[name]})`);
    } else {
      const role = employeeMeta[name] || 'Sales';
      const emp = await api('POST', '/api/employees', {
        name,
        email: toEmail(name),
        department: 'Sales',
        role,
      });
      nameToId[name] = emp.id;
      console.log(`  ✅ Created: ${name} (id=${emp.id}) — ${role}`);
    }
  }

  console.log('\n── Creating KRAs ──');
  const deadline = '2026-06-30';

  for (const empName of empOrder) {
    const empId = nameToId[empName];
    const kras  = empKRAMap[empName];
    if (!kras) continue;

    // Fetch existing KRAs for this employee to avoid duplicates
    const existingKRAs = await api('GET', `/api/employees/${empId}/kras`);
    const existingKRATitles = new Set(existingKRAs.map(k => k.title));

    for (const [kraTitle, kraData] of Object.entries(kras)) {
      if (existingKRATitles.has(kraTitle)) {
        console.log(`  ✓ ${empName} / ${kraTitle} — already exists`);
        continue;
      }

      // Build description and target string from KPIs
      const description = kraData.kpis.map(k => `${k.kpi} (weight: ${Math.round(k.kpiWeight * 100)}%)`).join(' | ');
      const primaryKPI  = kraData.kpis[0];
      const targetStr   = kraData.kpis
        .map(k => `${k.kpi}: ${k.target}`)
        .join('; ');

      const kra = await api('POST', `/api/employees/${empId}/kras`, {
        title: kraTitle,
        description,
        target: targetStr,
        deadline,
        weight: kraData.weight || 20,
      });
      console.log(`  ✅ ${empName} / ${kraTitle} (weight=${kra.weight}%) — id=${kra.id}`);
    }
  }

  console.log('\n── Done ──');
  console.log(`Employees: ${empOrder.length}  |  Visit http://localhost:3000`);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
