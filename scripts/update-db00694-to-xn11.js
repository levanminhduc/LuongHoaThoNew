// Update DB00694: department -> XN11, chuc_vu -> to_truong
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function getVietnamTimestamp() {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString();
}

async function main() {
  const employee_id = 'DB00694';

  console.log('=== BEFORE ===');
  const beforeRes = await fetch(
    `${url}/rest/v1/employees?select=employee_id,full_name,department,chuc_vu,is_active&employee_id=eq.${employee_id}`,
    { headers }
  );
  console.log(JSON.stringify(await beforeRes.json(), null, 2));

  const updateRes = await fetch(
    `${url}/rest/v1/employees?employee_id=eq.${employee_id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        department: 'XN11',
        chuc_vu: 'to_truong',
        updated_at: getVietnamTimestamp(),
      }),
    }
  );
  const text = await updateRes.text();
  if (!updateRes.ok) {
    console.error('❌ Update failed:', updateRes.status, text);
    process.exit(1);
  }

  console.log('\n=== AFTER ===');
  console.log(JSON.parse(text));

  const xn11Res = await fetch(
    `${url}/rest/v1/employees?select=employee_id,full_name,department,chuc_vu&department=eq.XN11`,
    { headers }
  );
  const list = await xn11Res.json();
  console.log('\n=== employees in XN11 (count =', list.length, ') ===');
  console.log(JSON.stringify(list, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
