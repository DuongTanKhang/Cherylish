# Kết nối Loyverse với Cherylish

Cherylish đã có connector Loyverse trong image Docker `cherylish:latest`. Container hiện chạy được, nhưng sẽ chỉ kết nối khi có access token và Store ID trong file `.env.docker` riêng trên máy này.

## 1. Tạo API access token

Đăng nhập Loyverse Back Office → **Apps** → **Access tokens** → **+ Add access token**. Sao chép token sau khi tạo. Token có quyền truy cập API trên tài khoản, vì vậy hãy giữ như mật khẩu, không gửi qua chat hoặc ảnh chụp màn hình. Hướng dẫn chính thức: [Tạo access token](https://help.loyverse.com/help/loyverse-api).

## 2. Lấy Store ID và xác nhận token

Mở PowerShell và chạy đoạn sau. Khi được hỏi, dán token vào ô nhập ẩn; lệnh chỉ in tên cửa hàng và ID, không in token:

```powershell
$secureToken = Read-Host "Loyverse access token" -AsSecureString
$token = [System.Net.NetworkCredential]::new("", $secureToken).Password
try {
  $result = Invoke-RestMethod -Uri "https://api.loyverse.com/v1.0/stores" -Headers @{ Authorization = "Bearer $token" }
  $result.stores | Select-Object name, id
} finally {
  Remove-Variable token, secureToken -ErrorAction SilentlyContinue
}
```

Chọn đúng cửa hàng sẽ dùng làm quầy bán hàng; lấy `id` của cửa hàng đó.

## 3. Lưu cấu hình riêng trên PC

Mở file `.env.docker` trong thư mục dự án và điền ba biến này. Không gửi giá trị token lên chat:

```dotenv
LOYVERSE_ENABLED=true
LOYVERSE_ACCESS_TOKEN=<token vừa tạo>
LOYVERSE_STORE_ID=<id cửa hàng>
```

Sau đó nạp lại riêng container app:

```powershell
docker compose --env-file .env.docker -f compose.yaml up -d --force-recreate admin-bundle
```

## 4. Kiểm tra rồi đồng bộ

Lệnh PowerShell ở bước 2 kiểm tra token thật với API và trả về các cửa hàng, mà không sửa dữ liệu. Sau khi container được khởi động lại, Cherylish sẽ đưa các thay đổi Trang sức/Đá quý vào hàng đợi Loyverse. Nút đồng bộ trong trang Tồn kho sẽ đưa **toàn bộ** sản phẩm Trang sức/Đá quý vào hàng đợi, tạo mặt hàng còn thiếu theo SKU và ghi số tồn hiện tại sang cửa hàng đã chọn. Hãy kiểm tra danh sách hàng và số tồn trong Loyverse trước khi bấm nút này.

Nhóm loại khác, bao gồm Vật phẩm, không được đồng bộ. Phiếu nhập/xuất chi tiết, nhà cung cấp, VAT, chứng từ và lịch sử nâng cao vẫn lưu tại Cherylish; chúng thuộc tính năng Advanced Inventory trả phí của Loyverse. [Bảng giá Loyverse](https://loyverse.com/pricing) · [Tài liệu API](https://developer.loyverse.com/docs/).
