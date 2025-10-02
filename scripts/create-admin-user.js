/**
 * Script to create admin user in admin_users table
 * Usage: node scripts/create-admin-user.js
 */

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

// Load environment variables from .env file manually
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
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
    console.error("❌ Error loading .env file:", error.message);
    return {};
  }
}

const env = loadEnvFile();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log("🚀 Creating admin user...");

    // Admin credentials (not 'admin' due to security block)
    const adminCredentials = {
      username: "superadmin",
      password: "admin123",
      role: "admin",
    };

    // Hash password
    const password_hash = await bcrypt.hash(adminCredentials.password, 10);

    // Check if admin_users table exists
    const { data: tables, error: tableError } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1);

    if (tableError && tableError.code === "42P01") {
      console.log("📋 Creating admin_users table...");

      // Create admin_users table
      const { error: createTableError } = await supabase.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin',
            is_active BOOLEAN DEFAULT true,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
      });

      if (createTableError) {
        console.error("❌ Error creating admin_users table:", createTableError);
        return false;
      }
      console.log("✅ admin_users table created");
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("admin_users")
      .select("username")
      .eq("username", adminCredentials.username)
      .single();

    if (existingUser) {
      console.log(
        `⚠️  Admin user '${adminCredentials.username}' already exists`,
      );
      return true;
    }

    // Insert new admin user
    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        username: adminCredentials.username,
        password_hash,
        role: adminCredentials.role,
        is_active: true,
      })
      .select();

    if (error) {
      console.error("❌ Error creating admin user:", error);
      return false;
    }

    console.log("✅ Admin user created successfully!");
    console.log("📋 Admin credentials:");
    console.log(`   Username: ${adminCredentials.username}`);
    console.log(`   Password: ${adminCredentials.password}`);
    console.log(`   Role: ${adminCredentials.role}`);
    console.log("");
    console.log(
      "🔐 You can now login with these credentials to access admin features",
    );

    return true;
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return false;
  }
}

// Run the script
createAdminUser()
  .then((success) => {
    if (success) {
      console.log("🎉 Admin user setup completed!");
    } else {
      console.log("❌ Admin user setup failed!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Script error:", error);
    process.exit(1);
  });
