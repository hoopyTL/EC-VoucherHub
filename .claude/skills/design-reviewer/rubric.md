# Design Review Rubric

7 criteria groups. Walk them in order for each screenshot. For each question: if it fails → log a finding with the matching severity.

---

## 1. Tokens conformance (vs DESIGN.md)

> Goal: the real UI = the baseline. Any hard-coded value that diverges from a token is a bug.

- [ ] Does every color in the CSS match a token in `colors.*` of DESIGN.md? **major** if off.
- [ ] Does every `border-radius` match `rounded.*`? **major** if off.
- [ ] Does every `padding` / `margin` / `gap` belong to the spacing scale (4/8/12/16/20/24/32)? **minor** if off by ≤4px, **major** if off by >4px.
- [ ] Do `font-family`, `font-size`, `font-weight`, `line-height` match a typography token? **major** if off.
- [ ] Does `box-shadow` match `elevation.*`? **major** if off.

**How to measure**: read the UI source file(s) in `paths.ui_files`, grep out every px/hex value, and compare against the YAML frontmatter of DESIGN.md.

---

## 2. Visual hierarchy

> Goal: the eye moves in the right order — title first, content next, action last.

- [ ] Is the page title `h1` the largest, with no text equal to or larger than it? **major** if wrong.
- [ ] Is the primary action the most prominent element in a form card? **major** if it blends with inputs.
- [ ] Does the destructive action NOT outrank the primary action within the same cluster? **major** if it breaks the rule.
- [ ] Is metadata (a status badge, timestamp) clearly smaller than body text? **minor** if at the same level.
- [ ] Does the empty state have explanatory text rather than a blank div? **major** if blank.

---

## 3. Spacing & alignment (pixel-level)

> Goal: a 4/8px rhythm, no "stray" values.

- [ ] Is every spacing value a multiple of 4? **minor** if off (e.g. `15px` instead of `16px`).
- [ ] Do list items have an even vertical rhythm? **minor** if the gap varies.
- [ ] Do form fields in the same group have consistent gaps? **minor** if mismatched.
- [ ] Are elements baseline-aligned? In particular: a metadata badge must be center-aligned with the list item title, not shifted up/down. **major** if off by >2px.
- [ ] Is card padding symmetric (top=bottom, left=right)? **minor** if asymmetric.

**How to measure**: use Playwright `element.boundingBox()` to get exact `{x, y, width, height}` — do not estimate by eye.

---

## 4. Color contrast (WCAG AA)

> Goal: text is readable on every background.

- [ ] Body text on a surface: contrast ≥4.5:1? **critical** if it fails.
- [ ] Large text (≥18.66px, or 14px bold) on its background: ≥3:1? **critical** if it fails.
- [ ] Button text (primary/danger) on its background: ≥4.5:1? **critical** if it fails.
- [ ] Badge text on the badge background: ≥4.5:1? **critical** if it fails.
- [ ] Placeholder text in an input: ≥4.5:1 (NOT too faint)? **major** if it fails.
- [ ] Error message: ≥4.5:1 AND has an icon/prefix so it does not rely on color alone? **major** if color-only.
- [ ] Disabled state still ≥3:1? **major** if too dim to read.

**How to measure**: extract the hex values from DESIGN.md and apply the WCAG formula (relative luminance ratio). Or run `npx pa11y` against the running server.

---

## 5. Touch target & focus

> Goal: tappable on mobile, navigable by keyboard.

- [ ] Does every interactive element have a ≥44×44px tap region at viewport 375? **critical** if it fails.
- [ ] Does a small in-row action button (e.g. delete) — even if visually small — have a 44px hit area? **critical** if it fails.
- [ ] Does an 18×18 checkbox have a clickable row wrapping it up to 44px? **major** if not.
- [ ] Does every button + input have a `:focus-visible` outline ≥2px? **major** if missing (a11y requirement).
- [ ] Is the tab order natural (form fields → submit → list)? **major** if scrambled.
- [ ] Is there NO `outline: none` without a replacement? **critical** if present (killing focus = blind for keyboard users).

**How to measure**: Playwright `element.boundingBox()`, then check ≥44. For focus-visible, check that a `:focus-visible` CSS selector exists.

---

## 6. State coverage

> Goal: every state is designed, no "makeshift" states.

Every interactive component needs:

- [ ] **Default** — the initial state.
- [ ] **Hover** — mouse feedback (desktop). **minor** if missing.
- [ ] **Focus-visible** — keyboard outline. **major** if missing.
- [ ] **Active/Pressed** — tap feedback. **minor** if missing.
- [ ] **Disabled** — opacity + cursor. **major** if it only hides without indicating.
- [ ] **Loading** — inline spinner for async (if any). **major** if a submit button gives no feedback.
- [ ] **Error** — message with a visual cue (color + icon/prefix). **major** if red text only.
- [ ] **Empty** — explanatory copy + (optional) CTA. **major** if a blank div.

App-level states to review as well:

- [ ] Page with no items yet (empty list).
- [ ] Page with one item.
- [ ] Page with ≥10 items (overflow scroll, pagination?).
- [ ] Submit failure (server 400/500).
- [ ] Network lost (offline).

---

## 7. Responsive

> Goal: usable at 375 / 768 / 1440 — no breakage, no clipping.

- [ ] **375px**: no horizontal scroll? **critical** if present.
- [ ] **375px**: do two stacked select controls stack vertically without overflow? **major** if cramped.
- [ ] **375px**: does a long list item title wrap instead of hard-truncating? **major** if cut off.
- [ ] **375px**: do an in-row action button + checkbox + title avoid crowding? **major** if touch targets overlap.
- [ ] **768px**: filters horizontal, layout sensible? **minor** if too sparse.
- [ ] **1440px**: container max ~720px, not loosely full-width? **minor** if spread out.
- [ ] Text never overflows its container at any viewport? **critical** if it overflows.
- [ ] Images/SVGs (if any) are responsive, not stretched/distorted? **major** if distorted.

**How to measure**: Playwright `page.setViewportSize()` per size, screenshot, and check overflow with:
```js
await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
```

---

## Severity reference

| Level | Definition | Example |
|---|---|---|
| **critical** | UI broken or a11y fail | Text contrast 2:1, horizontal overflow on mobile, focus fully disabled |
| **major** | Diverges from DESIGN.md or missing an important state | Wrong primary color, missing focus-visible, danger button has no hover |
| **minor** | Slight grid divergence, small rhythm break | Padding 15px instead of 16px, uneven gap ±2px |
| **nit** | Subjective, not a bug | Suggest a larger radius for a softer feel |

---

## Output for design-fixer

Every finding, when turned into an issue, must carry enough information for `@design-fixer` to fix without asking back:

1. **Exact location**: file + line.
2. **Reference token**: the token name in DESIGN.md (e.g. `colors.primary`).
3. **Code change**: provide the diff or post-fix snippet directly.
4. **Verification step**: which e2e test will verify, or which viewport needs a re-screenshot.

An issue missing one of these four → incomplete finding, do not file it.
