# MOBILE SPEC: make FreePDFEdit usable on phones (mobile only)

This file is an ADDITION to `PROJECT_SPEC.md`, `TEXT_ENGINE_SPEC.md` and (if applied) `DESIGN_SPEC.md`.
All rules from Section 0 of `PROJECT_SPEC.md` still apply: one step at a time, STOP after each step and wait for "next", no extra features, ask if unclear.
If `DESIGN_SPEC.md` styling already exists in the project, keep it. Use the real file and component names of the project. If a name in this file does not exist, ASK.

## 1. Goal and hard rule

Goal: a person on a phone can scroll/zoom a PDF normally and, when needed, make edits (text, image, whiteout, highlight) with touch.

**HARD RULE: the desktop experience must not change at all.** Same layout, same behaviour, same code paths. Mobile code lives behind `isMobile` and the desktop path stays exactly as it is.

## 2. The problem (root causes)

1. Dragging a finger to scroll over a page is treated as a tool action: it selects the invisible text boxes, starts a drag, or draws a rectangle.
2. The browser's own text selection and long-press menu start when the finger rests on the page, so areas get highlighted.
3. When a drawing tool is active, `touch-action: none` blocks scrolling completely.
4. On-canvas text editing is bad on phones: the keyboard covers the text, and iOS zooms in when an input has a font size under 16px.
5. The desktop toolbar is too wide, and small handles are too hard to hit with a finger.
6. Big canvases can crash mobile browsers (memory limits).

## 3. Safety rules (read first)

1. First action: `git checkout -b mobile-mode`. Commit after every step.
2. **Desktop branch rule:** wherever behaviour differs, write it as
   ```ts
   if (isMobile) { /* new mobile behaviour */ return ... }
   /* existing desktop code continues here, UNCHANGED */
   ```
   Do not refactor, rename, reorder or "clean up" desktop code. Do not change any desktop class names or styles.
3. Do NOT edit `src/lib/**` (coords, exportPdf, extractText, layoutText, fonts, pixels) except where a step explicitly says so. Do NOT edit the existing store file. Mobile-only UI state goes in a NEW store file (see 5.2).
4. Reuse the existing store actions (add object, update object, delete object, undo, set zoom, set tool). Read the store first. If an action you need does not exist, STOP and ask.
5. No new libraries.
6. After every step run `git diff` and check: every changed line in existing files is inside an `isMobile` branch or is a pure addition. Tell me the list of changed files.
7. Never set `user-scalable=no` or `maximum-scale` in the viewport meta tag (keeps native pinch-zoom).

### Desktop regression checklist (run at Step 0 and after EVERY step; must pass on a desktop browser with a mouse)
1. Upload PDF, pages render, zoom works.
2. Select tool: click existing text, edit it, preview looks right.
3. Add Text, Add Image (move, resize), Whiteout, Highlight (drag to draw), Undo, Delete.
4. Download PDF matches the preview.
5. Layout (header, toolbar, ad slots, side ad) looks exactly as before.
6. Resize the desktop window to a narrow width (400px) with the mouse: it must STILL behave as desktop (because the pointer is a mouse).
7. No console errors.

## 4. How mobile is detected

New file `src/hooks/useIsMobile.ts`:
```ts
// true only for touch devices with a small/medium screen
const QUERY = '(pointer: coarse) and (max-width: 1023px)'
```
- Use `window.matchMedia(QUERY)`, initial value read synchronously, and update on the `change` event. Clean up the listener.
- Export `useIsMobile(): boolean`.
- A desktop with a mouse is never mobile, even in a narrow window. Phones in landscape (width up to 1023px) are mobile.
- Testing in Chrome: DevTools → device toolbar → choose a phone (device type "Mobile") → this makes `pointer: coarse` true.

When `isMobile` is true, add the class `mobile-mode` to the `<body>` (in a `useEffect`, remove on cleanup).

## 5. Mobile design

### 5.1 Two modes: View and Edit (the core idea)

- **View mode (default).** For reading and scrolling only. Nothing on the page reacts to touch. Existing edits stay visible.
- **Edit mode.** Tools are available. Scrolling still works everywhere except while the user is dragging a SELECTED object.

This removes the conflict between scrolling and editing: the user must switch to Edit mode on purpose.

