# Hướng dẫn sử dụng Hệ thống Quản lý Lực lượng BVANTT Cơ sở

## 1. Đăng nhập và phân quyền

Người dùng có thể truy cập bằng **tài khoản nội bộ** do Admin tạo hoặc bằng tài khoản đăng nhập tập trung đã được cấp. Với đăng nhập tập trung, sau lần đăng nhập đầu tiên, tài khoản được tạo trong danh mục người dùng với vai trò **User** và chưa có phạm vi địa bàn. Admin mở **Cài đặt → Phân quyền cán bộ** để chọn vai trò và, nếu là User xã/phường, gán đúng một xã/phường trước khi tài khoản đó có thể truy cập dữ liệu.

> Vai trò tài khoản được quản lý tại **Cài đặt → Phân quyền cán bộ**. Admin không thể tự gỡ quyền quản trị của chính mình để tránh làm mất quyền vận hành hệ thống.

### Tạo tài khoản nội bộ và phân loại quyền

Admin vào **Cài đặt → Tạo tài khoản nội bộ**, nhập họ tên, tên đăng nhập và mật khẩu ban đầu. Tên đăng nhập chỉ dùng chữ cái không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang. Mật khẩu cần tối thiểu **8 ký tự**. Mật khẩu mạnh nên kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt. Mật khẩu ban đầu và mật khẩu được cấp lại đều là **mật khẩu tạm**: cán bộ phải đổi sang mật khẩu mới sau khi đăng nhập, trước khi được truy cập bất kỳ nghiệp vụ nào. Tại bước phân loại, Admin dùng ba câu hỏi hiển thị ngay trong màn hình: cán bộ quản lý một xã/phường thì chọn **User xã/phường** và chọn đúng địa bàn; cán bộ chỉ xem, tổng hợp số liệu mọi địa bàn thì chọn **Lãnh đạo**; quyền **Admin** chỉ cấp theo quyết định của đơn vị.

Ví dụ mật khẩu đáp ứng yêu cầu: `AnTtCoSo#2026`. Ngay khi nhập, biểu mẫu sẽ nêu phần còn thiếu của mật khẩu; khi tạo không thành công, hệ thống hiển thị trực tiếp lý do, như tên đăng nhập trùng hoặc xã/phường chưa được chọn.

| Thông báo hoặc tình huống | Cách xử lý |
|---|---|
| Tên đăng nhập không hợp lệ | Dùng 3–80 ký tự không dấu, ví dụ `canbo.anlao01`; không dùng khoảng trắng hoặc ký tự có dấu tiếng Việt. |
| Mật khẩu chưa đạt yêu cầu | Bổ sung đủ chữ hoa, chữ thường, chữ số, ký tự đặc biệt và tối thiểu 12 ký tự. |
| User xã/phường chưa chọn địa bàn | Chọn đúng một xã/phường trong danh sách trước khi bấm **Tạo và cấp quyền**. |
| Tên đăng nhập đã tồn tại | Đổi sang tên khác, ví dụ thêm mã xã/phường hoặc số thứ tự; không thể tạo hai tài khoản dùng chung tên đăng nhập. |

Danh sách **Phân quyền cán bộ** có bộ lọc theo tên, email, tên đăng nhập, địa bàn và tình trạng phân quyền. Với tài khoản nội bộ, Admin có thể nhập mật khẩu mới và bấm **Cấp lại**; hệ thống chỉ lưu mật khẩu ở dạng mã băm, không hiển thị lại mật khẩu đã tạo. Sau khi tạo, kiểm tra tài khoản vừa cấp xuất hiện trong bảng này với nhãn **Tài khoản nội bộ**, đúng vai trò và xã/phường được giao. Đợt cấp phát ban đầu gồm **135 User xã/phường** theo định dạng `canbo.<tên xã/phường viết liền không dấu>` và **09 Lãnh đạo** `canbo.ld02` đến `canbo.ld10`; tất cả dùng mật khẩu tạm `12345678` và buộc đổi ngay sau lần đăng nhập đầu.

