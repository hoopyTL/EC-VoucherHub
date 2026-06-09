# Dev Workflow — EC-VoucherHub

Quy ước làm việc cho dự án. Áp dụng cho mọi phiên. Khi người dùng yêu cầu
"làm task X", "implement", "fix" thì bám theo tài liệu này.

## Nguồn sự thật (phân làn rõ ràng)

| Lớp | Vai trò |
| --- | --- |
| `.kiro/specs/voucher-ecommerce-platform/` | WHAT/HOW: requirements, design, **tasks.md là kế hoạch thi công duy nhất** |
| `.claude/project.json` | Nguồn lệnh chuẩn (build/test/lint/ci/dev/e2e). Mọi nơi đọc lệnh từ đây |
| `.agents/` (AG Kit) | Kiến thức chuyên môn (agent + skill) + script audit `.py` |
| `.claude/` (Claude Code) | Hook an toàn, `/git` test-gate, `/memory`, rules code-style/testing/api |
| `memory/` | STATE: `active.md`, `decisions.md`, `progress.md`, `plan.md` |
| `docs/` | DELIVERABLES: `01-brd` → `10-demo-script` |
| `.github/` | CI gác cổng + PR/Issue template |

Không duy trì hai danh sách task song song: `tasks.md` là gốc; `memory/plan.md`
chỉ ghi trạng thái/quyết định mức cao.

## Lệnh chuẩn (đọc từ `.claude/project.json`)

- Install: `npm ci`
- Build: `npm run build`
- Test: `npm test`
- Typecheck: `npm run typecheck --workspaces --if-present`
- CI (local): `npm run typecheck --workspaces --if-present && npm run build && npm test`
- Dev: `npm run dev`
- E2E: `npm run test:e2e`
- Audit nhanh: `python .agents/scripts/checklist.py .`
- Audit đầy đủ (trước deploy): `python .agents/scripts/verify_all.py . --url http://localhost:3000`

## Vòng lặp cho mỗi task

1. **Chọn task theo đúng thứ tự wave** trong phần "Task Dependency Graph" của `tasks.md`.
2. **Tạo nhánh** (convention `.agents/memory/project-conventions.md`):
   `feature/<task-slug>` hoặc `fix/<bug-slug>`.
3. **Nạp chuyên môn trước khi code**: chọn agent/skill phù hợp với domain:
   - Backend/API/Express → `@backend-specialist` + skill `api-patterns`, `nodejs-best-practices`
   - Prisma/schema → `@database-architect` + skill `database-design`
   - React/Vite UI → `@frontend-specialist` + skill `frontend-design`, `tailwind-patterns`
   - Test/property → `@test-engineer` + skill `tdd-workflow`, `testing-patterns`
   - Debug → `@debugger` + skill `systematic-debugging`
4. **TDD**: với sub-task gắn `*` (property), viết property test fast-check **≥100 vòng**
   trước, gắn nhãn `Feature: voucher-ecommerce-platform, Property {số}: {nội dung}`,
   rồi implement tới khi xanh. Tuân `.claude/rules/code-style.md` + `testing.md`.
5. **Kiểm tra cục bộ**: `npm run typecheck ...` → `npm run build` → `npm test`.
   Đổi schema/logic lớn → chạy thêm `python .agents/scripts/checklist.py .`.
6. **Cập nhật state + tài liệu**:
   - Tick task trong `tasks.md`.
   - Ghi 1 dòng vào `memory/active.md` / `progress.md` (hoặc `/memory` nếu ở Claude Code).
   - Đổi schema/route/UI → sync `docs/05-database-design` / `07-api-design` / `08-frontend-design`.
7. **Commit + PR**:
   - Stage file cụ thể (KHÔNG `git add .`); conventional commit:
     `feat(scope): mô tả [Task X.Y]`.
   - `git push -u origin <branch>` → mở PR → điền `pull_request_template.md`.
   - Chỉ merge khi **CI xanh**.
8. **Lặp lại** với task kế tiếp.

## Quy tắc an toàn (luôn áp dụng)

- KHÔNG push thẳng `main`/`master`; luôn qua nhánh + PR.
- KHÔNG dùng lệnh hủy diệt nếu chưa được xác nhận: `git push -f`, `git reset --hard`,
  `git clean -f`, `git branch -D`, `DROP TABLE/DATABASE`, `rm -rf`.
  (`.claude/hooks/pre-bash.sh` chặn các lệnh này khi chạy qua Claude Code.)
- Quét secret trước khi commit; không commit `.env`, `*.pem`, `*.key`, `credentials.json`.
- Với yêu cầu mơ hồ/phức tạp: hỏi rõ trước khi code (Socratic Gate), không giả định.

## Việc còn treo (cập nhật khi xong)

- `lint`/`format` chưa có script thật → bước lint hiện là no-op. Nên thêm ESLint +
  Prettier (hoặc Biome); khi xong, điền `format_extensions` trong `project.json`
  (vd `[".ts", ".tsx"]`) để hook `post-write.sh` tự format.
- `e2e/playwright.config.ts` chưa tồn tại → `npm run test:e2e` còn lỗi tới khi dựng e2e.
- `runtime.port = 3000` trong `project.json` là giả định; chỉnh lại khi dựng server thật.
- Bắt đầu thi công từ wave 0: Task 1.1 (scaffold backend) + 1.2 (scaffold frontend).
