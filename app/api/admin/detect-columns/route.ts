import { type NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: "Invalid file type. Only Excel files are allowed." },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    try {
      // Read Excel file
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return NextResponse.json(
          { error: "No sheets found in Excel file" },
          { status: 400 },
        );
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON to get headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      if (jsonData.length === 0) {
        return NextResponse.json(
          { error: "Excel file is empty" },
          { status: 400 },
        );
      }

      // Get headers from first row
      const headers = jsonData[0];
      if (!headers || headers.length === 0) {
        return NextResponse.json(
          { error: "No headers found in Excel file" },
          { status: 400 },
        );
      }

      // Clean and validate headers
      const detectedColumns = headers
        .map((header: any) => String(header || "").trim())
        .filter((header: string) => header.length > 0)
        .map((header: string, index: number) => ({
          name: header,
          index: index,
          sample_data: getSampleData(jsonData, index),
        }));

      if (detectedColumns.length === 0) {
        return NextResponse.json(
          { error: "No valid columns detected" },
          { status: 400 },
        );
      }

      // Get basic file info
      const fileInfo = {
        name: file.name,
        size: file.size,
        sheet_name: sheetName,
        total_sheets: workbook.SheetNames.length,
        total_rows: jsonData.length,
        total_columns: detectedColumns.length,
      };

      return NextResponse.json({
        success: true,
        file_info: fileInfo,
        detected_columns: detectedColumns,
        column_names: detectedColumns.map((col) => col.name),
      });
    } catch (parseError) {
      console.error("Excel parsing error:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse Excel file",
          details:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Detect columns error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function getSampleData(jsonData: any[][], columnIndex: number): string[] {
  const samples: string[] = [];
  const maxSamples = 3;

  // Skip header row and get sample data
  for (let i = 1; i < Math.min(jsonData.length, maxSamples + 1); i++) {
    const row = jsonData[i];
    if (row && row[columnIndex] !== undefined && row[columnIndex] !== null) {
      const value = String(row[columnIndex]).trim();
      if (value.length > 0) {
        samples.push(value);
      }
    }
  }

  return samples;
}
