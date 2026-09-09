# Ghi nhận xác minh giao diện

Lần kiểm tra trực quan đầu tiên cho thấy các trang danh sách nhân sự, đơn vị/tổ và kết quả chính sách sử dụng thống nhất sidebar xanh navy, điểm nhấn đỏ, bảng dữ liệu và vùng lọc rõ ràng. Hệ thống nhận diện phiên đăng nhập Admin hợp lệ. Các API danh sách đang trả về mảng rỗng khi chưa có dữ liệu, nên trạng thái trống sẽ được tiếp tục kiểm tra sau khi giao diện hoàn tất tải dữ liệu.

Kiểm tra sau khi tải hoàn tất xác nhận dashboard hiển thị đúng các chỉ số bằng 0 và các trạng thái trống có hướng dẫn hành động rõ ràng. Phân hệ danh sách nhân sự, Backup & dữ liệu và Cài đặt đều hiển thị đúng trên desktop. Trên màn hình di động, navigation được thu gọn thành thanh đầu trang; các thẻ thống kê, biểu mẫu và thao tác dữ liệu xếp một cột, còn bảng dữ liệu giữ khả năng cuộn ngang để bảo toàn các cột nghiệp vụ.

Bộ lọc nâng cao của danh sách nhân sự đã được xác minh ở desktop và mobile. Tại desktop, các tiêu chí họ tên/CCCD, chức vụ, đơn vị, trạng thái và nhóm tuổi được dàn thành hai hàng, tránh co hẹp nhãn. Trên mobile, các trường xếp một cột, nút tra cứu giữ chiều rộng đầy đủ và thông báo số tiêu chí đang áp dụng vẫn hiển thị rõ ràng.

Trang quản lý đơn vị đã hiển thị nhãn cột **Tên xã, phường** thay cho thuật ngữ trước đây. Nút **Tải file mẫu** được hiển thị cạnh thao tác thêm đơn vị; kiểm thử tự động đã xác nhận tệp Excel tạo ra có đúng hai cột “Tên xã, phường” và “Tên đơn vị/tổ”.

Khu vực **Nhập danh mục từ Excel** hiển thị rõ thao tác chọn tệp, diễn giải cách tự tạo xã/phường và gắn đơn vị/tổ vào địa bàn, cùng quy ước dữ liệu và cảnh báo báo cáo lỗi. Trên desktop, khu vực thông tin và quy ước được dàn hai cột; trên mobile, các thao tác và nội dung xếp một cột, giữ nút chọn file dễ thao tác.

Phân hệ quản lý đơn vị đã được đổi thuật ngữ loại đơn vị từ “Tổ/Đội” thành “Tổ”. Khu vực quân số hiển thị rõ mỗi Tổ, xã/phường liên kết, số thành viên đang tham gia và trạng thái định mức. Các Tổ cũ chưa gắn xã/phường hoặc chưa đặt định mức được đánh dấu trực tiếp để cán bộ cập nhật bằng biểu mẫu chỉnh sửa.

Giao diện quân số Tổ tiếp tục hiển thị đúng trên desktop sau khi thêm ràng buộc dữ liệu. Một đường dẫn thử nghiệm không trùng với route đang đăng ký của phân hệ danh sách thành viên nên hiển thị trang 404; việc kiểm tra trực quan cần sử dụng route chính thức trong cấu hình ứng dụng.

Phân hệ Đơn vị/Tổ vẫn giữ bố cục rõ ràng sau khi tích hợp thanh tiến trình nhập Excel. Ở khung nhìn desktop, khu vực chọn file, quy ước dữ liệu và danh sách quân số Tổ hiển thị ổn định với dữ liệu danh mục lớn; thanh tiến trình được đặt trực tiếp dưới nút chọn tệp khi người dùng bắt đầu nhập.

Thanh tiến trình nhập Excel đã được xác minh trên desktop và mobile ở ba trạng thái: đang nhập (navy, 72%), hoàn tất (xanh lục, 100%) và cần xử lý lỗi (đỏ, 100%). Nhãn trạng thái, phần trăm, tên tệp và thông điệp hướng dẫn đều hiển thị đầy đủ; trạng thái đang nhập khóa các nút chọn tệp để ngăn thao tác lặp.

