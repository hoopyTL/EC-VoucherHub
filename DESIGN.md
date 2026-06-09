# DESIGN.md — EC-VoucherHub Visual Baseline

> The single source of truth the `design-reviewer` skill checks screenshots against.
> Frontend (React + Vite) is not yet styled — these are **starter tokens**. Replace the
> `TBD` values once the UI stack (styling library, theme) is chosen, then keep this file
> in sync with the implemented components.

## Design tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | TBD | Primary actions, links, brand |
| `--color-primary-hover` | TBD | Hover/active state of primary |
| `--color-bg` | TBD | Page background |
| `--color-surface` | TBD | Cards, panels |
| `--color-text` | TBD | Body text |
| `--color-text-muted` | TBD | Secondary text |
| `--color-border` | TBD | Dividers, input borders |
| `--color-success` | TBD | Success states |
| `--color-warning` | TBD | Warnings |
| `--color-danger` | TBD | Errors, destructive actions |

Contrast: all text/background pairs must meet **WCAG AA** (4.5:1 normal, 3:1 large).

### Typography
| Token | Value |
|-------|-------|
| Font family (sans) | TBD |
| Base size | 16px |
| Scale | TBD (e.g. 1.25 modular) |
| Line height (body) | 1.5 |
| Weights | 400 / 500 / 700 |

### Spacing
4px base unit. Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. No arbitrary off-scale values.

### Rounded (border-radius)
| Token | Value |
|-------|-------|
| `--radius-sm` | TBD |
| `--radius-md` | TBD |
| `--radius-full` | 9999px (pills/avatars) |

### Elevation (shadow)
| Token | Usage |
|-------|-------|
| `--shadow-sm` | Cards at rest |
| `--shadow-md` | Dropdowns, popovers |
| `--shadow-lg` | Modals |

## Layout & responsive
- Breakpoints: mobile `<640px` · tablet `640–1024px` · desktop `>1024px`.
- Touch targets ≥ **44×44px**.
- Content max-width on desktop: TBD.

## Do's
- Use only the tokens above — no hard-coded hex/px outside the scale.
- Every interactive element has a visible focus ring (keyboard accessible).
- Images/icons have `alt` / accessible labels.
- States covered for every component: default · hover · focus · active · disabled · loading · error · empty.

## Don'ts
- ❌ Off-scale spacing or one-off colors.
- ❌ Color as the only signal (pair with icon/text).
- ❌ Removing focus outlines without an equivalent replacement.
- ❌ Fixed pixel heights that clip translated/long text.

## Known gaps
- Styling library / theme not yet chosen — all token values are `TBD`.
- No components implemented yet (`frontend/src` has only the entry point).
- Fill this file before the first `design-reviewer` run.
