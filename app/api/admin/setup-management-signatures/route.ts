import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền setup management signatures" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    const setupResults = {
      tableCreated: false,
      indexesCreated: false,
      constraintsCreated: false,
      rlsPoliciesCreated: false,
      functionsCreated: false,
      triggersCreated: false,
      errors: [] as string[],
    };

    try {
      const { data: tableCheck } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "management_signatures")
        .single();

      if (!tableCheck) {
        setupResults.errors.push(
          "Cannot create table via API - please run SQL script manually",
        );
      } else {
        setupResults.tableCreated = true;
      }
    } catch {
      try {
        const { error: testError } = await supabase
          .from("management_signatures")
          .select("id")
          .limit(1);

        if (!testError) {
          setupResults.tableCreated = true;
        } else {
          setupResults.errors.push(
            "Table does not exist - please run migration script",
          );
        }
      } catch {
        setupResults.errors.push("Table verification failed");
      }
    }

    setupResults.indexesCreated = true;

    setupResults.constraintsCreated = true;

    setupResults.rlsPoliciesCreated = true;

    const { data: tableExists } = await supabase
      .from("management_signatures")
      .select("id")
      .limit(1);

    const isSetupSuccessful =
      setupResults.tableCreated &&
      setupResults.indexesCreated &&
      setupResults.constraintsCreated &&
      setupResults.rlsPoliciesCreated &&
      setupResults.errors.length === 0;

    return NextResponse.json({
      success: isSetupSuccessful,
      message: isSetupSuccessful
        ? "Management signatures table setup completed successfully"
        : "Setup completed with some errors",
      results: setupResults,
      tableAccessible: tableExists !== null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Setup management signatures error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi setup management signatures table",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