| Vai trò | Phạm vi dữ liệu | Quyền chính |
|---|---|---|
| Admin | Toàn hệ thống | Quản lý hồ sơ, Tổ bảo vệ an ninh, trật tự, ảnh/tệp, Excel, backup, cài đặt và phân quyền. Đây là vai trò duy nhất được xóa dữ liệu và mở/đóng quyền chỉnh sửa cho User. |
| Lãnh đạo | Toàn bộ xã/phường | Mặc định chỉ xem Tổng quan, danh sách thành viên, Tổ bảo vệ an ninh, trật tự, kết quả chính sách và xuất Excel. Admin có thể tích chọn thêm từng nhóm quyền: quản lý hồ sơ, xóa hồ sơ, quản lý danh mục, tài khoản, backup/dữ liệu, Mobile Sync và chuyển dữ liệu. |
| User xã/phường | Một xã/phường do Admin phân công | Mặc định chỉ xem và xuất Excel hồ sơ/tệp thuộc xã/phường được giao. Chỉ được thêm/cập nhật khi Admin phê duyệt quyền chỉnh sửa; không thể xóa dữ liệu, đổi danh mục, xem hoặc xuất dữ liệu địa bàn khác, backup hay quản lý quyền. |

> Khi cần xóa hồ sơ hoặc tệp, User xã/phường liên hệ Admin thực hiện. Hệ thống kiểm tra phạm vi này tại API, vì vậy không thể truy cập hồ sơ địa bàn khác bằng thao tác trực tiếp trên trình duyệt.

## 2. Thiết lập đơn vị/Tổ bảo vệ an ninh, trật tự

Trước khi lập hồ sơ hoặc nhập Excel, Admin nên vào menu **Đơn vị / tổ** để khai báo mã, tên, loại đơn vị và trạng thái sử dụng. Việc khai báo đúng đơn vị giúp phân loại chính xác hồ sơ, hỗ trợ tra cứu và tránh lỗi khi nhập dữ liệu hàng loạt.

Khi có sáp nhập hoặc điều chỉnh địa bàn, Admin mở **Cài đặt → Chuyển dữ liệu theo đơn vị**, chọn đơn vị nguồn và đơn vị đích, sau đó xác nhận thao tác. Toàn bộ hồ sơ thuộc đơn vị nguồn được chuyển sang đơn vị đích, không bị xóa.

## 3. Quản lý hồ sơ thành viên

Menu **Danh sách thành viên** hỗ trợ tra cứu theo họ tên/CCCD/số điện thoại, chức vụ, Tổ bảo vệ an ninh, trật tự và trạng thái. Admin có thể tạo, sửa và xóa. User xã/phường mặc định chỉ xem và xuất Excel hồ sơ trong địa bàn được giao; khi được mở quyền chỉnh sửa, User có thể bấm **Thêm thành viên** hoặc bấm đúp một dòng để tạo/cập nhật. Lãnh đạo chỉ mở hồ sơ ở chế độ xem, trừ khi Admin đã tích chọn quyền **Quản lý hồ sơ** hoặc **Xóa hồ sơ** cho chính tài khoản Lãnh đạo đó. Admin và Lãnh đạo có thêm bộ lọc **Xã/phường** dạng chọn nhiều: có thể tích một, nhiều hoặc tất cả xã/phường. Danh sách Tổ bảo vệ an ninh, trật tự, kết quả tra cứu và Excel xuất ra luôn phản ánh đúng tập địa bàn đã chọn.

Hệ thống tự tính tuổi, đánh dấu nhóm từ 70 tuổi và tính số tháng công tác từ ngày tham gia. Khi nhập **Ngày thôi tham gia LLTGBVANTT**, trạng thái được tự động chuyển thành **Thôi tham gia**. Các hồ sơ này sẽ đồng thời xuất hiện ở menu **Kết quả giải quyết chính sách**.

Sau khi lưu hồ sơ lần đầu, Admin và User xã/phường được phân công có thể cập nhật ảnh thẻ, đính kèm quyết định tuyển dụng, quyết định thôi việc hoặc tệp khác trong phạm vi được phép. Hệ thống chỉ chấp nhận ảnh và PDF với dung lượng không quá 10 MB mỗi tệp; chỉ Admin có thể gỡ tệp đã lưu.

### Yêu cầu và phê duyệt quyền chỉnh sửa

Khi User xã/phường cần nhập mới hoặc hiệu chỉnh hồ sơ, tại màn hình **Danh sách thành viên** bấm **Yêu cầu quyền chỉnh sửa**, ghi rõ lý do tối thiểu 10 ký tự rồi gửi. Trong thời gian chờ xử lý, tài khoản vẫn chỉ xem và xuất dữ liệu địa bàn được giao. Admin vào **Cài đặt → Yêu cầu mở quyền chỉnh sửa** để đọc lý do và bấm **Phê duyệt** hoặc **Từ chối**; khi phê duyệt, quyền chỉnh sửa chỉ có hiệu lực trong đúng xã/phường đã phân công. Admin cũng có thể dùng nút **Mở quyền sửa/Đóng quyền sửa** bên cạnh từng User tại bảng **Phân quyền cán bộ** để mở hoặc thu hồi quyền ngay khi cần bảo vệ dữ liệu.

