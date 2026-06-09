# Requirements Document

## Introduction

Tài liệu này đặc tả yêu cầu cho **Hệ thống Thương mại điện tử bán Voucher giảm giá trực tuyến** (gọi tắt là **Hệ_thống**). Hệ thống đóng vai trò sàn trung gian kết nối **Khách_hàng** với **Đối_tác** cung cấp dịch vụ, hỗ trợ trọn vẹn quy trình: đăng ký đối tác → duyệt đối tác → tạo voucher → duyệt voucher → công bố bán → khách mua → thanh toán mô phỏng → phát hành mã voucher duy nhất → sử dụng/xác thực voucher → ghi nhận báo cáo.

Hệ thống phục vụ ba vai trò chính: **Khách_hàng**, **Đối_tác** (bao gồm **Nhân_viên_đối_tác**) và **Quản_trị_viên**. Tài liệu được biên soạn theo các mẫu EARS và quy tắc chất lượng INCOSE, dựa trên Tài liệu Yêu cầu Nghiệp vụ (BRD phiên bản 1.0).

Phạm vi đồ án mang tính học thuật/demo: thanh toán, OTP, email/SMS và quét QR đều được mô phỏng; hệ thống dùng cơ sở dữ liệu quan hệ và có tối thiểu ba vai trò người dùng.

## Glossary

Bảng thuật ngữ

- **Hệ_thống**: Toàn bộ nền tảng thương mại điện tử bán voucher trực tuyến được mô tả trong tài liệu này.
- **Khách_hàng**: Người dùng cuối đăng ký tài khoản để tìm kiếm, mua và sử dụng voucher.
- **Đối_tác**: Doanh nghiệp đăng ký tài khoản để tạo, bán và xác thực voucher của mình.
- **Nhân_viên_đối_tác**: Người dùng thuộc một Đối_tác, được phân quyền kiểm tra và xác nhận sử dụng voucher tại chi nhánh.
- **Quản_trị_viên**: Người dùng vận hành Hệ_thống với quyền cao nhất, thực hiện kiểm duyệt và giám sát.
- **Voucher**: Phiếu ưu đãi điện tử cho phép Khách_hàng nhận giảm giá hoặc quyền lợi cụ thể khi sử dụng tại Đối_tác. Trong tài liệu, "voucher sản phẩm" là phiên bản chào bán do Đối_tác tạo.
- **Voucher_code**: Mã voucher điện tử duy nhất được phát hành gắn với một đơn hàng hợp lệ, có trạng thái sử dụng riêng biệt.
- **Đơn_hàng**: Bản ghi giao dịch mua một hoặc nhiều voucher của Khách_hàng, bao gồm chi tiết đơn, tổng tiền, trạng thái đơn và trạng thái thanh toán.
- **Giỏ_hàng**: Tập hợp tạm thời các voucher mà Khách_hàng chọn trước khi tạo Đơn_hàng.
- **Chi_nhánh**: Địa điểm vận hành của Đối_tác nơi voucher được áp dụng và xác thực.
- **Thanh_toán_mô_phỏng**: Cơ chế xác nhận thanh toán giả lập không kết nối cổng thanh toán thật.
- **QR_mô_phỏng**: Hình ảnh mã QR hoặc cơ chế nhập mã thủ công thay cho quét QR thật.
- **Nhật_ký_hệ_thống**: Bản ghi lưu vết các thao tác quan trọng phục vụ kiểm tra và truy vết.
- **Nhật_ký_sử_dụng**: Bản ghi lịch sử xác thực và sử dụng của từng Voucher_code.
- **Trạng_thái_voucher_sản_phẩm**: Một trong các giá trị: nháp, chờ duyệt, đã duyệt, từ chối, đang bán, tạm ngưng, ngừng bán.
- **Trạng_thái_voucher_code**: Một trong các giá trị: chưa sử dụng, đã sử dụng, hết hạn, bị hủy, bị khóa.
- **Trạng_thái_đơn_hàng**: Một trong các giá trị: chờ thanh toán, đã thanh toán, đã hủy, đã hoàn tiền.

