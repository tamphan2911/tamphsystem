# Research Site Design System

> Scope: this file controls design decisions for the research subdomain only.
> Use it before editing anything under `apps/web/app/(subdomains)/research`.
> If a future page-specific file exists at `design-system/research/pages/[page-name].md`, that page file can override this master file.

---

**Product:** Tam's Research Hub  
**Subdomain:** `research.tamph.com`  
**Primary users:** admin, chief assistant, assistant, researcher, lecturer  
**Interface type:** research operations dashboard  
**Design target:** quiet, precise, polished, data-dense, slightly youthful  
**Default theme:** dark

---

## Design Principles

### Operational First

This site is used repeatedly to manage research, submissions, tasks, journals, conferences, reviews, accounts, proposals, funders, and organized projects. Prioritize scan speed, clear status recognition, and stable layouts over decorative visuals.

### Polished, Not Loud

Use restrained depth, pastel status colors, small motion, and crisp spacing. Avoid marketing-page composition inside the app. The UI should feel like a focused research control room, not a landing page.

### Consistency Over Novelty

When adding new UI, reuse existing shared primitives first:

- `ResearchModal`
- `ResearchConfirmDialog`
- `ResearchSearchPicker`
- `ResearchDetailSection`
- `ResearchSkeleton`
- `TableSearchInput`
- `FilterSelect`
- `TablePagination`
- `IconHint`

Create new primitives only when a pattern repeats or the existing primitive cannot express the workflow cleanly.

---

## Visual Language

### Style Mix

Use this blend:

- **Minimal enterprise dashboard:** dense but calm layouts, strong table hierarchy.
- **Soft UI evolution:** subtle shadows, rounded but controlled corners, gentle pastel accents.
- **Dimensional layering:** modals, dropdowns, and side panels should feel layered without heavy borders.
- **Micro-interactions:** small hover, focus, and dropdown motion only.

Avoid:

- Loud gradients on app surfaces.
- Large decorative cards around every section.
- Nested cards inside cards unless the inner card is a repeated item, modal, or tool surface.
- Purple/blue monoculture. Blue is allowed, but mix with emerald, amber, rose, cyan, violet, and slate status colors.
- Emoji icons. Use Lucide icons.

---

## Color System

### Core Dark Theme

| Role | Tailwind Target | Usage |
| --- | --- | --- |
| App background | `slate-950` / near black | Main site canvas |
| Surface | `slate-900` | Cards, sections, tables |
| Elevated surface | `slate-900` + shadow | Modals, dropdowns |
| Soft surface | `slate-800/40` | Hover rows, subtle blocks |
| Border | `slate-800` | Section and table borders |
| Muted text | `slate-400` / `slate-500` | Metadata, helper text |
| Body text | `slate-200` | Main table/detail text |
| Strong text | `white` / `slate-100` | Headings, important labels |

### Core Light Theme

| Role | Tailwind Target | Usage |
| --- | --- | --- |
| App background | `slate-50` | Main site canvas |
| Surface | `white` | Cards, sections, tables |
| Soft surface | `slate-50` | Filters, inputs, hover rows |
| Border | `slate-200` | Section and table borders |
| Muted text | `slate-500` | Metadata, helper text |
| Body text | `slate-700` | Main table/detail text |
| Strong text | `slate-950` | Headings, important labels |

### Status Colors

Use pastel backgrounds with clear icon colors. These tones must work in dark and light themes.

| Meaning | Light | Dark | Icon |
| --- | --- | --- | --- |
| Production / planned | `amber-50 text-amber-700 ring-amber-100` | `amber-950/40 text-amber-200 ring-amber-900` | amber |
| Submitted / active | `blue-50 text-blue-700 ring-blue-100` | `blue-950/40 text-blue-300 ring-blue-900` | blue |
| Review / checking | `violet-50 text-violet-700 ring-violet-100` | `violet-950/40 text-violet-300 ring-violet-900` | violet |
| Accepted / complete | `emerald-50 text-emerald-700 ring-emerald-100` | `emerald-950/40 text-emerald-300 ring-emerald-900` | emerald |
| Published | `cyan-50 text-cyan-700 ring-cyan-100` or `blue-50` | `cyan-950/40 text-cyan-300 ring-cyan-900` | cyan/blue |
| Warning / due soon | `amber-50 text-amber-800 ring-amber-100` | `amber-950/40 text-amber-200 ring-amber-900` | amber |
| Danger / delete / overdue | `rose-50 text-rose-700 ring-rose-100` | `rose-950/40 text-rose-300 ring-rose-900` | rose |
| Neutral / inactive | `slate-100 text-slate-600 ring-slate-200` | `slate-800 text-slate-300 ring-slate-700` | slate |