### Yêu cầu xóa hồ sơ

User xã/phường không thể xóa trực tiếp. Khi phát hiện hồ sơ nhập nhầm, trùng lặp hoặc không còn cần lưu, User mở hồ sơ, bấm **Yêu cầu xóa**, ghi rõ lý do rồi gửi. Hồ sơ vẫn được giữ nguyên ở trạng thái chờ. Admin vào **Cài đặt → Yêu cầu xóa hồ sơ** để đọc lý do, có thể **Từ chối** kèm ghi chú hoặc **Thực hiện xóa** sau khi xác nhận. Hệ thống lưu người gửi, người xử lý, thời điểm và kết quả để đối soát.

User có thể chọn nhiều **ảnh hoặc tệp PDF** làm tài liệu minh chứng ngay trong hộp **Yêu cầu xóa**. Mỗi tệp có dung lượng tối đa 10 MB. Sau khi gửi, Admin xem và mở các tệp tại cột **Lý do & minh chứng** trước khi quyết định. Chỉ tệp đính kèm khi yêu cầu đang ở trạng thái chờ mới được chấp nhận.

### Quyết định tham gia và cho thôi tham gia

Sau khi lưu hồ sơ, mở lại hồ sơ để tải lên các tệp **Quyết định tham gia lực lượng**, **Quyết định cho thôi tham gia** hoặc tệp hồ sơ khác. User xã/phường được phân công có thể tải tệp cho hồ sơ thuộc địa bàn mình quản lý; Admin có thể mở và gỡ tệp khi cần hiệu chỉnh. Các tệp hỗ trợ ảnh hoặc PDF, tối đa 10 MB mỗi tệp.

## 4. Nhập và xuất Excel

Tại menu **Backup & dữ liệu**, cán bộ bấm **Tải file mẫu** để tải bảng nhập liệu chuẩn mới nhất. Hàng tiêu đề của mẫu không được chỉnh sửa. File mẫu mới có hai cột liên quan đến đơn vị: **Xa/Phuong** (tên xã/phường) và **TenTo** (tên Tổ bảo vệ an ninh, trật tự). Từ dòng dữ liệu thứ hai, cán bộ bấm mũi tên chọn trong ô **Xa/Phuong**, rồi chọn **TenTo**; danh sách Tổ tự thay đổi theo xã/phường đã chọn. Cột **DiaChi** dùng để ghi toàn bộ địa chỉ, ví dụ thôn/tổ dân phố, xã/phường và tỉnh; không còn cột Thôn/Tổ dân phố riêng. Hệ thống vẫn kiểm tra cặp Xã/phường–Tổ khi nhập và báo lỗi nếu Tổ không thuộc xã/phường. Các file mẫu cũ có cột **Thon/Todanpho** vẫn được nhận và nội dung cột này được gộp vào Địa chỉ.

Nếu có dòng không hợp lệ, hệ thống không nhập dữ liệu và tự tải báo cáo lỗi dạng CSV gồm ba cột: **Dòng**, **Lỗi** và **Hướng xử lý**. Cán bộ sửa theo cột Hướng xử lý rồi nhập lại toàn bộ file. Sau khi toàn bộ dữ liệu hợp lệ, hệ thống nhập các hồ sơ và ghi nhật ký. Menu **Danh sách thành viên** có nút **Xuất Excel** cho mọi tài khoản đã được cấp quyền truy cập. User xã/phường chỉ tải được hồ sơ trong xã/phường được phân công; Admin và Lãnh đạo có thể chọn một, nhiều hoặc tất cả xã/phường trước khi tải dữ liệu tổng hợp.

Với file lớn có nhiều tên Tổ chưa khớp, hệ thống không yêu cầu sửa từng dòng. Sau khi chọn file, màn hình **Đối soát Tổ theo nhóm** sẽ tự gom các dòng có cùng cặp Xã/Phường–Tên Tổ thành một nhóm. Admin chọn Tổ đúng một lần cho mỗi nhóm; lựa chọn đó được áp dụng cho toàn bộ dòng trong nhóm trước khi hệ thống ghi dữ liệu theo lô. Không xác nhận ánh xạ khi chưa chọn đủ các nhóm để tránh gán nhầm dữ liệu.