Trang **Tổng quan** đã được kiểm tra trên desktop và mobile sau khi chuyển biểu đồ. Hai khu vực mới có tiêu đề, diễn giải và trạng thái trống rõ ràng khi chưa có hồ sơ đang tham gia. Treemap sẽ tự hiển thị dữ liệu theo xã/phường sau khi nhập hồ sơ; biểu đồ **Kết quả xây dựng lực lượng** hiển thị các nhóm chức vụ, độ tuổi, giới tính và trình độ theo bố cục responsive. Trên mobile, các thẻ chỉ số và hai khu vực biểu đồ xếp một cột, không có hiện tượng tràn ngang.

Khu vực **Cài đặt → Phân quyền cán bộ** đã được xác minh trên desktop và mobile với ma trận Admin, Lãnh đạo và User xã/phường. Ở desktop, bảng thể hiện địa bàn được giao và lựa chọn quyền rõ ràng; ở mobile, bảng giữ cuộn ngang để không mất các cột nghiệp vụ, còn phần mô tả ma trận quyền và khu vực chuyển dữ liệu xếp một cột, dễ đọc và thao tác.

Khu vực **Yêu cầu xóa hồ sơ** đã được xác minh trên desktop và mobile. Trạng thái rỗng, tổng số yêu cầu chờ xử lý và các cột nghiệp vụ hiển thị rõ ràng trên desktop; trên mobile, bảng được đặt trong vùng cuộn ngang để giữ nguyên thông tin hồ sơ, người yêu cầu, lý do, trạng thái và thao tác Admin.

Trang **Danh sách thành viên** đã được xác minh trên desktop và mobile sau khi tích hợp luồng yêu cầu xóa. Với dữ liệu hiện hành chưa có hồ sơ, giao diện hiển thị trạng thái rỗng rõ ràng và giữ bố cục responsive. Nút **Yêu cầu xóa** chỉ xuất hiện khi User xã/phường mở một hồ sơ đã có; nội dung hộp thoại, yêu cầu lý do tối thiểu và trạng thái khóa nút gửi được bao phủ bằng kiểm thử render giao diện.

Hàng đợi **Yêu cầu xóa hồ sơ** đã được xác minh sau khi thêm tài liệu minh chứng. Trên desktop, cột “Lý do & minh chứng” có không gian hiển thị lý do và các liên kết tệp. Trên mobile, vùng bảng vẫn cuộn ngang để giữ nguyên các cột nghiệp vụ, trong khi phần mô tả làm rõ User gửi lý do kèm tài liệu và Admin xem xét trước khi xử lý.

Trang **Danh sách thành viên** tiếp tục giữ bố cục ổn định trên desktop và mobile sau khi bổ sung các khu vực tệp. Hộp hồ sơ đã được mở bằng dữ liệu tạm thời trong phạm vi xã/phường trên cả desktop và mobile để xác minh luồng User; dữ liệu và quyền tạm thời đã được khôi phục ngay sau đó. Nhãn Quyết định tham gia, Quyết định cho thôi tham gia, chọn ảnh/PDF và biểu mẫu minh chứng cũng được bao phủ bằng kiểm thử render và kiểm thử API.

Route chính thức của trang Danh sách thành viên là **`/nhan-su`**; route `/thanh-vien` trả về 404. Ảnh chụp mới nhất tại `/nhan-su` đang ghi nhận trạng thái khung tải dữ liệu, trong khi kiểm tra kiểu, hồi quy và build production đều đạt. Cần xác minh lại chi tiết hồ sơ trong phiên đã tải dữ liệu đầy đủ nếu tiếp tục kiểm tra trực quan thao tác thêm quyết định và huấn luyện.

Khu vực **Cài đặt → Đồng bộ với Web** đã được xác minh trực quan trên desktop. Tiêu đề Cài đặt hiển thị trước khu vực tạo token; biểu mẫu có nhãn token, lựa chọn phạm vi Toàn tỉnh hoặc xã/phường, nút tạo token, bảng trạng thái token và URL snapshot v1. Khi chưa có token, bảng hiển thị trạng thái rỗng rõ ràng.

Ngày 23/08/2026, trang **Cài đặt** được xác minh lại sau khi bổ sung khu vực **Quyền bổ sung cho Lãnh đạo** ngay trước bảng phân quyền lớn. Admin có thể tích chọn từng nhóm quyền quản trị cho từng tài khoản Lãnh đạo; danh mục gồm quản lý hồ sơ, xóa hồ sơ, quản lý danh mục, quản lý tài khoản, backup/dữ liệu, Mobile Sync và chuyển dữ liệu. Biểu mẫu tài khoản và đổi mật khẩu nêu rõ yêu cầu tối thiểu 8 ký tự cùng khuyến nghị mật khẩu mạnh.
