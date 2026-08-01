import { ImageResponse } from "next/og";

export const alt = "Tra Cứu Lương Hoà Thọ Điện Bàn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
        color: "#111827",
        fontSize: 64,
        fontWeight: 700,
        textAlign: "center",
        padding: "0 80px",
      }}
    >
      <div style={{ display: "flex" }}>Tra Cứu Lương và Ký Xác Nhận</div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 36,
          fontWeight: 500,
          color: "#4b5563",
          letterSpacing: 2,
        }}
      >
        MAY HÒA THỌ ĐIỆN BÀN
      </div>
    </div>,
    size,
  );
}