---

## Typography

### General Rules

- Keep typography compact and readable.
- Do not use viewport-based font scaling.
- Use `letter-spacing: 0` for normal text.
- Use uppercase only for table headers, small labels, IDs, and metadata.
- Avoid bolding every link. Use size, color-on-hover, and placement to create hierarchy.

### Scale

| Context | Style |
| --- | --- |
| Page title | `text-2xl` to `text-3xl`, `font-black`, tight line height |
| Detail title | `text-xl` to `text-2xl`, `font-black` |
| Section title | `text-base`, `font-black` |
| Table primary link | `text-base` or `text-lg`, `font-normal` unless truly important |
| Table metadata | `text-xs`, muted |
| IDs | `font-mono text-xs`, muted, compact |
| Buttons | `text-sm font-bold` or `font-black` for primary actions |

### Content Tone

Use direct, specific labels:

- Prefer `Research Associated` over vague `Items`.
- Prefer `Registration period` over ambiguous `University registration`.
- Notifications must name the affected object: journal, research, task, account, user, or project.

---

## Layout

### App Shell

- Sidebar remains the stable navigation anchor.
- Highlight admin-only items with a distinct but subtle pastel treatment that is not confused with active or hover.
- Avoid horizontal scroll in main tables. Compact utility columns first and preserve width for the main name/title column.

### Page Width

- Listing pages should use full available width.
- Detail pages should use a comfortable max width only when it improves reading; otherwise use the app content width.
- Avoid narrow detail content unless the page is intentionally focused, such as login or confirmation flows.

### Detail Pages

Use `ResearchDetailSection` for primary sections.

Section rhythm:

- Outer section: one box only.
- Header row: title on left, action icon on right.
- Content: text, table, or repeated rows directly inside the section.
- Use horizontal dividers for internal grouping.
- Avoid boxes inside boxes unless showing repeated records.

Recommended order:

1. Header summary
2. Key people or ownership
3. Associated objects
4. Notes / documents
5. Activity, submissions, tasks, or results

---

## Tables

### Table Structure

- Use `table-fixed` when columns must not overflow.
- Main title/name column gets priority.
- ID, status, claim, registration, count, edit, and delete columns must be compact.
- Use icons for status-like fields when repeated heavily.
- Use text headers unless icons meaningfully save space and have hover text.

### Table Rows

- Row hover:
  - Light: `hover:bg-slate-50`
  - Dark: `dark:hover:bg-slate-800/40`
- Hover should not shift column widths or row height.
- Primary links change color only on hover.
- Secondary metadata stays muted.

### Empty, Loading, Error

All async tables should support:

- Skeleton rows during first load.
- Empty state with a page-specific message.
- Error state with a retry action when fetching fails.

Use `ResearchSkeleton` for skeletons.

---

## Buttons

### Hierarchy

| Type | Usage | Style Direction |
| --- | --- | --- |
| Primary | Create, save, confirm positive action | pastel filled or soft gradient, strong text, icon left |
| Secondary | Cancel, back, neutral action | bordered slate, quiet hover |
| Icon button | Edit, delete, unlock, send, download | square, tooltip, pastel hover |
| Danger | Delete or destructive confirm | rose pastel or solid rose depending risk |

### Interaction

- Every clickable button needs `cursor-pointer`.
- Hover: slight `translateY(-0.5)` or color lift, never layout shift.
- Active: subtle press down, already handled globally.
- Focus: visible ring in both themes.
- Disabled: lower opacity, no hover lift.

---

## Modals

Use `ResearchModal` for create/edit dialogs and `ResearchConfirmDialog` for destructive or high-risk confirmations.

### Modal Layout

- Header: icon, title, short description, close button.
- Body: scrollable if needed, stable max height.
- Footer: right-aligned actions or form footer inside body if the form requires it.
- Close button hover must remain visible in dark theme.
- Avoid boxed sections inside modals; separate groups with horizontal lines.

### Modal Width

