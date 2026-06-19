const BASE = 'http://localhost:3000';

async function fix(id, name, role) {
  const res = await fetch(`${BASE}/api/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email: name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@caveoinfosystems.com',
      department: 'Sales',
      role,
    }),
  });
  const j = await res.json();
  console.log(`✅ ${j.name} → ${j.role}`);
}

(async () => {
  await fix(9, 'Saravanakumar M', 'Business Development Manager');
  await fix(10, 'Akshayah M', 'Inside Sales');
})();
