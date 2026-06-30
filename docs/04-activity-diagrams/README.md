# Activity Diagrams

> Mỗi FLOW-XXX (định nghĩa trong `docs/02-srs/`) có một sơ đồ hoạt động (Mermaid `flowchart TD`) thể hiện nhánh quyết định và đường lỗi — không chỉ happy path.

## FLOW-001 — Đăng ký & đăng nhập Khách hàng

```mermaid
flowchart TD
    start([Bắt đầu]) --> reg[/Nhập định danh + mật khẩu/]
    reg --> dup{Định danh đã tồn tại?}
    dup -->|Có| eDup[Báo trùng lặp] --> reg
    dup -->|Không| len{Mật khẩu ≥ 8 ký tự?}
    len -->|Không| eLen[Báo lỗi định dạng] --> reg
    len -->|Có| hash[Băm mật khẩu + tạo tài khoản Khách_hàng]
    hash --> otp[Gửi mã xác thực mô phỏng in-app]
    otp --> login[/Đăng nhập/]
    login --> lock{Tài khoản bị khóa?}
    lock -->|Có| eLock[Từ chối: tài khoản bị khóa] --> done
    lock -->|Không| match{Thông tin khớp?}
    match -->|Không| eMatch[Từ chối: sai thông tin] --> login
    match -->|Có| sess[Tạo phiên gắn vai trò Khách_hàng]
    sess --> done([Kết thúc])
```

## FLOW-002 — Tìm kiếm → xem chi tiết voucher

```mermaid
flowchart TD
    start([Bắt đầu]) --> input[/Nhập từ khóa + bộ lọc/]
    input --> query[Truy vấn voucher trạng thái đang bán, thỏa AND mọi tiêu chí]
    query --> empty{Có kết quả?}
    empty -->|Không| eEmpty[Danh sách rỗng + thông báo không có kết quả] --> input
    empty -->|Có| list[Hiển thị danh sách voucher đang bán]
    list --> open[/Mở chi tiết một voucher/]
    open --> detail[Hiển thị tên, ảnh, giá gốc/bán, điều kiện, thời gian, số còn lại, chi nhánh, chính sách hoàn hủy]
    detail --> stock{Số lượng còn lại = 0?}
    stock -->|Có| soldout[Hiển thị hết hàng + vô hiệu hóa Thêm vào giỏ] --> done
    stock -->|Không| addable[Cho phép Thêm vào giỏ]
    addable --> done([Kết thúc])
```

## FLOW-003 — Giỏ hàng → đặt đơn → thanh toán → nhận mã (lõi)

```mermaid
flowchart TD
    start([Bắt đầu]) --> add[/Thêm voucher vào giỏ/]
    add --> qty{Số lượng ≤ tồn kho?}
    qty -->|Không| eQty[Từ chối: vượt tồn kho] --> add
    qty -->|Có| subtotal[Tính tạm tính = Σ giá bán × số lượng]
    subtotal --> place[/Tạo đơn từ giỏ/]
    place --> empty{Giỏ rỗng?}
    empty -->|Có| eEmpty[Từ chối: giỏ rỗng] --> add
    empty -->|Không| check{Mọi mục còn đủ tồn kho?}
    check -->|Không| eStock[Từ chối: vượt tồn kho] --> add
    check -->|Có| order[Tạo đơn trạng thái chờ thanh toán, tổng = tạm tính]
    order --> pay[/Thanh toán mô phỏng/]
    pay --> ok{Thanh toán thành công?}
    ok -->|Không| fail[Giữ chờ thanh toán, KHÔNG phát hành mã] --> done
    ok -->|Có| tx[/BẮT ĐẦU transaction/]
    tx --> relock[Khóa + re-check tồn kho]
    relock --> still{Còn đủ tồn kho?}
    still -->|Không| rollback[ROLLBACK: từ chối] --> done
    still -->|Có| deduct[Trừ tồn kho]
    deduct --> paid[Đơn → đã thanh toán]
    paid --> issue[Phát hành N mã duy nhất CSPRNG ≥12, chua_su_dung, set issued_at/expires_at]
    issue --> commit[/COMMIT/]
    commit --> show[Hiển thị mã + QR mô phỏng cho khách]
    show --> done([Kết thúc])
```