## Requirements

### Requirement 1: Đăng ký tài khoản Khách hàng

**User Story:** Là một Khách_hàng, tôi muốn đăng ký tài khoản bằng email hoặc số điện thoại, để có thể mua và quản lý voucher.

#### Acceptance Criteria

1. WHEN Khách_hàng gửi yêu cầu đăng ký với email hoặc số điện thoại và mật khẩu hợp lệ, THE Hệ_thống SHALL tạo tài khoản mới với vai trò Khách_hàng.
2. IF email hoặc số điện thoại đăng ký đã tồn tại trong Hệ_thống, THEN THE Hệ_thống SHALL từ chối đăng ký và trả về thông báo trùng lặp.
3. IF mật khẩu đăng ký không đạt độ dài tối thiểu 8 ký tự, THEN THE Hệ_thống SHALL từ chối đăng ký và trả về thông báo lỗi định dạng mật khẩu.
4. WHEN Hệ_thống lưu mật khẩu của tài khoản, THE Hệ_thống SHALL lưu giá trị mật khẩu dưới dạng đã băm (hashed).
5. WHEN Khách_hàng hoàn tất đăng ký, THE Hệ_thống SHALL gửi mã xác thực mô phỏng bằng thông báo trong Hệ_thống.

### Requirement 2: Đăng nhập và quản lý hồ sơ Khách hàng

**User Story:** Là một Khách_hàng, tôi muốn đăng nhập, quản lý mật khẩu và cập nhật hồ sơ, để bảo vệ và duy trì thông tin cá nhân.

#### Acceptance Criteria

1. WHEN Khách_hàng cung cấp thông tin đăng nhập khớp với một tài khoản đang hoạt động, THE Hệ_thống SHALL tạo một phiên làm việc gắn với vai trò Khách_hàng.
2. IF thông tin đăng nhập không khớp với tài khoản nào, THEN THE Hệ_thống SHALL từ chối đăng nhập và trả về thông báo sai thông tin.
3. IF tài khoản đang ở trạng thái bị khóa, THEN THE Hệ_thống SHALL từ chối đăng nhập và trả về thông báo tài khoản bị khóa.
4. WHEN Khách_hàng đã đăng nhập yêu cầu đăng xuất, THE Hệ_thống SHALL kết thúc phiên làm việc hiện tại.
5. WHEN Khách_hàng gửi yêu cầu quên mật khẩu với email hoặc số điện thoại đã đăng ký, THE Hệ_thống SHALL gửi mã đặt lại mật khẩu mô phỏng bằng thông báo trong Hệ_thống.
6. WHEN Khách_hàng đổi mật khẩu với mật khẩu hiện tại chính xác và mật khẩu mới hợp lệ, THE Hệ_thống SHALL cập nhật mật khẩu đã băm của tài khoản.
7. WHEN Khách_hàng gửi yêu cầu cập nhật thông tin cá nhân hợp lệ, THE Hệ_thống SHALL lưu thông tin cá nhân đã cập nhật.

### Requirement 3: Tìm kiếm và lọc voucher

**User Story:** Là một Khách_hàng, tôi muốn tìm kiếm và lọc voucher, để nhanh chóng tìm được ưu đãi phù hợp.

#### Acceptance Criteria

1. WHEN Khách_hàng tìm kiếm theo từ khóa, THE Hệ_thống SHALL trả về danh sách voucher có tên hoặc mô tả khớp với từ khóa và đang ở Trạng_thái_voucher_sản_phẩm đang bán.
2. WHEN Khách_hàng áp dụng bộ lọc theo danh mục, khu vực, giá, mức giảm, Đối_tác hoặc trạng thái hiệu lực, THE Hệ_thống SHALL trả về danh sách voucher thỏa mãn tất cả tiêu chí lọc đã chọn.
3. THE Hệ_thống SHALL chỉ hiển thị cho Khách_hàng các voucher có Trạng_thái_voucher_sản_phẩm là đang bán.
4. IF không có voucher nào thỏa mãn tiêu chí tìm kiếm hoặc lọc, THEN THE Hệ_thống SHALL trả về danh sách rỗng kèm thông báo không có kết quả.

