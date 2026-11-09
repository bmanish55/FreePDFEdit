# DESIGN SPEC: UI refresh for FreePDFEdit

This file is an ADDITION to `PROJECT_SPEC.md` and `TEXT_ENGINE_SPEC.md`.
Goal: make the app look attractive, modern and well structured, while the existing functionality stays 100% unchanged.

All rules from Section 0 of `PROJECT_SPEC.md` still apply: one step at a time, STOP after each step and wait for "next", no extra features, ask if unclear.

## 1. Safety rules (most important, read first)

This is a STYLING task only. The app already works. Do not break it.

1. **Before anything else**, create a git branch: `git checkout -b design-refresh`. Commit after every step. If something breaks, we can revert to the last commit.
2. **Do NOT edit these files or folders at all:**
   - `src/lib/**` (coords, exportPdf, extractText, layoutText, fonts, pixels)
   - `src/store/**`
3. **In components, you may only change:** JSX markup structure for layout/decoration, Tailwind classes, and add small purely visual local state (for example `isDragging` for the upload zone).
4. **Never change:** props, function names, event handlers, store calls, ids, `data-*` attributes, or any inline `style` that is computed from zoom, width, height, x, y.
5. **Page rendering is sacred.** For the element that contains the page canvas and the edit overlay (`position: relative` wrapper in `PdfPage.tsx`):
   - Do NOT add padding, border, margin or transform to it, and do NOT change its size. A shadow or ring (box-shadow) is allowed, because it does not affect layout.
   - Do NOT move, wrap or restyle the canvas or the overlay `div`. Keep their `position`, `inset`, `touch-action` and `pointer-events` exactly as they are.
   - You may wrap the whole thing in an outer element for spacing and a page label.
6. **Allowed new dependencies (only these two):**
   ```
   npm i lucide-react @fontsource-variable/inter
   ```
7. No new features, no new pages, no new routes. No dark mode in this task.
8. If a file name or component name in this spec does not match the real project, use the real one. If unsure which, ASK.

### Regression checklist (must pass after EVERY step before you say "done")
1. Upload a PDF → all pages render.
2. Zoom in/out works and pages stay sharp.
3. Add Text works (type, move, delete).
4. Select tool: click existing text, edit it, the preview looks right.
5. Add Image works (move, resize).
6. Whiteout and Highlight draw correctly.
7. Undo and Delete work.
8. Download produces a correct PDF (same as the preview).
9. On a phone-width window: the page scrolls normally with the Select tool active.
10. No console errors.

## 2. Design direction

Style: clean, modern, trustworthy "utility app". Lots of white space, soft shadows, one strong brand color, rounded corners. Think "calm and professional", not flashy.

### 2.1 Design tokens
Put these in `src/index.css` after `@import "tailwindcss";`:

```css
@import "@fontsource-variable/inter";

@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  --color-brand-50:  #eef2ff;
  --color-brand-100: #e0e7ff;
  --color-brand-200: #c7d2fe;
  --color-brand-300: #a5b4fc;
  --color-brand-500: #6366f1;
  --color-brand-600: #4f46e5;
  --color-brand-700: #4338ca;
}

html { scroll-behavior: smooth; }
body { @apply bg-slate-50 font-sans text-slate-800 antialiased; }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```
(If the `@import` line for the font must come first in the CSS file, put it first.)

### 2.2 Rules
- **Colors:** brand = `brand-600` (primary), `brand-50/100` (soft backgrounds), neutrals = Tailwind `slate`. Success = `emerald`, warning = `amber`, error = `red`. No other colors.
- **Radius:** buttons and inputs `rounded-lg`; cards `rounded-2xl`.
- **Shadows:** cards `shadow-sm`, pages `shadow-md`. Nothing heavier.
- **Spacing:** use multiples of 4px only (Tailwind default scale).
- **Text:** headings `font-bold tracking-tight text-slate-900`; body `text-slate-600`; small text `text-sm` or `text-xs text-slate-500`.
- **Transitions:** `transition-colors duration-150` on interactive elements.
- **Focus:** every interactive element must show `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2`.
- **Touch targets:** buttons at least `h-10` (40px) tall.
- **Icons:** only from `lucide-react`, size 18 (`size={18}`), `strokeWidth={2}`.
- **Icon-only buttons** must have `aria-label` and `title`.

