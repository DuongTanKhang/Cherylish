# Báo cáo GEME Admin, POS, storefront, SQL và Loyverse

Ngày kiểm tra: 14/11/2026

## Đã thực hiện

- Gỡ service `storefront` khỏi `compose.yaml`, xóa volume riêng của storefront khỏi Compose, bỏ các biến proxy asset storefront khỏi Admin Dockerfile/Next config và cập nhật liên kết điều hướng Admin. Stack khởi động bằng một thao tác qua `outputs/Start-GEME-Admin.cmd`; có file dừng tương ứng.
- Gỡ module POS365 khỏi NestJS, bỏ dependency khỏi Commerce/Viettel Post và bỏ màn hình/trạng thái đồng bộ POS trong Admin. Gỡ các khóa POS365 khỏi `.env.docker`, `.env.docker.example` và Compose. Các cột POS365 lịch sử trong Prisma/DB vẫn được giữ để không làm mất dữ liệu cũ.
- Ẩn mục Banner/Footer, Blog và Khuyến mãi khỏi sidebar; bỏ các khối Blog/Khuyến mãi khỏi dashboard. Sản phẩm, đơn, khách hàng, danh mục và kho vẫn giữ vì dùng cho nghiệp vụ Admin.
- Chuẩn bị cấu hình Loyverse ở Compose và `.env.docker`: `LOYVERSE_ENABLED=false`, token và Store ID để trống; không bật tính năng trả phí. Có hướng dẫn tại `LOYVERSE-CONFIG.md`.

## Kiểm tra đã chạy

- Admin production build (`next build` trong Docker): **đạt**, biên dịch và TypeScript hoàn tất; các route `/`, `/login`, API proxy được tạo.
- TypeScript Admin (`pnpm exec tsc --noEmit`): **đạt**.
- API build (`pnpm build`): **đạt**.
- HTTP smoke check: `/login` trả 200; `/` chuyển hướng 307 tới luồng đăng nhập; API `/api/v1/health/ready` trả 200 và báo database connected; gọi `/api/v1/admin/products` không có phiên đăng nhập trả 401 như mong đợi.
- Các container Admin, API, worker, AI Core, PostgreSQL, SQL Server, Redis, AEGIS và Mailpit đang healthy/đang chạy trước khi tắt máy; không có container storefront.

## Rà soát SQL

- PostgreSQL GEME có 34 bảng. Trong lần đếm hàng: `categories` có 5 bản ghi; các bảng còn lại trong danh sách đếm đều 0 bản ghi tại thời điểm kiểm tra. Các bảng Blog/ảnh Blog, khuyến mãi, lượt dùng/đối tượng khuyến mãi và favorites đều rỗng.
- SQL Server AEGIS có 11 bảng xác thực/bảo mật và lịch sử migration: Users, Roles, Permissions, UserRoles, RolePermissions, Sessions, RefreshTokens, TrustDevice, AuditLogs, SecurityAudits, `__EFMigrationsHistory`. Giữ nguyên vì phục vụ đăng nhập/quyền và bảo mật Admin.
- **Không drop bảng nào** trong lượt này: Blog/khuyến mãi vẫn còn model, route và một phần mã quản trị/backend trong nguồn; drop trực tiếp sẽ khiến schema Prisma và ứng dụng lệch nhau. Cần một thay đổi đồng bộ gồm gỡ toàn bộ route/model trước khi tạo migration xóa bảng. Các cột POS365 cũng được giữ dạng lịch sử.

## Phần còn chờ / giới hạn

- Thư mục nguồn storefront `outputs/geme` còn trên đĩa nhưng không được Compose khởi chạy và không còn liên kết asset từ Admin. Lệnh xóa đệ quy thư mục này bị automatic approval review của môi trường chặn (`blocked by policy`), nên mình không dùng cách khác để lách chặn.
- Mục Blog/Khuyến mãi/Banner đã bị bỏ khỏi giao diện điều hướng và dashboard, nhưng route/một số mã xử lý tương ứng vẫn còn trong source; do đó chưa thể nói các chức năng này đã bị xóa hoàn toàn khỏi code.
- Loyverse chưa kết nối tài khoản: PC chưa có Access Token/Store ID. Compose hiện chỉ có placeholder tắt; chưa có connector đồng bộ hay kiểm tra kết nối. GEME tiếp tục lưu phiếu nhập/xuất và lịch sử kho nội bộ. Xem [giá Loyverse](https://loyverse.com/pricing), [Advanced Inventory](https://help.loyverse.com/help/advanced-inventory-management), [API](https://developer.loyverse.com/docs/) và [hướng dẫn token](https://help.loyverse.com/help/loyverse-api).
- Kiểm tra Admin là build, type-check và smoke test HTTP/health/auth; chưa đăng nhập để duyệt từng màn hình bằng tài khoản người dùng.


## Bổ sung: container Cherylish (15/11/2026)

- Đã tạo image `cherylish:latest`, gộp Admin UI, GEME API và AI worker vào một container ứng dụng. AEGIS, AI Core, PostgreSQL, SQL Server, Redis và Mailpit vẫn là các container phụ trợ riêng.
- Đã đổi Compose project sang `cherylish`; các named volume hiện trỏ về volume `geme-local_*` cũ để giữ dữ liệu DB/cache khi đổi tên project.
- Container `cherylish-admin-bundle-1` đang healthy. Kiểm tra: Admin `/login` HTTP 200; root HTTP 307 sang đăng nhập; API readiness/database HTTP 200; API quản trị không có phiên đăng nhập HTTP 401; AI Core nội bộ HTTP 200; AEGIS Swagger HTTP 200.
- Đã dừng/xóa các container và image Admin/API/worker riêng cũ cùng dangling build images sau khi bundle chạy được. Các image dịch vụ dữ liệu/phụ trợ được giữ lại.
- Chưa push Docker Hub: tài khoản đã đăng nhập nhưng cần namespace/tên tài khoản để gắn tag `namespace/cherylish:latest`. Mình đã hỏi namespace; chưa nhận được câu trả lời trong 2 phút nên dừng theo chỉ dẫn và tắt máy.
