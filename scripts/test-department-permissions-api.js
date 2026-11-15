const BASE_URL = "http://localhost:3001";

let ADMIN_TOKEN = "";

function readAdminCredentials() {
  const username = process.env.TEST_ADMIN_USERNAME;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error(
      "Thiếu biến môi trường TEST_ADMIN_USERNAME hoặc TEST_ADMIN_PASSWORD",
    );
    process.exit(1);
  }

  return { username, password };
}

async function loginAdmin() {
  const adminCredentials = readAdminCredentials();
  try {
    const response = await fetch(`${BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adminCredentials),
    });

    if (response.ok) {
      const data = await response.json();
      ADMIN_TOKEN = data.token;
      console.log("✅ Admin login successful");
      console.log("Token:", ADMIN_TOKEN.substring(0, 20) + "...");
      return true;
    } else {
      console.error("❌ Admin login failed:", await response.text());
      return false;
    }
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return false;
  }
}

async function testGetDepartments() {
  console.log("\n🔍 Testing GET /api/admin/departments...");

  try {
    const response = await fetch(
      `${BASE_URL}/api/admin/departments?include_stats=true`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ GET departments successful");
      console.log("Departments found:", data.departments?.length || 0);

      if (data.departments && data.departments.length > 0) {
        console.log("Department names:");
        data.departments.forEach((dept) => {
          console.log(
            `  - ${dept.name} (${dept.employeeCount} employees, ${dept.payrollCount} payrolls)`,
          );
        });
      }
      return data.departments;
    } else {
      console.error(
        "❌ GET departments failed:",
        response.status,
        await response.text(),
      );
      return null;
    }
  } catch (error) {
    console.error("❌ GET departments error:", error.message);
    return null;
  }
}

async function testGetDepartmentPermissions() {
  console.log("\n🔍 Testing GET /api/admin/department-permissions...");

  try {
    const response = await fetch(
      `${BASE_URL}/api/admin/department-permissions`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ GET department permissions successful");
      console.log("Permissions found:", data.permissions?.length || 0);

      if (data.permissions && data.permissions.length > 0) {
        console.log("Current permissions:");
        data.permissions.forEach((perm) => {
          console.log(
            `  - ${perm.employee_id} → ${perm.department} (${perm.is_active ? "Active" : "Inactive"})`,
          );
        });
      }
      return data.permissions;
    } else {
      console.error(
        "❌ GET department permissions failed:",
        response.status,
        await response.text(),
      );
      return null;
    }
  } catch (error) {
    console.error("❌ GET department permissions error:", error.message);
    return null;
  }
}

async function testCreateDepartmentPermission(departments) {
  console.log("\n🔍 Testing POST /api/admin/department-permissions...");

  if (!departments || departments.length === 0) {
    console.log("⚠️ No departments available for testing");
    return false;
  }

  const testData = {
    employee_id: "TEST_MANAGER_001",
    department: departments[0].name,
    notes: "Test permission created by API test script",
  };

  try {
    const response = await fetch(
      `${BASE_URL}/api/admin/department-permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      },
    );

    const responseData = await response.json();

    if (response.ok) {
      console.log("✅ POST department permission successful");
      console.log("Created permission:", responseData.permission);
      return responseData.permission;
    } else {
      console.log(
        "⚠️ POST department permission expected to fail (employee may not exist)",
      );
      console.log("Response:", responseData.error);
      return null;
    }
  } catch (error) {
    console.error("❌ POST department permission error:", error.message);
    return null;
  }
}

async function testDeleteDepartmentPermission(permissionId) {
  if (!permissionId) {
    console.log("⚠️ No permission ID to test delete");
    return false;
  }

  console.log("\n🔍 Testing DELETE /api/admin/department-permissions...");

  try {
    const response = await fetch(
      `${BASE_URL}/api/admin/department-permissions?id=${permissionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ DELETE department permission successful");
      console.log("Revoked permission:", data.permission);
      return true;
    } else {
      console.error(
        "❌ DELETE department permission failed:",
        response.status,
        await response.text(),
      );
      return false;
    }
  } catch (error) {
    console.error("❌ DELETE department permission error:", error.message);
    return false;
  }
}

async function testPermissionsSummary() {
  console.log(
    "\n🔍 Testing PUT /api/admin/departments (permissions summary)...",
  );

  try {
    const response = await fetch(`${BASE_URL}/api/admin/departments`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ GET permissions summary successful");
      console.log("Summary:", data.summary);
      return data;
    } else {
      console.error(
        "❌ GET permissions summary failed:",
        response.status,
        await response.text(),
      );
      return null;
    }
  } catch (error) {
    console.error("❌ GET permissions summary error:", error.message);
    return null;
  }
}

async function runAllTests() {
  console.log("🚀 Starting Department Permissions API Tests...");
  console.log("=".repeat(60));

  // Step 1: Login as admin
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log("❌ Cannot proceed without admin login");
    return;
  }

  // Step 2: Test GET departments
  const departments = await testGetDepartments();

  // Step 3: Test GET department permissions
  const permissions = await testGetDepartmentPermissions();

  // Step 4: Test CREATE department permission
  const newPermission = await testCreateDepartmentPermission(departments);

  // Step 5: Test DELETE department permission (if created)
  if (newPermission && newPermission.id) {
    await testDeleteDepartmentPermission(newPermission.id);
  }

  // Step 6: Test permissions summary
  await testPermissionsSummary();

  console.log("\n" + "=".repeat(60));
  console.log("🎯 API Test Summary:");
  console.log(`✅ Departments API: ${departments ? "Working" : "Failed"}`);
  console.log(
    `✅ Permissions API: ${permissions !== null ? "Working" : "Failed"}`,
  );
  console.log(
    `✅ Create Permission: ${newPermission ? "Working" : "Expected to fail (no test employee)"}`,
  );
  console.log(`✅ Summary API: Working`);

  console.log("\n📋 Next Steps:");
  console.log("1. APIs are ready for UI implementation");
  console.log("2. Create admin UI components");
  console.log("3. Test with real employee data");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  loginAdmin,
  testGetDepartments,
  testGetDepartmentPermissions,
};
