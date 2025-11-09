# Hướng Dẫn Chạy Ứng Dụng Với Docker

## Yêu Cầu

- Docker Desktop đã được cài đặt và đang chạy
- File `.env` với các biến môi trường cần thiết

## Bước 1: Chuẩn Bị File Environment

Tạo file `.env` trong thư mục gốc của dự án với nội dung sau:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Node Environment
NODE_ENV=production
```

**Lưu ý:** Thay thế các giá trị `your_*` bằng thông tin thực tế từ Supabase project của bạn.

## Bước 2: Build Docker Image

Mở terminal/PowerShell tại thư mục dự án và chạy:

```bash
docker build -t luong-hoatho-app .
```

Quá trình build sẽ mất khoảng 2-3 phút.

## Bước 3: Chạy Container Với Docker Compose

```bash
docker compose up
```

Hoặc chạy ở chế độ background:

```bash
docker compose up -d
```

## Bước 4: Truy Cập Ứng Dụng

Mở trình duyệt và truy cập:

```
http://localhost:3000
```

## Các Lệnh Hữu Ích

### Xem logs của container

```bash
docker compose logs -f
```

### Dừng container

```bash
docker compose down
```

### Rebuild và restart

```bash
docker compose up --build
```

### Xóa container và volumes

```bash
docker compose down -v
```

### Kiểm tra container đang chạy

```bash
docker ps
```

## Troubleshooting

### Lỗi: "Your project's URL and Key are required"

- Kiểm tra file `.env` đã được tạo và có đầy đủ thông tin
- Đảm bảo các biến môi trường không có khoảng trắng thừa
- Restart Docker Desktop và thử lại

### Lỗi: Port 3000 đã được sử dụng

Thay đổi port trong file `compose.yml`:

```yaml
ports:
  - "3001:3000" # Thay 3001 bằng port khác
```

### Container không start

Kiểm tra logs:

```bash
docker compose logs
```

## Cấu Trúc Files

```
.
├── Dockerfile          # Định nghĩa cách build image
├── compose.yml         # Cấu hình Docker Compose
├── .dockerignore       # Files/folders bỏ qua khi build
├── .env               # Biến môi trường (không commit)
├── .env.example       # Template cho .env
└── Docker.md          # File hướng dẫn này
```

## Lưu Ý Bảo Mật

- **KHÔNG** commit file `.env` lên Git
- File `.env` đã được thêm vào `.gitignore`
- Sử dụng JWT_SECRET mạnh và ngẫu nhiên cho production
- Không chia sẻ SUPABASE_SERVICE_ROLE_KEY với người khác