### Requirement 4: Xem chi tiết voucher

**User Story:** Là một Khách_hàng, tôi muốn xem chi tiết voucher, để hiểu rõ điều kiện trước khi mua.

#### Acceptance Criteria

1. WHEN Khách_hàng mở chi tiết một voucher đang bán, THE Hệ_thống SHALL hiển thị tên voucher, ảnh, giá gốc, giá bán, điều kiện áp dụng, thời gian sử dụng, số lượng còn lại, danh sách Chi_nhánh áp dụng và chính sách hoàn hủy.
2. WHILE số lượng còn lại của voucher bằng 0, THE Hệ_thống SHALL hiển thị trạng thái hết hàng và vô hiệu hóa thao tác thêm vào Giỏ_hàng cho voucher đó.

### Requirement 5: Quản lý giỏ hàng

**User Story:** Là một Khách_hàng, tôi muốn quản lý giỏ hàng, để chuẩn bị các voucher cần mua.

#### Acceptance Criteria

1. WHEN Khách_hàng thêm một voucher đang bán vào Giỏ_hàng, THE Hệ_thống SHALL thêm voucher đó vào Giỏ_hàng của Khách_hàng kèm số lượng đã chọn.
2. WHEN Khách_hàng cập nhật số lượng của một mục trong Giỏ_hàng thành một số nguyên dương, THE Hệ_thống SHALL cập nhật số lượng của mục đó.
3. WHEN Khách_hàng xóa một mục khỏi Giỏ_hàng, THE Hệ_thống SHALL loại bỏ mục đó khỏi Giỏ_hàng.
4. THE Hệ_thống SHALL hiển thị tổng tiền tạm tính bằng tổng của giá bán nhân số lượng cho tất cả các mục trong Giỏ_hàng.
5. IF số lượng yêu cầu của một mục vượt quá số lượng còn lại của voucher, THEN THE Hệ_thống SHALL từ chối cập nhật và trả về thông báo vượt quá tồn kho.

### Requirement 6: Tạo đơn hàng

**User Story:** Là một Khách_hàng, tôi muốn tạo đơn hàng từ giỏ hàng, để tiến hành mua voucher cho bản thân hoặc tặng người khác.

#### Acceptance Criteria

1. WHEN Khách_hàng tạo Đơn_hàng từ Giỏ_hàng có ít nhất một mục, THE Hệ_thống SHALL tạo Đơn_hàng với Trạng_thái_đơn_hàng chờ thanh toán và tổng tiền bằng tổng tạm tính của các mục.
2. WHERE Khách_hàng chọn mua làm quà tặng, THE Hệ_thống SHALL lưu thông tin người nhận quà tặng cùng Đơn_hàng.
3. WHEN Khách_hàng tạo Đơn_hàng, THE Hệ_thống SHALL ghi nhận phương thức Thanh_toán_mô_phỏng được chọn cho Đơn_hàng.
4. IF Giỏ_hàng rỗng, THEN THE Hệ_thống SHALL từ chối tạo Đơn_hàng và trả về thông báo giỏ hàng rỗng.
5. WHEN Khách_hàng tạo Đơn_hàng, THE Hệ_thống SHALL kiểm tra tồn kho của từng voucher trong Đơn_hàng và IF số lượng đặt mua của bất kỳ voucher nào vượt quá số lượng còn lại, THEN THE Hệ_thống SHALL từ chối tạo Đơn_hàng và trả về thông báo vượt quá tồn kho.

### Requirement 7: Thanh toán mô phỏng và phát hành voucher code

**User Story:** Là một Khách_hàng, tôi muốn thanh toán đơn hàng và nhận mã voucher, để có thể sử dụng ưu đãi đã mua.

#### Acceptance Criteria

