// Script để tạo favicon đơn giản
// Chạy trong browser console hoặc Node.js

function createSimpleFavicon() {
  // Tạo canvas 32x32
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  // Background xanh dương
  ctx.fillStyle = "#1e40af";
  ctx.fillRect(0, 0, 32, 32);

  // Chữ "HT" màu trắng
  ctx.fillStyle = "white";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HT", 16, 16);

  // Convert to data URL
  return canvas.toDataURL("image/png");
}

// Sử dụng:
// 1. Mở browser console
// 2. Paste code này
// 3. Chạy: createSimpleFavicon()
// 4. Copy data URL và convert thành file .ico