| Tình huống | Cách xử lý |
|---|---|
| File báo thiếu cột | Tải lại file mẫu; sao chép dữ liệu vào mẫu mà không đổi tiêu đề. |
| Tổ không thuộc Xã/phường | Tải lại file mẫu mới; chọn **Xa/Phuong** trước rồi chọn **TenTo** bằng dropdown. Không gõ tay tên Tổ, vì nhiều xã/phường có thể cùng tên Tổ. |
| Báo Tổ gần khớp | Chọn lại một trong các tên Tổ hệ thống nêu ở cột Lỗi. Ví dụ tại **Xã An Hòa** không có “Thôn Xuân Phong Tây”; danh mục có **Thôn Xuân Phong Bắc** và **Thôn Xuân Phong Nam**, nên cán bộ cần chọn đúng một trong hai Tổ theo dữ liệu thực tế. |
| Thiếu Tổ | Chọn Xã/Phường trước, sau đó chọn Tên Tổ trong dropdown; không để trống cột **TenTo**. |
| Đơn vị không tồn tại | Khai báo đơn vị/tổ trước, hoặc sửa tên đơn vị trong Excel cho đúng danh mục. |
| CCCD không hợp lệ | Dùng 9 hoặc 12 chữ số. Hệ thống tự bỏ dấu cách, dấu chấm và gạch nối nếu số CCCD còn đủ độ dài. Với CCCD bắt đầu bằng `0`, giữ ô ở dạng **Văn bản** hoặc gõ dấu nháy đơn (`'`) trước số để Excel không mất số 0 đầu; nếu chưa có CCCD thì để trống ô. |
| Ngày không đọc được | Nhập theo dạng `dd/mm/yyyy` hoặc chọn đúng kiểu ngày trong Excel. |

## 5. Backup, khôi phục và thống kê

Nút **Tạo bản sao lưu** xuất toàn bộ danh sách hiện có ra Excel để cán bộ lưu tại nơi quản lý an toàn của đơn vị. Chức năng **Khôi phục từ tệp dữ liệu** tiếp nhận file Excel hợp lệ và bổ sung dữ liệu; không ghi đè tự động các hồ sơ đang có. Các thao tác nhập, khôi phục và sao lưu được lưu trong bảng nhật ký ở cuối trang.

Menu **Tổng quan** hiển thị số lượng tổng thể, số đang tham gia, số thôi tham gia, đơn vị quản lý, Treemap theo xã/phường và cơ cấu xây dựng lực lượng. Với User xã/phường, toàn bộ chỉ số và biểu đồ chỉ phản ánh địa bàn được phân công; Admin và Lãnh đạo xem toàn bộ dữ liệu.

Nút **Xuất biểu mẫu BM1** ở đầu menu **Tổng quan** tạo một tệp Excel theo **Biểu mẫu 01**. Mỗi xã/phường chiếm đúng một dòng; các dòng được sắp theo thứ tự 135 xã/phường trong danh sách chuẩn đã cung cấp. Bên cạnh cột STT, tệp bổ sung cột **Tên xã, phường** để định danh rõ dòng dữ liệu; 24 chỉ tiêu còn lại bám theo BM1. Các cột bị thương và hy sinh tiếp tục ghi **0** cho đến khi có nguồn dữ liệu nghiệp vụ tương ứng.

Khi xuất, cán bộ chọn một trong hai cách xác định kỳ: **Ngày cố định theo BM1** tính từ ngày 15 của tháng trước đến ngày 14 của tháng được chọn; hoặc **Khoảng ngày tự chọn** với ngày bắt đầu và ngày kết thúc. Tổng quân số, giới tính, độ tuổi, trình độ, dân tộc và số Tổ được tính tại ngày kết thúc; tuyển mới, thôi tham gia, khen thưởng và huấn luyện được tính theo khoảng kỳ đã chọn.

Trong chi tiết hồ sơ thành viên, mục **Khen thưởng và bồi dưỡng, huấn luyện** cho phép thêm nhiều bản ghi độc lập. Mỗi bản ghi bắt buộc có số quyết định, ngày ban hành và cơ quan ban hành; đợt huấn luyện có thêm tên đợt. Sau khi lưu bản ghi, cán bộ có thể đính kèm nhiều ảnh hoặc PDF minh chứng, tối đa 10 MB mỗi tệp. Mỗi quyết định hoặc đợt huấn luyện được tổng hợp **một lần** vào đúng ô BM1 của xã/phường và kỳ báo cáo; do đó một thành viên có hai quyết định khen thưởng sẽ được tính hai lần ở các loại khen thưởng tương ứng.

Mục **Mức xếp loại** được chuẩn hóa theo bốn mức: **Hoàn thành xuất sắc nhiệm vụ**, **Hoàn thành tốt nhiệm vụ**, **Hoàn thành nhiệm vụ** và **Không hoàn thành nhiệm vụ**. Khi cập nhật qua Excel, hệ thống cũng quy đổi các nhãn tiếng Việt này về bốn mức chuẩn.

