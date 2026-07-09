const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const env = fs.readFileSync(envPath, "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function main() {
  const r = await fetch(
    `${url}/rest/v1/employees?select=employee_id,full_name,department,chuc_vu,phone_number,is_active,created_at,updated_at&employee_id=eq.DB00694`,
    { headers },
  );
  const data = await r.json();
  console.log(JSON.stringify(data, null, 2));
}
main();