1. WHEN một Đơn_hàng ở trạng thái chờ thanh toán được Thanh_toán_mô_phỏng thành công, THE Hệ_thống SHALL chuyển Trạng_thái_đơn_hàng sang đã thanh toán.
2. WHEN Trạng_thái_đơn_hàng chuyển sang đã thanh toán, THE Hệ_thống SHALL phát hành một Voucher_code cho mỗi đơn vị voucher trong Đơn_hàng.
3. THE Hệ_thống SHALL bảo đảm mỗi Voucher_code được phát hành là duy nhất trong toàn Hệ_thống.
4. THE Hệ_thống SHALL sinh Voucher_code dưới dạng khó đoán bằng giá trị ngẫu nhiên có độ dài tối thiểu 12 ký tự.
5. WHEN Hệ_thống phát hành một Voucher_code, THE Hệ_thống SHALL khởi tạo Voucher_code đó với Trạng_thái_voucher_code chưa sử dụng, ngày phát hành và ngày hết hạn theo thời gian sử dụng của voucher.
6. WHEN Trạng_thái_đơn_hàng chuyển sang đã thanh toán, THE Hệ_thống SHALL giảm số lượng còn lại của mỗi voucher tương ứng với số lượng đã mua.
7. IF Thanh_toán_mô_phỏng thất bại, THEN THE Hệ_thống SHALL giữ Trạng_thái_đơn_hàng chờ thanh toán và không phát hành Voucher_code.
8. THE Hệ_thống SHALL không hiển thị giá trị Voucher_code cho bất kỳ người dùng nào trước khi Đơn_hàng liên quan ở trạng thái đã thanh toán.

### Requirement 8: Nhận voucher đã mua và lịch sử đơn hàng

**User Story:** Là một Khách_hàng, tôi muốn xem voucher đã mua và lịch sử đơn hàng, để theo dõi và sử dụng ưu đãi.

#### Acceptance Criteria

1. WHEN Khách_hàng mở một Đơn_hàng đã thanh toán của mình, THE Hệ_thống SHALL hiển thị Voucher_code, QR_mô_phỏng và Trạng_thái_voucher_code cho từng voucher đã phát hành.
2. THE Hệ_thống SHALL hiển thị cho Khách_hàng danh sách các Đơn_hàng của chính Khách_hàng đó kèm Trạng_thái_đơn_hàng.
3. THE Hệ_thống SHALL chỉ cho phép Khách_hàng xem Voucher_code thuộc các Đơn_hàng của chính Khách_hàng đó.

### Requirement 9: Đánh giá và phản hồi

**User Story:** Là một Khách_hàng, tôi muốn đánh giá và phản hồi về voucher, để chia sẻ trải nghiệm và gửi khiếu nại.

#### Acceptance Criteria

1. WHERE Khách_hàng đã mua hoặc đã sử dụng một voucher, THE Hệ_thống SHALL cho phép Khách_hàng gửi đánh giá gồm điểm sao và nhận xét cho voucher đó.
2. IF Khách_hàng chưa mua hoặc chưa sử dụng voucher, THEN THE Hệ_thống SHALL từ chối gửi đánh giá và trả về thông báo chưa đủ điều kiện đánh giá.
3. WHEN Khách_hàng gửi điểm đánh giá, THE Hệ_thống SHALL chấp nhận điểm trong khoảng từ 1 đến 5 sao.
4. WHEN Khách_hàng gửi phản hồi hoặc khiếu nại hợp lệ, THE Hệ_thống SHALL lưu phản hồi kèm liên kết tới voucher hoặc Đơn_hàng liên quan.

### Requirement 10: Đăng ký và quản lý hồ sơ Đối tác

**User Story:** Là một Đối_tác, tôi muốn đăng ký tài khoản doanh nghiệp và quản lý hồ sơ, để có thể bán voucher trên Hệ_thống.

#### Acceptance Criteria

