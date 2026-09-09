# Thiết kế nghiệp vụ và dữ liệu

## Phân quyền truy cập

Hệ thống sử dụng xác thực của nền tảng và phân tách quyền ở cả giao diện lẫn thủ tục nghiệp vụ phía máy chủ. Vai trò **Admin** có quyền quản trị đơn vị/tổ, hồ sơ nhân sự, ảnh/tệp đính kèm, nhập–xuất dữ liệu và thiết lập. Vai trò **User** chỉ được xem dashboard, tra cứu danh sách, xem hồ sơ và xuất danh sách theo phạm vi dữ liệu được cấp. Mọi thao tác làm thay đổi dữ liệu phải được kiểm tra quyền ở máy chủ, không chỉ ẩn nút trên giao diện.

| Nhóm dữ liệu | Admin | User |
|---|---:|---:|
| Dashboard và thống kê | Xem | Xem |
| Danh sách, bộ lọc và hồ sơ nhân sự | Xem, tạo, sửa, xóa | Chỉ xem |
| Ảnh và tệp hồ sơ | Tải lên, cập nhật, xem | Chỉ xem |
| Đơn vị/tổ | Xem, tạo, sửa, xóa | Chỉ xem |
| Nhập Excel và cài đặt | Thực hiện | Không truy cập |
| Xuất Excel | Thực hiện | Thực hiện |

## Mô hình dữ liệu

Mỗi hồ sơ nhân sự thuộc một đơn vị/tổ. Tệp ảnh thẻ và các quyết định được lưu ở kho đối tượng; cơ sở dữ liệu chỉ lưu khóa và đường dẫn để tránh lưu nội dung tệp trực tiếp trong bảng. Ngày sinh, ngày tham gia và ngày thôi tham gia được ghi nhận theo thời điểm chuẩn, sau đó giao diện hiển thị bằng định dạng ngày Việt Nam.

| Thực thể | Dữ liệu trọng tâm | Quy tắc nghiệp vụ |
|---|---|---|
| `units` | Mã, tên, loại đơn vị, đơn vị cha, địa chỉ, trạng thái | Không xóa đơn vị khi còn hồ sơ nhân sự liên kết. |
| `personnel` | Họ tên, ngày sinh, giới tính, CCCD, địa chỉ, chức vụ, đơn vị, ngày tham gia, ngày thôi tham gia, trạng thái | Khi có ngày thôi tham gia, trạng thái được lưu là `inactive`. Tuổi và số tháng công tác được tính khi truy vấn/hiển thị. |
| `personnel_files` | Loại tệp, tên gốc, khóa lưu trữ, đường dẫn, kiểu tệp | Hỗ trợ ảnh thẻ, quyết định tuyển dụng và quyết định thôi việc. |
| `users` | Tài khoản đăng nhập, tên, email, vai trò | Vai trò nền tảng gồm `admin` và `user`. |

## Quy ước nhập và xuất Excel

Tệp mẫu hiện có được giữ nguyên hàng tiêu đề để phù hợp dữ liệu triển khai ban đầu. Chức năng nhập chấp nhận các cột `STT`, `HoTen`, `NgaySinh`, `GioiTinh`, `TrinhDo`, `DanToc`, `ChucVu`, `KetQuaChinhSach`, `CCCD`, `TonGiao`, `Thon/Todanpho`, `Xa/Phuong`, `NgayThamGiaCAXBCT,BVDP`, `NgayThamGiaLLTGBVANTT`, `NgayThoiCAXBCT,BVDP`, `NgayThoiThamGiaLLTGBVANTT`, `Sodienthoai`, `SoGCNsudungCCHT`, `Ghichu`, `Khenthuong`, `MucXeploai` và `Qdxeploai`.

Việc nhập dữ liệu kiểm tra bắt buộc có họ tên; ngày tháng phải đọc được; CCCD nếu có phải gồm 9 hoặc 12 chữ số; đơn vị/xã phường được chuẩn hóa trước khi lưu. Bất cứ dòng nào không hợp lệ sẽ được tổng hợp số dòng và lý do để cán bộ chỉnh sửa. Tệp xuất bổ sung trạng thái, tuổi và số tháng công tác để phục vụ rà soát, báo cáo.
