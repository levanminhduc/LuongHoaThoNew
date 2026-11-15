const BASE_URL = "http://localhost:3001";

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

async function testDataValidationAPI() {
  const ADMIN_CREDENTIALS = readAdminCredentials();
  console.log("🧪 Testing Data Validation API...\n");

  try {
    // Step 1: Login to get admin token
    console.log("1️⃣ Logging in as admin...");
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ADMIN_CREDENTIALS),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    if (!token) {
      throw new Error("No token received from login");
    }

    console.log("✅ Login successful");
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Step 2: Test data validation API with current month
    console.log("\n2️⃣ Testing data validation for current month...");
    const currentMonth = getCurrentMonth();

    const validationResponse = await fetch(
      `${BASE_URL}/api/admin/data-validation?month=${currentMonth}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!validationResponse.ok) {
      throw new Error(`Validation API failed: ${validationResponse.status}`);
    }

    const validationData = await validationResponse.json();
    console.log("✅ Data validation API successful");
    console.log("📊 Results:");
    console.log(`   Month: ${validationData.selectedMonth}`);
    console.log(`   Total Employees: ${validationData.stats.totalEmployees}`);
    console.log(
      `   With Payroll: ${validationData.stats.employeesWithPayroll}`,
    );
    console.log(`   Missing: ${validationData.stats.missingEmployees}`);
    console.log(`   Completion Rate: ${validationData.stats.percentage}%`);

    if (validationData.missingEmployees.length > 0) {
      console.log("\n⚠️  Missing employees:");
      validationData.missingEmployees.slice(0, 5).forEach((emp) => {
        console.log(
          `   - ${emp.employee_id}: ${emp.full_name} (${emp.department})`,
        );
      });
      if (validationData.missingEmployees.length > 5) {
        console.log(
          `   ... and ${validationData.missingEmployees.length - 5} more`,
        );
      }
    } else {
      console.log("\n🎉 All employees have payroll data!");
    }

    // Step 3: Test with force refresh
    console.log("\n3️⃣ Testing force refresh...");
    const refreshResponse = await fetch(
      `${BASE_URL}/api/admin/data-validation?month=${currentMonth}&force_refresh=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!refreshResponse.ok) {
      throw new Error(`Force refresh failed: ${refreshResponse.status}`);
    }

    const refreshData = await refreshResponse.json();
    console.log("✅ Force refresh successful");
    console.log(
      `   Cache timestamp: ${refreshData.cacheTimestamp || "Not cached"}`,
    );

    // Step 4: Test with invalid month format
    console.log("\n4️⃣ Testing invalid month format...");
    const invalidResponse = await fetch(
      `${BASE_URL}/api/admin/data-validation?month=invalid-month`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (invalidResponse.status === 400) {
      console.log("✅ Invalid month format correctly rejected");
    } else {
      console.log("⚠️  Invalid month format should return 400 status");
    }

    // Step 5: Test cache clear (DELETE)
    console.log("\n5️⃣ Testing cache clear...");
    const clearResponse = await fetch(
      `${BASE_URL}/api/admin/data-validation?month=${currentMonth}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (clearResponse.ok) {
      const clearData = await clearResponse.json();
      console.log("✅ Cache clear successful");
      console.log(`   Message: ${clearData.message}`);
    } else {
      console.log("⚠️  Cache clear failed");
    }

    // Step 6: Test unauthorized access
    console.log("\n6️⃣ Testing unauthorized access...");
    const unauthorizedResponse = await fetch(
      `${BASE_URL}/api/admin/data-validation?month=${currentMonth}`,
      {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      },
    );

    if (unauthorizedResponse.status === 401) {
      console.log("✅ Unauthorized access correctly rejected");
    } else {
      console.log("⚠️  Unauthorized access should return 401 status");
    }

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Run the test
if (require.main === module) {
  testDataValidationAPI();
}

module.exports = { testDataValidationAPI };