1. WHEN một doanh nghiệp gửi yêu cầu đăng ký Đối_tác với thông tin pháp lý và người đại diện hợp lệ, THE Hệ_thống SHALL tạo hồ sơ Đối_tác với trạng thái phê duyệt chờ duyệt.
2. WHILE hồ sơ Đối_tác ở trạng thái chờ duyệt, THE Hệ_thống SHALL không cho phép Đối_tác đó công bố bán voucher.
3. WHEN Đối_tác gửi yêu cầu cập nhật thông tin pháp lý hoặc người đại diện hợp lệ, THE Hệ_thống SHALL lưu thông tin hồ sơ đã cập nhật.
4. WHEN Đối_tác thêm, cập nhật hoặc xóa một Chi_nhánh hợp lệ, THE Hệ_thống SHALL cập nhật danh sách Chi_nhánh của Đối_tác.
5. IF thông tin pháp lý bắt buộc bị thiếu, THEN THE Hệ_thống SHALL từ chối đăng ký Đối_tác và trả về thông báo thiếu thông tin bắt buộc.

### Requirement 11: Tạo và quản lý voucher của Đối tác

**User Story:** Là một Đối_tác, tôi muốn tạo và quản lý voucher, để chào bán ưu đãi của mình.

#### Acceptance Criteria

1. WHERE hồ sơ Đối_tác đã được duyệt, THE Hệ_thống SHALL cho phép Đối_tác tạo voucher mới với giá gốc, giá bán, mô tả, thời gian bán, thời gian sử dụng, Chi_nhánh áp dụng và số lượng phát hành.
2. WHEN Đối_tác tạo voucher mới, THE Hệ_thống SHALL khởi tạo voucher đó với Trạng_thái_voucher_sản_phẩm nháp.
3. IF giá bán lớn hơn hoặc bằng giá gốc, THEN THE Hệ_thống SHALL từ chối lưu voucher và trả về thông báo giá bán phải nhỏ hơn giá gốc.
4. IF voucher thiếu thời gian bán hoặc thời gian sử dụng, THEN THE Hệ_thống SHALL từ chối lưu voucher và trả về thông báo thiếu thông tin thời gian.
5. WHILE voucher ở Trạng_thái_voucher_sản_phẩm nháp hoặc từ chối, THE Hệ_thống SHALL cho phép Đối_tác cập nhật thông tin voucher đó.
6. THE Hệ_thống SHALL hiển thị cho Đối_tác số lượng đã bán, số lượng đã sử dụng và số lượng hết hạn của mỗi voucher thuộc Đối_tác đó.
7. THE Hệ_thống SHALL chỉ cho phép Đối_tác quản lý các voucher thuộc chính Đối_tác đó.

### Requirement 12: Gửi duyệt voucher

**User Story:** Là một Đối_tác, tôi muốn gửi voucher đi duyệt, để được công bố bán sau khi Quản_trị_viên phê duyệt.

#### Acceptance Criteria

1. WHEN Đối_tác gửi duyệt một voucher ở Trạng_thái_voucher_sản_phẩm nháp hoặc từ chối, THE Hệ_thống SHALL chuyển Trạng_thái_voucher_sản_phẩm sang chờ duyệt.
2. THE Hệ_thống SHALL hiển thị cho Đối_tác kết quả phê duyệt của mỗi voucher đã gửi duyệt.
3. IF voucher có giá bán không nhỏ hơn giá gốc hoặc thiếu thời gian bán hoặc thời gian sử dụng, THEN THE Hệ_thống SHALL từ chối chuyển sang chờ duyệt và trả về thông báo lỗi tương ứng.

### Requirement 13: Kiểm tra voucher code

**User Story:** Là một Đối_tác hoặc Nhân_viên_đối_tác, tôi muốn kiểm tra voucher code, để xác minh tính hợp lệ trước khi phục vụ.

#### Acceptance Criteria

1. WHEN Đối_tác hoặc Nhân_viên_đối_tác nhập một Voucher_code hoặc quét QR_mô_phỏng, THE Hệ_thống SHALL hiển thị Trạng_thái_voucher_code và thông tin voucher liên quan.
2. IF Voucher_code không tồn tại, THEN THE Hệ_thống SHALL trả về thông báo mã không hợp lệ.
3. IF Voucher_code thuộc voucher của một Đối_tác khác với Đối_tác đang kiểm tra, THEN THE Hệ_thống SHALL từ chối hiển thị thông tin và trả về thông báo ngoài phạm vi.
4. WHEN Hệ_thống đánh giá tính hợp lệ của một Voucher_code, THE Hệ_thống SHALL xác định mã là hợp lệ để sử dụng chỉ khi Trạng_thái_voucher_code là chưa sử dụng và mã chưa quá ngày hết hạn.

