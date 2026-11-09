# PROJECT SPEC: Free PDF Editor (browser only)

Read this whole file before writing any code. Follow it exactly.

## 0. Rules for the AI (Copilot)

1. Build ONE STEP at a time, in the order of Section 6. After each step, STOP and tell me what to test. Do not start the next step until I say "next".
2. Do NOT add any library not listed in Section 2. Do NOT add a backend, database, login, or any server code.
3. Do NOT use any external API. Everything runs in the browser. Files never leave the user's device.
4. Keep the code simple. Prefer plain functions and plain DOM/React over clever abstractions. No extra features that are not in this file.
5. Use TypeScript strict mode. No `any` unless unavoidable (add a comment why).
6. Every file must be small (under 200 lines). If bigger, split it.
7. If something in this file is unclear, ASK me. Do not guess.

## 1. What we are building

A free website where a user uploads a PDF, edits it, and downloads the edited PDF.
- 100% free, no signup, no watermark.
- Works on desktop AND mobile (responsive).
- Mobile shows a dismissible note: "For the best experience, use a desktop or laptop. Editing on mobile can be difficult and may cause errors."
- A reserved ad space exists on the page from day one (placeholder only, no real ads yet).

## 2. Tech stack (only these)

- Vite + React + TypeScript (template: react-ts)
- Tailwind CSS (use `@tailwindcss/vite` plugin, and `@import "tailwindcss";` in `src/index.css`)
- `pdfjs-dist` : render pages and read text positions
- `pdf-lib` : write changes and export the PDF
- `zustand` : app state

Install command:
```
npm i pdfjs-dist pdf-lib zustand
npm i -D tailwindcss @tailwindcss/vite
```

## 3. Features (MVP only)

Tools in the toolbar:
1. **Select/Edit Text**: click any existing text in the PDF and change it.
2. **Add Text**: click on a page, type new text.
3. **Add Image**: choose a PNG or JPG, it is placed on the current page. User can move and resize it.
4. **Whiteout**: draw a white rectangle to hide something.
5. **Highlight**: draw a yellow semi-transparent rectangle.

Other controls: Upload, Download, Undo, Delete selected object, Zoom in/out.

NOT in MVP (do not build): page reorder/merge/split, OCR, forms, signatures, freehand drawing, password protect, compress, Hindi/Marathi text.

## 4. Layout

Single scrolling view. All pages are shown one below another in a vertical scroll. No thumbnails sidebar.

Page layout, top to bottom:
1. DesktopNotice (only on screens up to 768px wide, dismissible, remember dismissal with sessionStorage)
2. Header: app name "Free PDF Editor", plus Download button (disabled until a PDF is loaded)
3. AdSlot `top` (fixed height 90px, max width 728px, centered)
4. Toolbar (sticky, wraps on small screens)
5. Main area: scrolling pages. On screens 1024px and wider, show AdSlot `side` (300x250) in a right column.
6. AdSlot `bottom` (fixed height 100px)

AdSlot rules:
- Component `AdSlot` takes a `position` prop: `top | side | bottom`.
- It renders a dashed gray box with the text "Ad space" and a FIXED height, so the layout never shifts when real ads are added later.
- Hide `side` on screens smaller than 1024px.

Empty state (no PDF loaded): show a big UploadZone (click to browse and drag-and-drop). Accept only `application/pdf`. Text: "Drop your PDF here or tap to browse. 100% free. Files never leave your device."

## 5. How it works (technical rules, follow exactly)

### 5.1 Rendering
- Load the PDF with `pdfjs-dist`.
- Vite worker setup (required, otherwise it breaks):
  ```ts
  import * as pdfjsLib from 'pdfjs-dist'
  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
  ```
- For each page, render to a `<canvas>` using `page.getViewport({ scale: zoom })`.
- Multiply canvas size by `window.devicePixelRatio` for sharpness on mobile, but keep CSS size equal to the viewport size.
- Render pages lazily: only render a page when it is near the screen (use IntersectionObserver). This avoids crashes on big PDFs.
- Each page is wrapped in a `div` with `position: relative`. Inside it: the canvas, then an overlay `div` with `position: absolute; inset: 0` that holds all editable objects for that page.

### 5.2 Coordinates (very important, most common bug)
- Store ALL object positions and sizes in **PDF units at scale 1** (points), with origin at **top-left** of the page, y going DOWN.
- When displaying: `screenValue = storedValue * zoom`.
- When exporting with pdf-lib: its origin is **bottom-left**, y goes UP. Convert: `pdfY = pageHeight - y - height`.
- Write one helper file `src/lib/coords.ts` for these conversions and use it everywhere.

### 5.3 Data model (zustand store)
```ts
type BaseObject = { id: string; page: number; x: number; y: number; width: number; height: number }

type TextObject = BaseObject & {
  type: 'text'
  text: string
  fontSize: number        // in PDF points
  color: string           // hex, default #000000
  coverOriginal: boolean  // true when this replaces existing PDF text
}
type ImageObject = BaseObject & { type: 'image'; dataUrl: string; mime: 'image/png' | 'image/jpeg' }
type RectObject = BaseObject & { type: 'whiteout' | 'highlight' }

type EditObject = TextObject | ImageObject | RectObject
```
Store contains: `pdfBytes`, `fileName`, `numPages`, `zoom`, `activeTool`, `objects: EditObject[]`, `selectedId`, and `history` for undo (keep it simple: push a copy of `objects` before every change, undo pops it).