## 3. Shared UI pieces (new folder `src/components/ui/`)

Create these small components. Use them in later steps.

**`Button.tsx`** props: `variant: 'primary' | 'secondary' | 'ghost'`, `size?: 'md' | 'lg'`, `icon?: ReactNode`, plus all normal button props.
- primary: `bg-brand-600 text-white hover:bg-brand-700 shadow-sm`
- secondary: `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50`
- ghost: `text-slate-600 hover:bg-slate-100`
- disabled (all variants): `opacity-50 cursor-not-allowed pointer-events-none`
- md = `h-10 px-4 text-sm font-medium`, lg = `h-12 px-6 text-base font-semibold`, always `inline-flex items-center justify-center gap-2 rounded-lg`.

**`ToolButton.tsx`** props: `icon`, `label`, `active?`, `danger?`, `disabled?`, `onClick`.
- Layout: icon + label side by side on `sm` and up; on screens below `sm` show only the icon (label stays in `aria-label` and `title`).
- Base: `h-10 px-3 inline-flex items-center gap-2 rounded-lg text-sm font-medium transition-colors`.
- Inactive: `text-slate-600 hover:bg-slate-100`.
- Active: `bg-brand-50 text-brand-700 ring-1 ring-brand-200`.
- Danger (Delete): hover is `hover:bg-red-50 hover:text-red-600`.
- Disabled: `opacity-40 cursor-not-allowed`.

**`Notice.tsx`** props: `tone: 'info' | 'warning' | 'error'`, `icon?`, `children`.
- A rounded-lg bar with a border, soft background, icon on the left, `text-sm`.
- info: `bg-slate-50 border-slate-200 text-slate-600`; warning: `bg-amber-50 border-amber-200 text-amber-900`; error: `bg-red-50 border-red-200 text-red-800`.

## 4. Screens

### 4.1 Global page shell (`App.tsx`)
Structure, top to bottom:
1. `DesktopNotice` (mobile only)
2. `Header` (sticky)
3. Content (landing OR editor, see 4.3 / 4.4)
4. `Footer`

Root element: `min-h-screen flex flex-col`. Content area: `flex-1`.

### 4.2 Header (`Header.tsx`)
- `sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/80 backdrop-blur`.
- Inner container: `mx-auto flex h-full max-w-7xl items-center justify-between px-4`.
- Left: logo = a `h-8 w-8 rounded-lg bg-brand-600 text-white` square with the `FileText` icon (size 18), then text "FreePDFEdit" in `text-lg font-bold tracking-tight text-slate-900`.
- When a PDF is loaded: show the file name next to the logo on `md` and up, truncated (`max-w-[260px] truncate text-sm text-slate-500`), with a thin divider before it.
- Right: the existing Download button, now a `primary` Button with the `Download` icon. Keep the same disabled logic. Label hidden below `sm` (icon only, keep `aria-label`).

### 4.3 Landing screen (no PDF loaded)
Sections, in order:

**A. Hero** (wrapper `bg-gradient-to-b from-brand-50 to-slate-50`, `px-4 py-12 sm:py-16`)
- Small pill above the title: `inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200` with the text "100% free · No signup".
- H1: "Edit PDFs for free, right in your browser" → `text-4xl sm:text-5xl font-bold tracking-tight text-slate-900`, centered, `max-w-3xl mx-auto`.
- Sub text: "Change text, add images, highlight and whiteout. Your files never leave your device." → `mt-4 text-lg text-slate-600 max-w-xl mx-auto text-center`.
- Then the **UploadZone** (restyled, see below) with `mt-8 max-w-2xl mx-auto`.

**B. Ad slot `top`** (existing AdSlot, keep its show/hide logic) placed between the hero and the next section with `my-6`.