### Requirement 14: Xác nhận sử dụng voucher

**User Story:** Là một Đối_tác hoặc Nhân_viên_đối_tác, tôi muốn xác nhận sử dụng voucher, để ghi nhận đã phục vụ và ngăn dùng lại.

#### Acceptance Criteria

1. WHEN Đối_tác hoặc Nhân_viên_đối_tác xác nhận sử dụng một Voucher_code hợp lệ thuộc phạm vi Chi_nhánh hoặc chương trình của mình, THE Hệ_thống SHALL chuyển Trạng_thái_voucher_code sang đã sử dụng và ghi một bản ghi vào Nhật_ký_sử_dụng.
2. IF Voucher_code đã ở trạng thái đã sử dụng và không thuộc loại nhiều lượt sử dụng, THEN THE Hệ_thống SHALL từ chối xác nhận và trả về thông báo mã đã được sử dụng.
3. IF Voucher_code ở trạng thái hết hạn, bị hủy hoặc bị khóa, THEN THE Hệ_thống SHALL từ chối xác nhận và trả về thông báo mã không sử dụng được.
4. IF Voucher_code thuộc phạm vi Chi_nhánh hoặc chương trình của Đối_tác khác, THEN THE Hệ_thống SHALL từ chối xác nhận và trả về thông báo ngoài phạm vi.
5. WHERE voucher được thiết kế nhiều lượt sử dụng và số lượt còn lại lớn hơn 0, THE Hệ_thống SHALL ghi một bản ghi Nhật_ký_sử_dụng và giảm số lượt còn lại đi 1 mà không chuyển Trạng_thái_voucher_code sang đã sử dụng cho đến khi số lượt còn lại bằng 0.

### Requirement 15: Báo cáo Đối tác

**User Story:** Là một Đối_tác, tôi muốn xem báo cáo, để đánh giá hiệu quả các chương trình voucher.

#### Acceptance Criteria

1. WHEN Đối_tác mở báo cáo, THE Hệ_thống SHALL hiển thị doanh thu, số lượng phát hành, số lượng đã bán và tỷ lệ sử dụng theo từng voucher thuộc Đối_tác đó.
2. THE Hệ_thống SHALL chỉ tổng hợp dữ liệu báo cáo từ các voucher và Đơn_hàng thuộc phạm vi của Đối_tác đang xem.

### Requirement 16: Quản lý người dùng (Quản trị viên)

**User Story:** Là một Quản_trị_viên, tôi muốn quản lý người dùng, để kiểm soát truy cập và phân quyền.

#### Acceptance Criteria

1. WHEN Quản_trị_viên tra cứu người dùng theo tiêu chí, THE Hệ_thống SHALL trả về danh sách tài khoản thỏa mãn tiêu chí kèm vai trò và trạng thái tài khoản.
2. WHEN Quản_trị_viên khóa một tài khoản, THE Hệ_thống SHALL chuyển tài khoản sang trạng thái bị khóa.
3. WHEN Quản_trị_viên mở khóa một tài khoản đang bị khóa, THE Hệ_thống SHALL chuyển tài khoản sang trạng thái hoạt động.
4. WHEN Quản_trị_viên thay đổi vai trò của một tài khoản, THE Hệ_thống SHALL cập nhật vai trò của tài khoản đó.
5. THE Hệ_thống SHALL chỉ cho phép người dùng có vai trò Quản_trị_viên truy cập các chức năng quản lý người dùng.

### Requirement 17: Quản lý Đối tác (Quản trị viên)

**User Story:** Là một Quản_trị_viên, tôi muốn duyệt và quản lý Đối tác, để bảo đảm chỉ đối tác hợp lệ được vận hành.

#### Acceptance Criteria

