# Bản đồ tài liệu — EC-VoucherHub

Tài liệu này giải thích mỗi thư mục/tệp trong repo để làm gì, tránh nhầm lẫn
giữa các nguồn. **Quy tắc vàng: mỗi loại thông tin chỉ có một nguồn sự thật.**

## Nguồn sự thật theo loại

| Bạn cần | Đọc / sửa ở đây | Vai trò |
| --- | --- | --- |
| Yêu cầu, thiết kế, danh sách task để **code** | `.kiro/specs/voucher-ecommerce-platform/` | **Spec sống** (requirements.md, design.md, tasks.md). Nguồn sự thật khi thi công |
| Tài liệu bàn giao (BRD → demo) | `docs/01-brd … 10-demo-script` | Deliverables SDLC cho đồ án |
| Trạng thái dự án, quyết định, tiến độ | `memory/` | active.md, decisions.md, progress.md, plan.md |
| Quy ước làm việc mọi phiên | `.kiro/steering/dev-workflow.md` | Workflow tự áp dụng |
| Lệnh chuẩn (build/test/lint/ci) | `.claude/project.json` | Nguồn lệnh duy nhất |

## Cấu trúc thư mục

```text
EC-VoucherHub/
├── .kiro/                  # Kiro: spec sống + steering (nguồn sự thật khi code)
│   ├── specs/voucher-ecommerce-platform/  # requirements / design / tasks
│   └── steering/dev-workflow.md           # quy ước làm việc
├── docs/                   # Tài liệu bàn giao (deliverables)
│   ├── 00-planning/initial-plan.md  # Kế hoạch ban đầu (THAM KHẢO, có chỗ lỗi thời)
│   ├── 01-brd/             # Business Requirements Document
│   ├── 02-srs … 10-demo-script/     # SRS, ERD, use-case, DB, kiến trúc, API, FE, test, demo
│   └── README.md           # File này — bản đồ tài liệu
├── memory/                 # Trạng thái agent (state): active/decisions/progress/plan
├── backend/                # @voucher/backend — Express API
├── frontend/               # @voucher/frontend — React + Vite SPA
├── shared/                 # @voucher/shared — enums/DTO dùng chung
├── .agents/                # AG Kit: agent + skill + script audit (.py)
├── .claude/                # Claude Code: project.json, hooks, commands, rules
├── .github/                # CI + PR/Issue templates
├── package.json            # npm workspaces (gốc)
└── tsconfig.json           # base TS config
```

## Phân biệt 3 hệ công cụ AI (không trùng vai trò)

- **`.kiro/`** — môi trường đang dùng để viết spec và code. Nguồn sự thật về *làm gì*.
- **`.agents/`** (AG Kit) — kho kiến thức chuyên môn (agent/skill) + script kiểm định
  (`python .agents/scripts/checklist.py .`). Dùng để tra cứu và audit.
- **`.claude/`** (Claude Code) — cấu hình + tự động hóa runtime (hook chặn lệnh nguy
  hiểm, `/git` test-gate, `/memory`). `project.json` là nguồn lệnh chuẩn.

## Lưu ý

- KHÔNG duy trì hai danh sách task song song. `.kiro/.../tasks.md` là gốc;
  `memory/plan.md` chỉ ghi trạng thái/quyết định mức cao.
- `docs/00-planning/initial-plan.md` là bản kế hoạch cũ — chỉ tham khảo, một số chi
  tiết (pnpm, port 5000, packages/shared) đã lỗi thời.