### 5.2 New mobile-only store: `src/store/useMobileStore.ts`
```ts
type MobileState = {
  mode: 'view' | 'edit'
  editingTextId: string | null   // text object currently open in the bottom sheet
  hint: string | null            // small help text shown above the bottom bar
  setMode: (m: 'view' | 'edit') => void
  openTextEditor: (id: string) => void
  closeTextEditor: () => void
  showHint: (text: string) => void   // auto clears after 4000 ms
}
```
When the mode switches to `view`: close the text editor, deselect any object (use the existing action), and set the active tool to Select (existing action).

### 5.3 Layout on mobile
Render a mobile layout ONLY when `isMobile`. In `App.tsx` branch at the top of the editor part:
```tsx
if (isMobile) return <MobileEditorShell />   // new component
// existing desktop JSX below, unchanged
```
`MobileEditorShell` contains, top to bottom:
1. Existing `DesktopNotice` (unchanged).
2. Existing `Header` (it already works on mobile; Download button stays).
3. Existing top `AdSlot` (unchanged logic).
4. The pages area (reuse the existing `PdfPage` components).
5. Existing bottom `AdSlot` (unchanged logic).
6. A fixed `MobileBottomBar` (see 5.4).
Do NOT render on mobile: the desktop toolbar, the text properties row, the side ad, the "Edited text uses..." hint.
Add bottom padding to the pages area equal to the bottom bar height plus `env(safe-area-inset-bottom)`, so nothing is hidden behind the bar. When the text sheet is open, add extra bottom padding equal to the sheet height.

The landing screen (no PDF loaded) is not part of `MobileEditorShell`. Only make sure it has no horizontal scroll at 360px width.

### 5.4 Bottom bar (`components/mobile/MobileBottomBar.tsx`)
`position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; background white; border-top slate-200; padding-bottom: env(safe-area-inset-bottom)`. Content height 56px. Show only when a PDF is loaded.

**View mode content:** one row, spaced evenly:
- Primary button "Edit" (pencil icon) → `setMode('edit')`
- Zoom out, zoom % text, zoom in (existing zoom actions; on mobile clamp the zoom between 0.5 and 3)
- "Fit" button → sets zoom to fit width (see 5.5)

**Edit mode content:** one horizontally scrollable row (`overflow-x: auto`, hidden scrollbar, items `shrink-0`):
- "Done" (check icon, secondary style) → `setMode('view')`
- Tool buttons, each 56px wide and 56px tall, icon (20px) above a label (11px): Select, Text, Image, Whiteout, Highlight, then Undo, Delete
- The active tool has the brand highlight style; Delete is disabled when nothing is selected; Undo uses the existing disabled logic.
Use the existing tool actions. Use icons from `lucide-react` if it is installed (it is if `DESIGN_SPEC.md` was applied); otherwise use text-only labels.