### 5.3.1 Original PDF is never changed in memory
Edits live only in `objects`. The original `pdfBytes` stay untouched until Download.

### 5.4 Edit existing text
- Use `page.getTextContent()`. Each item has `str`, `transform`, `width`, `height`.
- Convert item position to our top-left PDF units (use `coords.ts`).
- In select tool, over each text item draw a transparent clickable box in the overlay.
- On click: create a `TextObject` with `coverOriginal: true`, same position/size, `text` = original string, `fontSize` = item height (approx), and show an editable input/contenteditable at that spot.
- Only create the object once per item (do not duplicate if clicked twice).
- On export, for `coverOriginal: true`: first draw a WHITE rectangle over the original text area (add 2pt padding), then draw the new text on top.
- Known limitation (accept it): the new text uses a standard font (Helvetica), not the original font. Show a small info text near the toolbar: "Edited text uses a standard font."

### 5.5 Add text
- Tool "Add Text": click on a page → create `TextObject` with `coverOriginal: false`, default `fontSize: 14`, empty text, and focus the input immediately.
- Text object can be dragged to move. Double-click to edit again.

### 5.6 Add image
- Tool "Add Image": open file picker (`image/png, image/jpeg`), read as dataURL, place on the page currently most visible, at x=50,y=50, width 200 and height by aspect ratio.
- Selected image shows a border and a resize handle in the bottom-right corner. Drag body to move.

### 5.7 Whiteout and Highlight
- User presses and drags on a page to draw a rectangle. Minimum size 5x5, else ignore.
- Whiteout = fill white. Highlight = fill yellow `#FFFF00` at 40% opacity.

### 5.8 Mobile touch
- Use Pointer Events (`onPointerDown/Move/Up`) for drag, resize and draw so mouse and touch both work.
- Add `touch-action: none` on the overlay ONLY while a tool other than Select is active, otherwise the page cannot scroll on phones.

### 5.9 Export (Download)
Use `pdf-lib`:
1. `PDFDocument.load(pdfBytes)`
2. Embed `StandardFonts.Helvetica` once.
3. For each object (in array order), on its page:
   - `whiteout`: `drawRectangle` white fill.
   - `highlight`: `drawRectangle` yellow fill, `opacity: 0.4`.
   - `text`: if `coverOriginal`, draw white rectangle first; then `drawText` with Helvetica, `fontSize`, `color` (convert hex to `rgb(r/255,g/255,b/255)`).
   - `image`: `embedPng` or `embedJpg`, then `drawImage`.
4. `save()` → create Blob → trigger download named `edited-<originalName>.pdf`.
5. If text has characters Helvetica cannot encode, catch the error and show: "Some characters are not supported yet (e.g. Hindi/Marathi). Please remove them." Do not crash.

## 6. Build order (do one step, then STOP)

**Step 1: Project setup + layout**
Create Vite project, Tailwind, folder structure, `AdSlot`, `DesktopNotice`, `Header`, `UploadZone`, `App.tsx` layout from Section 4. No PDF logic yet.
Test: page loads, 3 ad boxes visible, notice appears on narrow window.

**Step 2: Store + load + render**
Zustand store, upload sets `pdfBytes`, render all pages to canvas lazily (Section 5.1), zoom in/out buttons.
Test: upload a multi-page PDF and scroll through it, on desktop and on phone width.

**Step 3: Coordinates + overlay + Add Text**
`coords.ts`, per-page overlay, Add Text tool, move, delete, undo.
Test: add text on page 2, zoom in and out, text stays at the same spot on the page.

**Step 4: Export**
Download button with pdf-lib export for text objects only.
Test: open the downloaded PDF in another viewer, text is at the correct position (check y-axis is not flipped).

**Step 5: Edit existing text**
Section 5.4.
Test: click existing text, change it, download, old text is hidden and new text shows.

**Step 6: Images**
Section 5.6 + export of images.

**Step 7: Whiteout and Highlight**
Section 5.7 + export.

**Step 8: Polish**
Error handling for invalid/corrupt PDF and password-protected PDF (show a friendly message), loading spinner while rendering, keyboard Delete key removes selected object, `README.md` with run and deploy steps (deploy to Cloudflare Pages or Vercel, free tier).

## 7. Folder structure

```
src/
  components/
    AdSlot.tsx
    DesktopNotice.tsx
    Header.tsx
    UploadZone.tsx
    Toolbar.tsx
    PdfPage.tsx         (one page: canvas + overlay)
    ObjectView.tsx      (renders one EditObject)
  lib/
    coords.ts
    exportPdf.ts
    extractText.ts
  store/
    usePdfStore.ts
  App.tsx
  main.tsx
  index.css
```

## 8. Definition of done (MVP)

- Upload PDF, see all pages.
- Edit existing text, add text, add image, whiteout, highlight.
- Undo and delete work.
- Download gives a correct PDF.
- Works on Chrome desktop and Chrome on Android. No console errors.
- Ad placeholders in place, desktop note shows on mobile.

When Step 1 is ready, STOP and wait for me to say "next".