**C. Trust row** (`max-w-5xl mx-auto px-4`, grid 1 column on mobile, 3 columns from `sm`, gap-4). Three small items, each: icon in a `h-10 w-10 rounded-lg bg-brand-50 text-brand-600` box, bold title, one muted line:
1. `Zap` "Free forever" / "No limits, no watermark."
2. `ShieldCheck` "Private by design" / "Files are processed on your device."
3. `MousePointerClick` "No signup" / "Open the site and start editing."

**D. How it works** (`max-w-5xl mx-auto px-4 py-12`)
- Title "How it works" `text-2xl font-bold text-slate-900 text-center`.
- 3 cards in a grid (1 column mobile, 3 from `md`), each `rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200`, with a step number badge (`h-8 w-8 rounded-full bg-brand-600 text-white text-sm font-semibold`), a title and a short text:
  1. "Upload" / "Choose a PDF from your device."
  2. "Edit" / "Click any text to change it, or add text, images and highlights."
  3. "Download" / "Save your edited PDF instantly."

**UploadZone restyle** (`UploadZone.tsx`, keep the existing file handling code untouched):
- Card: `rounded-2xl border-2 border-dashed border-brand-200 bg-white p-8 sm:p-12 text-center shadow-sm transition-colors`.
- Hover: `hover:border-brand-400 hover:bg-brand-50/40`.
- Drag-over (add local `isDragging` state set in the existing dragover/dragleave/drop handlers): `border-brand-500 bg-brand-50`.
- Content: icon circle (`h-14 w-14 rounded-full bg-brand-50 text-brand-600`, `Upload` icon size 24), title "Drop your PDF here" (`text-xl font-semibold text-slate-900`), muted line "or choose a file from your device", then a `primary` `lg` Button "Choose PDF" (it must still open the file picker exactly as now), then `text-xs text-slate-500` "PDF files only".

### 4.4 Editor screen (PDF loaded)
Layout: app-like. Background `bg-slate-100`.

**Toolbar** (`Toolbar.tsx`), sticky just under the header: `sticky top-14 z-20 border-b border-slate-200 bg-white`.
- Inner: `mx-auto max-w-7xl px-4 py-2`, content in ONE horizontal row that scrolls on small screens: `flex items-center gap-1 overflow-x-auto` (hide the scrollbar visually with `[scrollbar-width:none]`). Children must not shrink: `shrink-0`.
- Groups separated by a vertical divider (`mx-2 h-6 w-px bg-slate-200 shrink-0`):
  1. **Tools:** Select (`MousePointer2`), Add Text (`Type`), Add Image (`ImagePlus`), Whiteout (`Eraser`), Highlight (`Highlighter`)
  2. **Edit:** Undo (`Undo2`), Delete (`Trash2`, danger)
  3. **Zoom:** minus button (`ZoomOut`, icon only), the percentage in `w-12 text-center text-sm tabular-nums text-slate-600`, plus button (`ZoomIn`, icon only)
- Right end (only from `lg`): the hint "Edited text uses a matching font." as `ml-auto text-xs text-slate-500`. Keep the existing text of the hint if it already exists.
- Use `ToolButton` for every button. The active tool shows the Active style. Keep every existing onClick and disabled logic.

**Text properties bar** (the controls that appear when a text object is selected: font family, Bold, Italic, size, color):
- Show it as a second row under the toolbar: `border-b border-slate-200 bg-slate-50`, inner `mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-2`.
- Restyle selects and inputs: `h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus-visible:ring-2 focus-visible:ring-brand-500`.
- Bold and Italic use `ToolButton` style toggles (icons `Bold`, `Italic`), icon only.
- Show this row only when it is shown today. Do not change when it appears.

**Notices** (below the toolbar, `mx-auto max-w-7xl px-4 pt-3`):
- The red warning from the text engine becomes `Notice tone="warning"` (shrunk) or `tone="error"` (overflow), icon `AlertTriangle`. Keep the same message text and the same conditions.
- Any other existing error or info message uses `Notice` too.

**Workspace**
- Wrapper: `mx-auto flex max-w-7xl gap-6 px-4 py-6`.
- Left (main): `min-w-0 flex-1 overflow-x-auto`. Inside it a column `flex flex-col gap-6`.
- Each page: outer wrapper `mx-auto shrink-0` (use auto margins for centering, NOT `items-center`, so that zoomed pages scroll horizontally without being cut off on the left).
  - The page element itself (the `position: relative` one): add only `bg-white shadow-md ring-1 ring-slate-200`.
  - Under each page a label: `mt-2 text-center text-xs text-slate-500` → "Page 2 of 5".