User xã/phường mở nút này chỉ nhận được tệp có **một dòng** của xã/phường đã được Admin phân công; máy chủ cưỡng chế phạm vi này. Admin và Lãnh đạo phải tích chọn **một hoặc nhiều** xã/phường trước khi xuất, có thể dùng **Chọn tất cả** hoặc **Bỏ chọn**. Hệ thống không xuất biểu mẫu BM1 bao quát ngoài phạm vi quyền của tài khoản.

## 6. Cập nhật sau khi xuất bản

Xuất bản không khóa phần mềm. Khi cần thay đổi chức năng, giao diện hoặc phân quyền, Admin yêu cầu cập nhật phiên bản; sau khi kiểm thử và có checkpoint mới, Admin bấm **Publish** để đưa phiên bản mới lên hệ thống. Lịch sử phiên bản cho phép khôi phục nếu cần quay lại bản trước đó.

## 7. Lưu trữ dữ liệu và Google Drive

Thông tin nghiệp vụ như hồ sơ nhân sự, đơn vị/Tổ, phân quyền, yêu cầu xóa và nhật ký được lưu trong cơ sở dữ liệu của hệ thống. Ảnh thẻ, quyết định và tài liệu minh chứng được lưu ở kho tệp S3 của hệ thống; cơ sở dữ liệu chỉ giữ thông tin mô tả và liên kết tệp. Người dùng truy cập dữ liệu qua tài khoản được phân quyền trong phần mềm, xem tệp ngay trong hồ sơ hoặc tải Excel khi có quyền; không truy cập trực tiếp vào cơ sở dữ liệu hay kho tệp.

Kết nối Google Drive cá nhân có thể triển khai thông qua tích hợp Google Workspace sau khi chủ sở hữu đăng nhập và cấp quyền. Hiện dự án **chưa bật kết nối hoặc đồng bộ Google Drive**, vì vậy không có dữ liệu nào tự động được chuyển sang Drive. Trước khi kích hoạt, Admin cần thống nhất phạm vi: chỉ tải bản backup/xuất Excel thủ công lên một thư mục Drive, hay đồng bộ tự động; đồng thời lựa chọn tài khoản Drive và quyền chia sẻ phù hợp với dữ liệu nghiệp vụ.

## 8. Mobile Sync nhân sự

Ứng dụng di động gọi `GET /api/mobile-sync/v1/personnel` với header `Authorization: Bearer <token>`. Admin tạo token tại **Cài đặt → Đồng bộ với Web** và phải sao chép ngay; hệ thống chỉ lưu hash SHA-256 và không hiển thị lại token gốc. Token bị thu hồi lập tức không thể tiếp tục dùng. Khi token thiếu, sai hoặc đã thu hồi, hệ thống trả về `401` với nội dung `{ "error": "unauthorized" }`.

| Tham số | Ý nghĩa | Quy ước |
|---|---|---|
| `wardId` | Chọn một xã/phường khi token có phạm vi toàn tỉnh | Số nguyên dương, không bắt buộc |

Phản hồi thành công là snapshot có dạng `{ "version": 1, "generatedAt": "...", "units": [ ... ], "personnel": [ ... ] }`. Token theo xã/phường luôn chỉ nhận xã/phường được gắn, các Tổ trực thuộc và hồ sơ trong địa bàn đó; yêu cầu `wardId` khác phạm vi trả về `403` với `{ "error": "forbidden" }`. Token toàn tỉnh nhận toàn bộ snapshot hoặc một xã/phường theo `wardId`. Tham số `wardId` sai định dạng trả về `400` với `{ "error": "invalid_request", "message": "..." }`.

Trên ứng dụng di động, thực hiện lần lượt: mở mục cấu hình đồng bộ; nhập URL `https://bvanttmanag-etpe9inh.manus.space/api/mobile-sync/v1/personnel`; dán token được cấp; chọn **Kiểm tra kết nối**; xem trước snapshot rồi xác nhận đồng bộ. Không gửi token qua ảnh chụp màn hình hoặc tệp Excel. Khi thay điện thoại hoặc nghi ngờ lộ token, Admin thu hồi token cũ và tạo token mới ngay tại **Cài đặt → Đồng bộ với Web**.

Mỗi yêu cầu snapshot đã xác thực được ghi tại **Cài đặt → Nhật ký đồng bộ Mobile Sync**, gồm thời điểm, nhãn token, địa bàn, số Tổ/hồ sơ nhận được, trạng thái, địa chỉ IP và thông tin thiết bị khi máy chủ nhận được. Nhật ký chỉ hiển thị 100 lượt gần nhất và không bao giờ ghi token gốc.
