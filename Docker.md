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

## Bước 2: Đồng Bộ package-lock.json

Trước khi build Docker image, đảm bảo `package-lock.json` đồng bộ với `package.json`:

```bash
npm install
```

## Bước 3: Build Docker Image

Mở terminal/PowerShell tại thư mục dự án và chạy:

```bash
docker build -t luong-hoatho-app .
```

Quá trình build sẽ mất khoảng 1-2 phút. Image có kích thước khoảng **313MB**.

## Bước 4: Chạy Container Với Docker Compose

```bash
docker compose up
```

Hoặc chạy ở chế độ background:

```bash
docker compose up -d
```

## Bước 5: Truy Cập Ứng Dụng

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

### Kiểm tra kích thước image

```bash
docker images luong-hoatho-app
```

## Troubleshooting

### Lỗi: "npm ci can only install packages when your package.json and package-lock.json are in sync"

Chạy lệnh sau để đồng bộ lock file:

```bash
npm install
```

Sau đó build lại Docker image.

### Lỗi: "NEXT_PUBLIC_SUPABASE_URL is not set"

Đảm bảo file `.env` tồn tại và chứa các biến môi trường cần thiết. Entrypoint script sẽ kiểm tra và báo lỗi nếu thiếu biến.

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
├── Dockerfile              # Định nghĩa cách build image (multi-stage build)
├── docker-entrypoint.sh    # Script inject env vars tại runtime
├── compose.yml             # Cấu hình Docker Compose
├── .dockerignore           # Files/folders bỏ qua khi build
├── .env                    # Biến môi trường (không commit)
├── .env.example            # Template cho .env
└── Docker.md               # File hướng dẫn này
```

## Thông Tin Kỹ Thuật

- **Base Image:** `node:20-alpine`
- **Build Type:** Multi-stage build (deps → builder → runner)
- **Output Mode:** Next.js standalone
- **Image Size:** ~313MB
- **Port:** 3000
- **User:** nextjs (non-root)

## Runtime Environment Injection

### Cách Hoạt Động

Docker image được build **không chứa bất kỳ secret nào**. Các biến `NEXT_PUBLIC_*` được thay thế bằng placeholder tại build time:

1. **Build time:** Next.js được build với placeholder values (URL hợp lệ để build thành công):
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://placeholder.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `placeholder-anon-key`

2. **Runtime:** Khi container khởi động, `docker-entrypoint.sh` sẽ:
   - Đọc các biến môi trường thực từ file `.env`
   - Tìm và thay thế placeholder trong các file JS bundle
   - Khởi động Next.js server

### Lợi Ích

- **Bảo mật:** Image không chứa credentials, có thể chia sẻ an toàn
- **Linh hoạt:** Cùng một image có thể chạy với nhiều môi trường khác nhau (dev, staging, production)
- **CI/CD friendly:** Build image một lần, deploy nhiều nơi với config khác nhau

### Lưu Ý

- Các biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` **bắt buộc** phải có trong file `.env`
- Container sẽ không khởi động nếu thiếu các biến này
- Các biến khác như `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` được đọc trực tiếp từ environment tại runtime (không cần inject vào bundle)

## Lưu Ý Bảo Mật

- **KHÔNG** commit file `.env` lên Git
- File `.env` đã được thêm vào `.gitignore`
- Sử dụng JWT_SECRET mạnh và ngẫu nhiên cho production
- Không chia sẻ SUPABASE_SERVICE_ROLE_KEY với người khác
- Container chạy với user non-root (nextjs) để tăng bảo mật
- Image không chứa secrets, an toàn để push lên registry công khai