- Right column (ad): `hidden xl:block w-[300px] shrink-0`, inside a `sticky top-32` container holding the `side` AdSlot. Keep the existing AdSlot show/hide logic.
- Bottom ad slot: below the workspace, `mx-auto max-w-7xl px-4 pb-8`.

**Loading and error states**
- While a page is rendering: a skeleton (same size as the page if known, otherwise `h-[600px]`) `animate-pulse bg-slate-200 rounded` instead of an empty area. Remove it when the canvas is ready. Do not change rendering logic. If the existing code has no loading flag, show a centered spinner (`Loader2` icon with `animate-spin`) only while the document itself is loading.
- Invalid or password-protected PDF message: use `Notice tone="error"` inside a centered card with a "Choose another PDF" secondary Button that triggers the same action as the UploadZone does now. If no such action exists today, show only the message.

### 4.5 DesktopNotice (`DesktopNotice.tsx`)
- Keep the logic (mobile only, dismissible, sessionStorage).
- Style: `border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900`, icon `Monitor` (size 16) on the left, text, and a dismiss button with the `X` icon (`aria-label="Dismiss"`) on the right.

### 4.6 AdSlot (`AdSlot.tsx`)
- Do NOT change the show/hide logic or sizes.
- Only restyle the DEV placeholder: `rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-400`, with the text "Advertisement" centered both ways.

### 4.7 Footer (`Footer.tsx`, new file)
- `border-t border-slate-200 bg-white`, inner `mx-auto max-w-7xl px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500`.
- Left: "© {current year} FreePDFEdit". Right: "Your files never leave your device."
- No links for now (Privacy, About, Contact pages will be added later).

## 5. Responsive rules

Test at widths: 360, 768, 1024, 1440.
- Nothing may cause horizontal scrolling of the whole page (only the toolbar row and zoomed pages may scroll horizontally inside their own containers).
- Hero text scales (`text-4xl` → `sm:text-5xl`).
- Trust row and How-it-works become single column on mobile.
- Toolbar shows icons only below `sm`.
- Side ad only from `xl`.

## 6. Accessibility
- Every icon-only button has `aria-label` and `title`.
- Text contrast: body text at least `text-slate-600` on white, small muted text at least `text-slate-500`.
- All interactive elements are reachable by keyboard (Tab) and show the focus ring.

## 7. Build order (one step, then STOP)

**Step 0: Safety.** Create branch `design-refresh`. Run the regression checklist once on the CURRENT app and tell me the results. Commit nothing yet.

**Step 1: Foundations.** Install the 2 packages. Add the tokens/font to `index.css`. Create `ui/Button.tsx`, `ui/ToolButton.tsx`, `ui/Notice.tsx`. Do NOT use them anywhere yet.
Test: app looks the same except the font is now Inter. Checklist passes.

**Step 2: Shell.** `Header`, `DesktopNotice`, `Footer`, `App.tsx` structure (4.1, 4.2, 4.5, 4.7), `AdSlot` restyle (4.6).
Test: header is sticky, Download still works, footer visible. Checklist passes.

**Step 3: Landing.** Section 4.3 (hero, upload zone, trust row, how it works).
Test: upload by click AND by drag-and-drop still work. Looks good at 360px and 1440px.

**Step 4: Editor toolbar.** Section 4.4 toolbar, text properties bar, notices.
Test: every tool still works, active tool is highlighted, toolbar scrolls sideways on a phone.

**Step 5: Workspace.** Section 4.4 workspace, page cards, page labels, skeleton/loading/error states.
Test: coordinates are still correct (add text on page 2, zoom in/out, text stays on the same spot). Download matches the preview.

**Step 6: Polish.** Responsive check at all widths (Section 5), keyboard focus check (Section 6), remove unused code and classes, fix small spacing issues. Run the full regression checklist and report.

When Step 0 is done, STOP and wait for me to say "next".
