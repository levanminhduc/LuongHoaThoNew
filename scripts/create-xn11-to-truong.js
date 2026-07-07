// Insert one to_truong employee for department XN11
// Mirrors logic of POST /api/admin/employees (lib + utils)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const BCRYPT_ROUNDS = 12;

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
  const full_name = 'NGUYỄN THỊ ĐÀO';
  const cccd = '049189012279';
  const chuc_vu = 'to_truong';
  const department = 'XN11';

  // 1) Check duplicate
  const dupRes = await fetch(
    `${url}/rest/v1/employees?select=employee_id&employee_id=eq.${encodeURIComponent(employee_id)}`,
    { headers }
  );
  const dup = await dupRes.json();
  if (Array.isArray(dup) && dup.length > 0) {
    console.error('❌ Mã nhân viên đã tồn tại:', employee_id);
    process.exit(1);
  }

  // 2) Hash CCCD (default password = CCCD)
  const cccd_hash = await bcrypt.hash(cccd, BCRYPT_ROUNDS);
  const password_hash = cccd_hash;

  // 3) Insert
  const insertRes = await fetch(`${url}/rest/v1/employees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      employee_id,
      full_name,
      cccd_hash,
      password_hash,
      last_password_change_at: getVietnamTimestamp(),
      chuc_vu,
      department,
      phone_number: null,
      is_active: true,
    }),
  });

  const text = await insertRes.text();
  if (!insertRes.ok) {
    console.error('❌ Insert failed:', insertRes.status, text);
    process.exit(1);
  }
  const created = JSON.parse(text);
  console.log('✅ Created employee:');
  console.log(JSON.stringify(created, null, 2));

  // 4) Verify XN11 now visible
  const checkRes = await fetch(
    `${url}/rest/v1/employees?select=employee_id,full_name,department,chuc_vu,is_active&department=eq.XN11`,
    { headers }
  );
  const list = await checkRes.json();
  console.log('\n✅ employees in XN11 (count =', list.length, '):');
  console.log(JSON.stringify(list, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