1. WHEN Quản_trị_viên duyệt một hồ sơ Đối_tác ở trạng thái chờ duyệt, THE Hệ_thống SHALL chuyển trạng thái phê duyệt của Đối_tác sang đã duyệt.
2. WHEN Quản_trị_viên từ chối một hồ sơ Đối_tác ở trạng thái chờ duyệt, THE Hệ_thống SHALL chuyển trạng thái phê duyệt của Đối_tác sang từ chối kèm lý do.
3. WHEN Quản_trị_viên khóa một Đối_tác, THE Hệ_thống SHALL chuyển Đối_tác sang trạng thái bị khóa và dừng công bố bán các voucher của Đối_tác đó.
4. WHEN Quản_trị_viên mở khóa một Đối_tác đang bị khóa, THE Hệ_thống SHALL chuyển Đối_tác sang trạng thái hoạt động.
5. WHEN Quản_trị_viên cập nhật danh sách Chi_nhánh của một Đối_tác, THE Hệ_thống SHALL lưu danh sách Chi_nhánh đã cập nhật.

### Requirement 18: Duyệt voucher (Quản trị viên)

**User Story:** Là một Quản_trị_viên, tôi muốn duyệt voucher, để kiểm soát chất lượng và vòng đời voucher trước khi bán.

#### Acceptance Criteria

1. WHEN Quản_trị_viên duyệt một voucher ở Trạng_thái_voucher_sản_phẩm chờ duyệt, THE Hệ_thống SHALL chuyển Trạng_thái_voucher_sản_phẩm sang đã duyệt.
2. WHEN Quản_trị_viên từ chối một voucher ở Trạng_thái_voucher_sản_phẩm chờ duyệt, THE Hệ_thống SHALL chuyển Trạng_thái_voucher_sản_phẩm sang từ chối kèm lý do.
3. WHEN Quản_trị_viên công bố bán một voucher ở Trạng_thái_voucher_sản_phẩm đã duyệt, THE Hệ_thống SHALL chuyển Trạng_thái_voucher_sản_phẩm sang đang bán.
4. WHEN Quản_trị_viên tạm ngưng một voucher đang bán, THE Hệ_thống SHALL chuyển Trạng_thái_voucher_sản_phẩm sang tạm ngưng và ẩn voucher khỏi danh sách bán.
5. THE Hệ_thống SHALL chỉ cho phép một voucher chuyển sang đang bán khi Trạng_thái_voucher_sản_phẩm của voucher đó là đã duyệt.

### Requirement 19: Quản lý đơn hàng (Quản trị viên)

**User Story:** Là một Quản_trị_viên, tôi muốn quản lý đơn hàng, để xử lý thanh toán, hủy đơn và hoàn tiền mô phỏng.

#### Acceptance Criteria

1. WHEN Quản_trị_viên tra cứu Đơn_hàng theo tiêu chí, THE Hệ_thống SHALL trả về danh sách Đơn_hàng thỏa mãn tiêu chí kèm Trạng_thái_đơn_hàng và trạng thái thanh toán.
2. WHEN Quản_trị_viên hủy một Đơn_hàng ở trạng thái chờ thanh toán, THE Hệ_thống SHALL chuyển Trạng_thái_đơn_hàng sang đã hủy và không phát hành Voucher_code cho Đơn_hàng đó.
3. WHEN Quản_trị_viên thực hiện hoàn tiền mô phỏng cho một Đơn_hàng đã thanh toán theo chính sách áp dụng, THE Hệ_thống SHALL chuyển Trạng_thái_đơn_hàng sang đã hoàn tiền và chuyển các Voucher_code liên quan sang trạng thái bị hủy.
4. WHEN một Đơn_hàng chuyển sang đã hủy hoặc đã hoàn tiền, THE Hệ_thống SHALL hoàn trả số lượng voucher tương ứng vào số lượng còn lại.

### Requirement 20: Quản lý nội dung (Quản trị viên)

**User Story:** Là một Quản_trị_viên, tôi muốn quản lý nội dung, để vận hành danh mục, banner, bài viết, popup và chính sách.