### 5.5 Fit to width
- On mobile, when a PDF finishes loading, set the zoom ONCE to: `(pagesContainerWidth - 16) / page1WidthAtScale1`, clamped between 0.5 and 2.
- Measure the container width with the container element's `clientWidth`. Page 1 width at scale 1 comes from pdf.js (`page.getViewport({ scale: 1 }).width`), which the existing code already uses; reuse it. Do not re-load the document just for this.
- Do not change the zoom again automatically after that (the user's zoom stays). The "Fit" button calls the same calculation.
- Desktop zoom behaviour is unchanged.

### 5.6 Stop accidental selection and highlighting (CSS)
Add to `index.css` (these selectors only match in mobile mode, so desktop is unaffected):
```css
.mobile-mode .pdf-pages,
.mobile-mode .pdf-pages * {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.mobile-mode .pdf-pages canvas {
  pointer-events: none;      /* long-press on the canvas must not open "save image" */
}
.mobile-mode .pdf-pages input,
.mobile-mode .pdf-pages textarea {
  -webkit-user-select: text;
  user-select: text;
}
```
- Add the class `pdf-pages` to the pages container element in `MobileEditorShell` (not in the desktop tree).
- In `MobileEditorShell` add `onContextMenu={(e) => e.preventDefault()}` on the `pdf-pages` container (blocks the long-press menu).
- Make sure the page overlay on mobile uses `touch-action: pan-x pan-y pinch-zoom` by default. This lets the browser scroll and pinch-zoom natively. NEVER set `touch-action: none` on the overlay or the pages container on mobile.

### 5.7 View mode behaviour
In `PdfPage` (and the overlay/edit-box code), when `isMobile && mode === 'view'`:
- Do not render the clickable text-run boxes at all.
- Overlay objects (added text, images, whiteout, highlight) render normally but with `pointer-events: none`.
- No pointer handlers are active.
Result: a finger scrolls the page and nothing gets selected, highlighted or dragged.

### 5.8 Edit mode, tool by tool
General touch rules for Edit mode:
- Use `onClick` (not `onPointerDown`) to trigger actions from taps. A browser does not send `click` when the finger scrolled, so scrolling never triggers an action.
- Only the currently SELECTED object may use `touch-action: none` (so dragging moves it instead of scrolling). Unselected objects and the overlay keep `touch-action: pan-x pan-y pinch-zoom`.
- All pointer handlers that drag must use `setPointerCapture`, and must end on `pointerup`, `pointercancel` and `lostpointercapture`.
- Tapping empty page area deselects the current object (existing deselect action).
- Minimum touch target: 44x44 CSS px (use an invisible larger hit area around small handles).

**Select tool: edit existing text**
- In Edit mode with the Select tool, render the text-run boxes (transparent, as on desktop).
- Tap a text-run box (`onClick`) → run the same "create TextObject from run (once per run)" logic as desktop → then `openTextEditor(thatId)`.
- Tap an added object (text/image/whiteout/highlight) → select it. If it is a text object and it was already selected → `openTextEditor(id)`.

**Add Text tool**
- Tap the page → create the TextObject exactly like desktop does (same defaults) → `openTextEditor(id)`.
- After the first tap, switch the tool back to Select (so another tap does not add another box).

**Add Image tool**
- Same as desktop (file picker, placed on the page that is most visible). After placing, select it.
- Selected image: dragging the body moves it; the bottom-right handle resizes it. The handle must have a 44x44 invisible hit area and a visible 16px square. Use Pointer Events with pointer capture. Reuse the existing resize logic if the code is separate from the mouse events; otherwise write mobile pointer handlers in a new file.

**Whiteout and Highlight tools (tap to place, not drag to draw)**
- Tap the page → create a rectangle centered on the tap, clamped inside the page, with these default sizes in PDF points: Highlight 140 x 18, Whiteout 120 x 24. Then select it and switch the tool back to Select.
- Selected rectangle: drag the body to move it; the bottom-right handle (same as images) resizes it. Minimum size 8 x 8.
- Reason: drag-to-draw would block scrolling.

**Delete / Undo**
- Bottom bar buttons call the existing delete and undo actions.

### 5.9 Text editor bottom sheet (`components/mobile/TextEditSheet.tsx`)
Shown when `editingTextId !== null`. It replaces on-page typing on mobile.

Layout:
- `position: fixed; left: 0; right: 0; z-index: 50; background white; border-top; rounded top corners; padding 12px 16px`.
- Contents: a single-line `<input type="text">` (NOT a textarea, no wrapping), font size 16px or more (this prevents the iOS auto-zoom), full width, `autoFocus`, `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`. Under it two buttons: "Cancel" (secondary) and "Done" (primary). Enter key = Done.
- Optionally below the input (only if these controls already exist on desktop): font family, bold, italic, size, color, rendered as small compact controls. If not simple, skip them. Do NOT add new features.

Position above the keyboard:
- Use `window.visualViewport`. On `resize` and `scroll` of `visualViewport`, set the sheet's `bottom` style to `window.innerHeight - (visualViewport.height + visualViewport.offsetTop)` pixels (never below 0). If `visualViewport` is not available, use `bottom: 0`.
- When the sheet opens, scroll the text object's element into view with `scrollIntoView({ block: 'center', behavior: 'smooth' })`, after the sheet has rendered.

Behaviour:
- Typing updates the text object LIVE through the existing update action, so the page preview (the `layoutText` result) changes while typing. The page uses the same engine as desktop. The warning from the text engine (shrunk/overflow) shows as a small line above the input.
- Check how the desktop edit avoids one undo entry per keystroke, and do the same here. If you cannot tell, STOP and ask me.
- Done: close the sheet. If the text is empty (only for objects created by Add Text) → delete that object.
- Cancel: restore the text to what it was when the sheet opened; if the object was created during this same sheet session → delete it. Close the sheet.
- Opening the sheet for a different object closes the previous one (as Done).

### 5.10 Hints (`components/mobile/MobileHint.tsx`)
A small dark rounded label above the bottom bar (`bottom: calc(56px + env(safe-area-inset-bottom) + 8px)`), auto hides after 4 seconds, `pointer-events: none`. Show when entering Edit mode and when selecting a tool:
- Edit mode: "Pick a tool below"
- Select: "Tap any text to edit it"
- Text: "Tap on the page to add text"
- Image: choose a file, then "Drag to move, use the corner to resize"
- Whiteout: "Tap to place a box, then drag to move or resize"
- Highlight: "Tap to place a highlight, then drag to move or resize"

### 5.11 Performance guards (mobile only)
In the page rendering code, behind `isMobile`:
1. Cap the canvas scale: `dpr = Math.min(window.devicePixelRatio, 2)`.
2. Cap the canvas size: if `canvasWidth * canvasHeight > 12_000_000` pixels, reduce the scale until it fits. (iOS Safari fails above about 16 million pixels.)
3. When a page is far from the screen (more than 2 screen heights away), release its canvas by setting `canvas.width = 0; canvas.height = 0` and render it again when it comes back near the screen. Keep the page's wrapper size so the scroll height does not jump.
4. Keep only the existing lazy rendering logic otherwise.
Desktop rendering is unchanged.

## 6. Files to create

```
src/hooks/useIsMobile.ts
src/store/useMobileStore.ts
src/components/mobile/MobileEditorShell.tsx
src/components/mobile/MobileBottomBar.tsx
src/components/mobile/TextEditSheet.tsx
src/components/mobile/MobileHint.tsx
```
Existing files may get small `isMobile` branches only: `App.tsx`, `PdfPage.tsx`, `ObjectView.tsx`, the page renderer, `index.css`.

## 7. Build order (one step, then STOP)

**Step 0: Baseline.** Create branch `mobile-mode`. Read the existing code (read-only). Report to me: (a) component list, (b) the store actions that exist for: set tool, add object, update object, delete object, undo, set zoom, select/deselect, (c) how desktop text editing avoids one undo entry per keystroke. Run the desktop regression checklist and report the result. Do not change any file.

**Step 1: Detection and CSS.** `useIsMobile.ts`, body class `mobile-mode`, the CSS from 5.6, `useMobileStore.ts`. Nothing visible changes on desktop.
Test: in Chrome DevTools phone mode, `document.body.classList` contains `mobile-mode`. On desktop it does not. Desktop checklist passes.

**Step 2: Mobile shell, View mode, bottom bar, fit to width.** Sections 5.3, 5.4, 5.5, 5.7. (Edit mode buttons can be visible but tools do nothing yet.)
Test (phone mode): scrolling the PDF with a finger never selects, highlights or edits anything; long-press does not open a menu; zoom +/- and Fit work; no horizontal page scroll at 360px (except inside a zoomed page container). Desktop checklist passes.

**Step 3: Edit text with the bottom sheet.** Sections 5.8 (Select and Add Text), 5.9, 5.10.
Test: tap text → sheet opens above the keyboard → typing updates the preview → Done keeps, Cancel restores. Add Text works. Scrolling in Edit mode still works and does not trigger edits. Desktop checklist passes.

**Step 4: Image, Whiteout, Highlight, Delete, Undo.** Section 5.8 (remaining tools).
Test: place and move/resize each object with one finger, 44px handles are easy to hit, scrolling still works when touching outside the selected object. Download matches the preview. Desktop checklist passes.

**Step 5: Performance guards.** Section 5.11.
Test: open a PDF with 50+ pages on a phone: no crash, scrolling stays smooth, pages re-render when scrolled back. Desktop checklist passes.

**Step 6: Final QA.** Run the full desktop checklist, then test on a real phone (see below). Fix only mobile issues. Report any desktop diffs found by `git diff` (there must be none outside `isMobile` branches).

## 8. How to test on a real phone
1. Run `npm run dev -- --host`. The terminal prints a network URL like `http://192.168.x.x:5173`.
2. Phone and computer must be on the same Wi-Fi. Open that URL on the phone.
3. Or push the branch and open the Netlify branch/deploy preview URL.

## 9. Definition of done
- Scrolling a PDF on a phone never selects or highlights anything.
- In Edit mode, text editing, adding text, image, whiteout and highlight all work with touch only.
- Keyboard never covers the text being edited.
- Large PDFs do not crash the phone browser.
- Desktop looks and behaves exactly as before (checklist passes, `git diff` shows only `isMobile` branches and additions).

When Step 0 is done, STOP and wait for me to say "next".