## FLOW-004 — Đánh giá voucher đã mua/dùng

```mermaid
flowchart TD
    start([Bắt đầu]) --> pick[/Chọn voucher để đánh giá/]
    pick --> elig{Đã mua hoặc đã dùng?}
    elig -->|Không| eElig[Từ chối: chưa đủ điều kiện đánh giá] --> done
    elig -->|Có| form[/Nhập điểm sao + nhận xét/]
    form --> range{Điểm trong 1..5?}
    range -->|Không| eRange[Báo lỗi điểm ngoài khoảng] --> form
    range -->|Có| save[Lưu đánh giá kèm liên kết voucher/đơn]
    save --> done([Kết thúc])
```

## FLOW-005 — Đăng ký Đối tác → Admin duyệt

```mermaid
flowchart TD
    start([Bắt đầu]) --> reg[/Đối tác nhập thông tin pháp lý + người đại diện/]
    reg --> req{Đủ thông tin bắt buộc?}
    req -->|Không| eReq[Từ chối: thiếu thông tin bắt buộc] --> reg
    req -->|Có| pending[Tạo hồ sơ Đối tác trạng thái chờ duyệt]
    pending --> review[/Admin xem hồ sơ chờ duyệt/]
    review --> decide{Duyệt?}
    decide -->|Từ chối| reject[Hồ sơ → từ chối + lý do]
    reject --> audit1[Ghi nhật ký hệ thống] --> done
    decide -->|Duyệt| approve[Hồ sơ → đã duyệt: được phép công bố bán]
    approve --> audit2[Ghi nhật ký hệ thống]
    audit2 --> done([Kết thúc])
```

## FLOW-006 — Tạo voucher → gửi duyệt → duyệt → công bố

```mermaid
flowchart TD
    start([Bắt đầu]) --> guard{Hồ sơ đối tác đã duyệt?}
    guard -->|Không| eGuard[Không cho tạo voucher] --> done
    guard -->|Có| create[/Tạo voucher: giá, thời gian, chi nhánh, số lượng/]
    create --> price{Giá bán < giá gốc?}
    price -->|Không| ePrice[Từ chối: giá bán phải nhỏ hơn giá gốc] --> create
    price -->|Có| time{Có đủ thời gian bán + sử dụng?}
    time -->|Không| eTime[Từ chối: thiếu thông tin thời gian] --> create
    time -->|Có| draft[Voucher trạng thái nháp]
    draft --> submit[/Gửi duyệt/]
    submit --> pending[Voucher → chờ duyệt]
    pending --> admin[/Admin duyệt/]
    admin --> decide{Duyệt?}
    decide -->|Từ chối| reject[Voucher → từ chối + lý do]
    reject --> redraft[Voucher → nháp: đối tác sửa thoải mái, lưu nháp nhiều lần]
    redraft --> submit
    decide -->|Duyệt| approved[Voucher → đã duyệt]
    approved --> revoke{Admin phát hiện sai sót?}
    revoke -->|Có| revReject[Thu hồi duyệt: Voucher → từ chối + lý do] --> redraft
    revoke -->|Không| publish[Admin công bố → đang bán]
    publish --> done([Kết thúc])
```

## FLOW-007 — Kiểm tra → xác nhận sử dụng voucher