#### Acceptance Criteria

1. WHEN Quản_trị_viên tạo, cập nhật hoặc xóa một danh mục, banner, bài viết, popup hoặc nội dung chính sách hợp lệ, THE Hệ_thống SHALL lưu nội dung đã thay đổi.
2. THE Hệ_thống SHALL chỉ cho phép người dùng có vai trò Quản_trị_viên truy cập các chức năng quản lý nội dung.

### Requirement 21: Dashboard quản trị và báo cáo

**User Story:** Là một Quản_trị_viên, tôi muốn xem dashboard tổng quan, để giám sát hoạt động và hiệu quả của Hệ_thống.

#### Acceptance Criteria

1. WHEN Quản_trị_viên mở dashboard, THE Hệ_thống SHALL hiển thị tổng số người dùng, số Đối_tác, số voucher, số Đơn_hàng, doanh thu và số voucher đã sử dụng.
2. THE Hệ_thống SHALL tổng hợp các chỉ số dashboard từ toàn bộ dữ liệu giao dịch của Hệ_thống.

### Requirement 22: Nhật ký hệ thống và kiểm toán

**User Story:** Là một Quản_trị_viên, tôi muốn tra cứu nhật ký hệ thống, để kiểm tra và truy vết các thao tác quan trọng.

#### Acceptance Criteria

1. WHEN một thao tác quản trị quan trọng được thực hiện, bao gồm duyệt Đối_tác, duyệt voucher, khóa tài khoản, hủy đơn hoặc hoàn tiền, THE Hệ_thống SHALL ghi một bản ghi vào Nhật_ký_hệ_thống kèm người thực hiện, hành động và thời điểm.
2. WHEN Quản_trị_viên tra cứu Nhật_ký_hệ_thống theo tiêu chí, THE Hệ_thống SHALL trả về danh sách bản ghi thỏa mãn tiêu chí.
3. THE Hệ_thống SHALL chỉ cho phép người dùng có vai trò Quản_trị_viên truy cập Nhật_ký_hệ_thống.

### Requirement 23: Kiểm soát truy cập theo vai trò

**User Story:** Là chủ sở hữu Hệ_thống, tôi muốn kiểm soát truy cập theo vai trò, để bảo vệ dữ liệu và chức năng nhạy cảm.

#### Acceptance Criteria

1. WHEN một người dùng yêu cầu một chức năng, THE Hệ_thống SHALL cho phép thực hiện chỉ khi vai trò của người dùng được phân quyền cho chức năng đó.
2. IF một người dùng yêu cầu một chức năng ngoài phạm vi vai trò của mình, THEN THE Hệ_thống SHALL từ chối yêu cầu và trả về thông báo không đủ quyền.
3. WHEN một người dùng chưa đăng nhập yêu cầu một chức năng cần xác thực, THE Hệ_thống SHALL từ chối yêu cầu và chuyển hướng tới đăng nhập.

### Requirement 24: Yêu cầu phi chức năng

**User Story:** Là chủ sở hữu Hệ_thống, tôi muốn các yêu cầu phi chức năng được bảo đảm, để Hệ_thống an toàn, ổn định và dễ dùng.

#### Acceptance Criteria

1. WHEN Khách_hàng thực hiện tra cứu voucher hoặc Đơn_hàng trong môi trường demo, THE Hệ_thống SHALL trả về kết quả trong vòng 3 giây.
2. THE Hệ_thống SHALL lưu trữ toàn bộ dữ liệu nghiệp vụ trong một cơ sở dữ liệu quan hệ.
3. IF một lỗi xử lý xảy ra trong một thao tác, THEN THE Hệ_thống SHALL ghi nhận lỗi và trả về thông báo lỗi mà không làm mất dữ liệu nghiệp vụ đã lưu.
4. THE Hệ_thống SHALL hiển thị giao diện đáp ứng (responsive) trên cả thiết bị máy tính và thiết bị di động.
5. THE Hệ_thống SHALL hỗ trợ tối thiểu ba vai trò người dùng: Khách_hàng, Đối_tác và Quản_trị_viên.
