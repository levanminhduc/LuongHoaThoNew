const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const BLOCKED_USERNAME = "admin";

const USAGE = [
  "Cách dùng:",
  "  ADMIN_PASSWORD='<mật khẩu>' node scripts/create-admin-user.js --username <tên đăng nhập>",
  "",
  `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự, truyền qua biến môi trường ADMIN_PASSWORD.`,
  `Tên đăng nhập "${BLOCKED_USERNAME}" bị chặn.`,
].join("\n");

function failWithUsage(reason) {
  console.error(`Lỗi: ${reason}`);
  console.error(USAGE);
  process.exit(1);
}

function readUsernameArgument() {
  const flagIndex = process.argv.indexOf("--username");
  if (flagIndex === -1) return "";
  return (process.argv[flagIndex + 1] || "").trim();
}

function readValidatedCredentials() {
  const username = readUsernameArgument();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!username) failWithUsage("thiếu tham số --username");
  if (!password) failWithUsage("thiếu biến môi trường ADMIN_PASSWORD");
  if (username.toLowerCase() === BLOCKED_USERNAME) {
    failWithUsage(`tên đăng nhập "${BLOCKED_USERNAME}" bị chặn`);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    failWithUsage(`mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`);
  }

  return { username, password };
}

function loadEnvFile() {
  const fs = require("fs");
  const path = require("path");

  try {
    const envPath = path.join(__dirname, "..", ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    const envVars = {};

    envContent.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").trim();
      }
    });

    return envVars;
  } catch (error) {
    console.error("Lỗi đọc file .env:", error.message);
    return {};
  }
}

function createSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Thiếu biến môi trường Supabase");
    console.error(
      "Cần có: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function createAdminUser({ username, password }) {
  const bcrypt = require("bcryptjs");
  const supabase = createSupabaseClient();

  try {
    const { error: tableError } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "Không truy cập được bảng admin_users, hãy tạo bảng bằng scripts/create-tables.sql:",
        tableError.message,
      );
      return false;
    }

    const { data: existingUser } = await supabase
      .from("admin_users")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      console.log(`Tài khoản admin '${username}' đã tồn tại`);
      return true;
    }

    const role = "admin";
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { error } = await supabase
      .from("admin_users")
      .insert({ username, password_hash, role, is_active: true });

    if (error) {
      console.error("Lỗi tạo tài khoản admin:", error.message);
      return false;
    }

    console.log("Tạo tài khoản admin thành công");
    console.log(`   Tên đăng nhập: ${username}`);
    console.log(`   Vai trò: ${role}`);
    return true;
  } catch (error) {
    console.error("Lỗi không mong muốn:", error.message);
    return false;
  }
}

const credentials = readValidatedCredentials();

createAdminUser(credentials).then((success) => {
  if (!success) process.exit(1);
});