```mermaid
flowchart TD
    start([Bắt đầu]) --> scan[/Nhập mã hoặc quét QR mô phỏng/]
    scan --> exist{Mã tồn tại?}
    exist -->|Không| eExist[Mã không hợp lệ] --> done
    exist -->|Có| scope{Thuộc phạm vi đối tác/chi nhánh?}
    scope -->|Không| eScope[Từ chối: ngoài phạm vi] --> done
    scope -->|Có| valid{chua_su_dung và chưa quá hạn?}
    valid -->|Không| eValid[Từ chối: đã dùng / hết hạn / bị hủy / bị khóa] --> done
    valid -->|Có| confirm[/Xác nhận sử dụng/]
    confirm --> tx[/BẮT ĐẦU transaction/]
    tx --> multi{Voucher nhiều lượt và còn lượt > 0?}
    multi -->|Có| dec[Giảm số lượt còn lại 1 + ghi Nhật_ký_sử_dụng]
    dec --> zero{Lượt còn lại = 0?}
    zero -->|Không| commit1[/COMMIT: giữ chua_su_dung/] --> done
    zero -->|Có| used1[Mã → đã sử dụng]
    multi -->|Không| used2[Mã → đã sử dụng + ghi Nhật_ký_sử_dụng]
    used1 --> commit2[/COMMIT/]
    used2 --> commit2
    commit2 --> done([Kết thúc])
```

## FLOW-008 — Xem báo cáo Đối tác

```mermaid
flowchart TD
    start([Bắt đầu]) --> open[/Đối tác mở báo cáo/]
    open --> scope[Giới hạn dữ liệu trong phạm vi đối tác đang xem]
    scope --> agg[Tổng hợp doanh thu, số phát hành, số đã bán, tỷ lệ sử dụng theo từng voucher]
    agg --> show[Hiển thị báo cáo]
    show --> done([Kết thúc])
```

## FLOW-009 — Quản lý & phân quyền người dùng

```mermaid
flowchart TD
    start([Bắt đầu]) --> search[/Admin tra cứu người dùng theo tiêu chí/]
    search --> list[Danh sách tài khoản + vai trò + trạng thái]
    list --> action{Hành động?}
    action -->|Khóa| lock[Tài khoản → bị khóa]
    action -->|Mở khóa| unlock[Tài khoản → hoạt động]
    action -->|Đổi vai trò| role[Cập nhật vai trò]
    lock --> audit[Ghi nhật ký hệ thống]
    unlock --> audit
    role --> audit
    audit --> done([Kết thúc])
```

## FLOW-010 — Hủy / hoàn tiền đơn hàng

```mermaid
flowchart TD
    start([Bắt đầu]) --> search[/Admin tra cứu đơn hàng/]
    search --> state{Trạng thái đơn?}
    state -->|chờ thanh toán| cancel[Đơn → đã hủy, không phát hành mã]
    state -->|đã thanh toán| refund[Đơn → đã hoàn tiền + mã liên quan → bị hủy]
    cancel --> restore[Hoàn trả tồn kho]
    refund --> restore
    restore --> audit[Ghi nhật ký hệ thống]
    audit --> done([Kết thúc])
```

## FLOW-011 — Quản lý nội dung & xem dashboard

```mermaid
flowchart TD
    start([Bắt đầu]) --> branch{Tác vụ?}
    branch -->|Nội dung| crud[/CRUD danh mục, banner, bài viết, popup, chính sách/]
    crud --> valid{Hợp lệ?}
    valid -->|Không| eValid[Báo lỗi] --> crud
    valid -->|Có| save[Lưu nội dung] --> done
    branch -->|Dashboard| dash[Mở dashboard]
    dash --> agg[Tổng hợp toàn hệ thống: người dùng, đối tác, voucher, đơn, doanh thu, voucher đã dùng]
    agg --> show[Hiển thị dashboard]
    show --> done([Kết thúc])
```

## FLOW-012 — Ghi & tra cứu nhật ký hệ thống

```mermaid
flowchart TD
    start([Bắt đầu]) --> op{Thao tác quản trị quan trọng?}
    op -->|Có| write[Tự động ghi Nhật_ký_hệ_thống: người, hành động, thời điểm]
    op -->|Không| skip[Không ghi]
    write --> lookup[/Admin tra cứu nhật ký theo tiêu chí/]
    skip --> lookup
    lookup --> result[Trả danh sách bản ghi thỏa tiêu chí]
    result --> done([Kết thúc])
```