| Workflow | Width |
| --- | --- |
| Small confirm | `max-w-md` / `max-w-lg` |
| Simple create/edit | `max-w-2xl` |
| Research/project/task forms | `max-w-4xl` to `max-w-6xl` |
| Complex project/research association | `max-w-5xl` to `max-w-6xl` |

---

## Searchable Pickers

Use `ResearchSearchPicker` for single-object picking. Multi-select pickers should follow the same behavior and visual style.

Required behavior:

- Search input filters in real time.
- Dropdown opens below the input and stays above modal content.
- Results show primary label and one metadata line.
- Empty state is specific.
- Selected value is shown as a compact chip or selected row.
- Clear button is available when replacement is allowed.
- Keyboard support: arrow up/down, enter, escape.
- Do not show all options before search for large datasets.

Picker targets:

- Authors
- Members
- Register name
- Funder
- Research
- Account
- Journal
- Conference
- Review

---

## Forms

### Field Rules

- Align fields in the same row to the same height.
- Label above field.
- Helper text only when it prevents mistakes.
- Required validation should appear inside the modal above the first field.
- Use warning style for missing required input.
- Do not hide required dependencies without clear state logic.

### Date Fields

- Display dates as `dd/mm/yy`.
- Date input hover/focus must work in both themes.
- If an end date is calculated, show it as text unless user edits it directly.

---

## Notifications

Notifications must be specific.

Bad:

- `A journal submission moved to review stage.`

Good:

- `Submission for International Review of Digital Pedagogy moved to review stage.`

Include the affected object and action:

- Research title or ID
- Journal/conference name
- Task title or task ID
- User/member/author name
- Project/funder/proposal name

Use success, warning, and error tones consistently.

---

## Motion

### Timing

- Hover/focus: `150ms` to `220ms`
- Modal overlay: `180ms`
- Modal panel: `220ms`
- Dropdown: `160ms` to `200ms`
- Toast: `220ms`

### Easing

Use `ease-out` for entrance and hover. Avoid bounce or playful spring effects in operational screens.

### Reduced Motion

All broad motion must respect `prefers-reduced-motion`.

---

## Accessibility

- All icon-only buttons need `aria-label` and hover text guide via `IconHint`.
- Confirm dialogs must have clear title, description, and action labels.
- Color cannot be the only status signal; pair color with icon or text.
- Keep text contrast at WCAG AA or better.
- Use keyboard-visible focus rings.
- Do not trap users in a page without back/navigation path.

---

## Page-Specific Priorities

### Research Listing

- Preserve width for research title.
- Keep research ID compact.
- Registration icon and text must align consistently.
- Admin-only registration/claim information must stay permission-aware.

### Research Detail

- Header must show title, research ID, funder if present, and authors.
- Notes are text, not a field, unless editing.
- Associated project appears above notes if present.
- Timeline controls use explicit save/unlock confirmation behavior.

### Task Listing and Detail

- Task title and content need enough space.
- Assignees, due dates, report upload, and task status should be immediately scannable.
- Delete is admin-only and uses shared confirmation.

### Organized Projects

- Project title should be readable but not overly bold in listing.
- Research associated should use a research-table style.
- Members should show name, email, affiliation, and role badges.

### Journals, Conferences, Reviews, Accounts

- Tables should prioritize the object name/login ID.
- Delete columns are icon-only, admin-only, and compact.
- Linked names should not look colored until hover unless status requires color.

---

## Anti-Patterns

Do not introduce:

- New modal shells when `ResearchModal` can be used.
- New confirm dialogs when `ResearchConfirmDialog` can be used.
- One-off picker dropdowns unless the shared picker cannot support the workflow.
- Horizontal table scroll on normal desktop widths.
- Nested card-heavy detail pages.
- Inconsistent close button hover behavior.
- Empty tables that look like broken loading states.
- Generic notifications without object names.
- Decorative text floating over operational app pages.

---

## Pre-Delivery Checklist

Before shipping research-site UI work:

- [ ] Pulled latest `main`.
- [ ] Reused shared primitives where possible.
- [ ] Dark and light themes both considered.
- [ ] No horizontal scroll introduced in listing tables.
- [ ] Loading, empty, and error states are handled for async UI.
- [ ] Icon-only buttons have `aria-label` and tooltip.
- [ ] Modal close button remains visible on hover in dark theme.
- [ ] Dropdown content appears above modal/table content and is not clipped.
- [ ] Required fields show clear warning feedback.
- [ ] Notifications name the affected object.
- [ ] `git diff --check` passes.
