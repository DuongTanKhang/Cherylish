# Cherylish — trạng thái làm sạch dữ liệu

Ngày thực hiện: 2026-11-15

## Đã làm

- Dừng và xóa các container cũ của dự án, xóa các volume dữ liệu runtime cũ rồi tạo lại volume trống cho PostgreSQL, SQL Server và Redis. Cache `node_modules` và Next.js cũ cũng được xóa để cài/build lại sạch.
- Giữ nguyên mã nguồn, cấu trúc database, migration và logic/chức năng ứng dụng để tiếp tục phát triển thành dự án Cherylish.
- Tài khoản quản trị được bootstrap lại dưới tên đăng nhập `admin`; mật khẩu ban đầu theo yêu cầu là `admin`. Chỉ sử dụng cấu hình này cho môi trường local.
- Gỡ cấu hình SMTP Gmail. Ứng dụng gửi email vào Mailpit cục bộ; hộp thư Mailpit hiện trống. Chức năng gửi email vẫn còn để có thể kiểm tra trong quá trình phát triển.

## Trạng thái dữ liệu mới

- Bảng nghiệp vụ được kiểm tra: sản phẩm, khách hàng, đơn hàng, bài viết, khuyến mãi và tác vụ AI đều không có bản ghi.
- PostgreSQL có 1 tài khoản quản trị bootstrap và 5 danh mục mặc định do ứng dụng tự tạo khi khởi động.
- Các bảng người dùng, phiên đăng nhập, refresh token và audit log trong SQL Server không có bản ghi.
- Schema và migration được giữ lại; không xóa bảng để tránh ảnh hưởng logic ứng dụng.

## Kiểm tra khởi động

- `docker compose ... config --quiet`: hợp lệ.
- `cherylish-admin-bundle`, PostgreSQL, SQL Server, Redis, AI Redis và Mailpit đang chạy; các healthcheck được khai báo đều healthy.
- API readiness trả HTTP 200.
- Đăng nhập local bằng tài khoản bootstrap thành công; giao diện `/login` trả HTTP 200.
- Mailpit UI trả HTTP 200 và API Mailpit xác nhận 0 email.

## Địa chỉ local

- Admin: http://localhost:3001/login
- API: http://localhost:4000
- Mailpit: http://localhost:8025

Không ghi mật khẩu, token hoặc khóa bí mật vào báo cáo này.
