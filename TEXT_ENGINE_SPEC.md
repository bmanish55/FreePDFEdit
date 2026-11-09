# TEXT ENGINE SPEC (fixes: text overflow + font mismatch)

This file is an ADDITION to `PROJECT_SPEC.md`.
Where this file disagrees with `PROJECT_SPEC.md` (Section 5.4 "Edit existing text", the text part of 5.5 and 5.9), THIS FILE WINS.
All rules from Section 0 of `PROJECT_SPEC.md` still apply (one step at a time, STOP after each step and wait for "next", no extra features, ask if unclear).

## 1. Problems to fix

1. **Overflow:** when the edited text is longer than the original, it wraps to a second line or overlaps other text.
2. **Continuity:** edited text looks different from the surrounding text (different font, size, weight, color, baseline, and the cover box is white on non-white backgrounds).

## 2. Root causes (understand these before coding)

- We draw edited text with Helvetica, not a font similar to the original.
- We use the box height as font size and the box top as text position. PDF text is positioned by its **baseline**, not its top.
- pdf.js returns many small text items per line (often one per word). We edit one fragment, not the whole line.
- Preview (HTML) and export (pdf-lib) are computed by different code, so they do not match.
- The text input is allowed to wrap.
- The cover rectangle is always white.

## 3. Architecture (the key idea)

**One pure function decides everything about how an edited text looks: `layoutText()`.**
Both the on-screen preview and the PDF export call the SAME function and only draw its result. No layout logic is allowed anywhere else.

```
extractText (pdf.js) ──► TextRun (original facts)
                              │
 user edits text ──► TextObject ──► layoutText(object, fonts) ──► Layout
                                                          │
                                      ┌───────────────────┴───────────────┐
                                      ▼                                   ▼
                              Preview (HTML)                      Export (pdf-lib)
```

Modules (new files under `src/lib/text/` and `src/lib/fonts/`):

| File | Job |
|---|---|
| `fonts/fontMatcher.ts` | Original font name → one of our bundled font families + bold/italic |
| `fonts/fontLoader.ts` | Loads font files (lazy), registers them for browser preview, caches bytes and metrics |
| `text/extractText.ts` | pdf.js text items → `TextRun[]` (merged into lines, with baseline, size, font, colors) |
| `text/layoutText.ts` | PURE function. Input: object + font metrics. Output: `Layout` |
| `pixels/sampleColors.ts` | Reads text color and background color from the rendered page canvas |
| `exportPdf.ts` | Existing file. Update to use `layoutText` and embedded fonts |

## 4. Fonts

### 4.1 Libraries
Add ONE new dependency (this is allowed, it overrides the Section 2 list of the main spec):
```
npm i @pdf-lib/fontkit
```

### 4.2 Bundled font files (the user will place them manually)
Put these TTF files in `public/fonts/`. Do NOT try to download them yourself. Do NOT rename them.
All are free, open-licensed fonts that are metric-compatible with common commercial fonts (same character widths, so layout matches).

```
Arimo-Regular.ttf      Arimo-Bold.ttf      Arimo-Italic.ttf      Arimo-BoldItalic.ttf       (like Arial / Helvetica)
Carlito-Regular.ttf    Carlito-Bold.ttf    Carlito-Italic.ttf    Carlito-BoldItalic.ttf     (like Calibri)
Tinos-Regular.ttf      Tinos-Bold.ttf      Tinos-Italic.ttf      Tinos-BoldItalic.ttf       (like Times New Roman)
Cousine-Regular.ttf    Cousine-Bold.ttf    Cousine-Italic.ttf    Cousine-BoldItalic.ttf     (like Courier New)
```
Add a file `public/fonts/README.txt` listing these names and saying "download from Google Fonts, use the static/ folder".
If a file is missing at runtime: fall back to Arimo-Regular, and if that is missing too, show an error message in the UI (do not crash).

### 4.3 `fontMatcher.ts`
Export:
```ts
type FontFamilyKey = 'arimo' | 'carlito' | 'tinos' | 'cousine'
type MatchedFont = { family: FontFamilyKey; bold: boolean; italic: boolean }
function matchFont(pdfFontName: string, pdfJsFontObj?: { bold?: boolean; italic?: boolean }): MatchedFont
```
Rules, in this order:
1. Clean the name: remove subset prefix with regex `^[A-Z]{6}\+`, lowercase it, remove spaces, `-`, `_`.
2. `bold` = name matches `/bold|black|heavy|semibold|demi/` OR `pdfJsFontObj.bold` is true.
3. `italic` = name matches `/italic|oblique/` OR `pdfJsFontObj.italic` is true.
4. Family (first match wins):
   - `/courier|consolas|mono|menlo|lucidaconsole/` → `cousine`
   - `/times|georgia|garamond|cambria|palatino|bookman|serif(?!.*sans)|minion|baskerville/` → `tinos`
   - `/calibri|candara|corbel|segoe|myriad|gill|carlito/` → `carlito`
   - anything else (Arial, Helvetica, Verdana, Tahoma, unknown) → `arimo`
5. Never throw. Unknown input returns `{ family: 'arimo', bold: false, italic: false }`.

Add a dev-only function `debugMatchFont()` that logs results for these inputs, and call it once in dev mode:
`ABCDEF+Calibri-Bold`, `Arial-BoldMT`, `TimesNewRomanPS-ItalicMT`, `CourierNewPSMT`, `Helvetica`, `XYZABC+SomethingUnknown`.
Expected: carlito bold, arimo bold, tinos italic, cousine, arimo, arimo.

### 4.4 `fontLoader.ts`
Export:
```ts
type LoadedFont = {
  key: string                 // e.g. 'carlito-bold'
  bytes: ArrayBuffer          // for pdf-lib
  cssFamily: string           // for browser preview, e.g. 'FPE-carlito-bold'
  unitsPerEm: number
  ascent: number              // in em units (ascent / unitsPerEm), positive
  descent: number             // in em units, positive number
  measure: (text: string, fontSize: number) => number   // width in PDF points
}
async function loadFont(m: MatchedFont): Promise<LoadedFont>
```
Rules:
- Fetch `/fonts/<Family>-<Style>.ttf` where Style is `Regular | Bold | Italic | BoldItalic`.
- Cache each font in a `Map`. Load only when needed (lazy), never all 16 at startup.
- Register for the browser: `new FontFace(cssFamily, bytes)`, `await face.load()`, `document.fonts.add(face)`.
- Read `ascent`, `descent`, `unitsPerEm` using fontkit: `import fontkit from '@pdf-lib/fontkit'` then `fontkit.create(new Uint8Array(bytes))`. Convert to em units. `descent` must be stored as a positive number.
- `measure(text, size)` = sum of glyph advance widths from fontkit: `font.layout(text).glyphs` → `advanceWidth / unitsPerEm * size`. This is the ONLY way text width is measured anywhere in the app. Do not use canvas `measureText`.

## 5. Data model changes

Replace the old `TextObject` with this. Remove the old `height` and `coverOriginal` fields from text objects.

```ts
type TextObject = {
  id: string
  type: 'text'
  page: number
  // position (PDF points, top-left origin, y down, as defined in PROJECT_SPEC 5.2)
  x: number                  // left edge of the text
  baselineY: number          // y of the text baseline
  // content
  text: string
  // font
  fontFamily: 'arimo' | 'carlito' | 'tinos' | 'cousine'
  bold: boolean
  italic: boolean
  fontSize: number           // what the user/engine wants (starts as original size)
  color: string              // hex text color
  // only for edits of existing text (null for "Add Text")
  original: null | {
    text: string             // original string
    x: number
    width: number            // original width in points
    fontSize: number
    bgColor: string          // hex, sampled from the page
    maxRight: number         // x where the next text on the same line starts (or page right margin)
  }
}
```

`TextRun` (output of `extractText`, one per LINE fragment group) must contain: `text, x, width, baselineY, fontSize, pdfFontName, bold, italic, color, bgColor, maxRight, page`.

## 6. `extractText.ts` rules

For each page, run AFTER the page canvas finished rendering (the page's fonts are then loaded in pdf.js).

1. `getTextContent()` items → keep only items with non-empty `str.trim()`.
2. Skip rotated text: keep an item only if `Math.abs(transform[1]) < 0.01` and `Math.abs(transform[2]) < 0.01`. (Rotated text is not editable in MVP.)
3. For each item (PDF coordinates, y up):
   - `fontSize = Math.hypot(transform[2], transform[3])`  (NOT `item.height`)
   - `x = transform[4]`
   - `baselineY = pageHeight - transform[5]`  (convert to our top-left model using `coords.ts`)
   - `width = item.width`
4. **Merge into lines:** sort items by `baselineY`, then by `x`. Two items belong to the same run if ALL are true:
   - `Math.abs(baselineA - baselineB) < fontSize * 0.2`
   - `Math.abs(fontSizeA - fontSizeB) < 0.5`
   - gap between end of A (`xA + widthA`) and start of B is less than `fontSize * 0.6`
   Merged `text` = A.text + B.text, where if the gap is bigger than `fontSize * 0.15` and A does not end with a space, insert one space.
   A bigger gap means a different run (for example, separate table columns stay separate).
5. Font: for each run, take the first item's `fontName` and get the real font:
   ```ts
   let real: any = null
   try { real = page.commonObjs.get(item.fontName) } catch {}
   const pdfFontName = real?.name ?? textContent.styles[item.fontName]?.fontFamily ?? ''
   ```
   Then `matchFont(pdfFontName, real)`.
6. `maxRight`: for each run, find the nearest run on the same line (baseline within `fontSize * 0.5`) that starts to the right of this run's end. `maxRight = thatRun.x - 2`. If none: `maxRight = pageWidth - 20`.
7. Colors: call `sampleColors()` (Section 7) once per run and fill `color` and `bgColor`.

The Select/Edit tool must now show ONE clickable box per run (not per pdf.js item).

## 7. `sampleColors.ts`

```ts
function sampleColors(canvas: HTMLCanvasElement, scale: number, box: {x:number,y:number,width:number,height:number}): { color: string; bgColor: string }
```
- `scale` = canvas pixels per PDF point (zoom × devicePixelRatio).
- `box` = run box in PDF points: `x`, top = `baselineY - fontSize*0.9`, `width`, `height = fontSize*1.15`.
- Read pixels with `getImageData` from the box area (clamp inside the canvas).
- **bgColor:** read a ring 2 pixels wide just OUTSIDE the box (left and right edges plus top and bottom edges). Quantize each channel to steps of 8 and take the MOST FREQUENT color. If anything fails → `#FFFFFF`.
- **color:** inside the box, pick the pixel whose distance from bgColor is largest, but only if that distance is more than 60 (sum of absolute channel differences). Otherwise → `#000000`.
- Always return hex strings like `#1A2B3C`. Never throw.
- IMPORTANT: sample from the page canvas, which contains only the original PDF (the edit overlay is a separate element, so it does not affect the canvas).

## 8. `layoutText.ts` (the heart)

Pure function: no DOM, no React, no pdf-lib, no side effects.

```ts
type Layout = {
  fontSize: number            // final size
  textX: number
  baselineY: number
  width: number               // measured width of the new text at final size
  cover: null | { x: number; y: number; width: number; height: number; color: string }
  fit: 'ok' | 'shrunk' | 'overflow'
  warning: string | null
}
function layoutText(obj: TextObject, font: LoadedFont): Layout
```

Algorithm:
1. `size = obj.fontSize`.
2. `w = font.measure(obj.text, size)`.
3. If `obj.original` is null (new text): no cover, `fit = 'ok'`, return.
4. Else (edit of existing text):
   - `available = obj.original.maxRight - obj.x`
   - If `w <= available` → `fit = 'ok'`.
   - Else: `minSize = obj.original.fontSize * 0.75`; `needed = size * available / w`.
     - If `needed >= minSize` → `size = needed`, recompute `w`, `fit = 'shrunk'`, `warning = 'Text was reduced to fit the space.'`
     - Else → `size = minSize`, recompute `w`, `fit = 'overflow'`, `warning = 'Text is too long for this space and may overlap nearby text.'`
5. **Cover rectangle** (hides the original text), with `pad = 1.5`:
   - `left = min(obj.x, original.x) - pad`
   - `right = max(obj.x + w, original.x + original.width) + pad`
   - `top = baselineY - font.ascent * original.fontSize - pad`
   - `bottom = baselineY + font.descent * original.fontSize + pad`
   - color = `original.bgColor`
   - The cover must be wide enough to hide the ORIGINAL text completely even if the new text is shorter.
6. Return the Layout. The function must give identical results every time for the same input.

## 9. Preview (on screen)

- Render a TextObject using ONLY the `Layout`:
  1. If `layout.cover`: draw a `div` at the cover rectangle with `background = cover.color`.
  2. Draw the text as a single `span` / `contentEditable` element with: `font-family: font.cssFamily`, `font-size: layout.fontSize * zoom` px, `color: obj.color`, `white-space: pre`, `overflow: visible`, `line-height: 1`, positioned so its baseline lands on `layout.baselineY`: `top = (layout.baselineY - font.ascent * layout.fontSize) * zoom`. Set the element `height` to `(font.ascent + font.descent) * layout.fontSize * zoom` and use `line-height` equal to that same height so the baseline math holds.
- **No wrapping, ever.** `white-space: pre`. Pressing Enter COMMITS the edit (does not insert a newline). Escape cancels and restores the previous text. Multi-line text is NOT supported in this version.
- On every keystroke: update `obj.text`, recompute `layoutText`, re-render live (so shrinking is visible while typing).
- If `layout.warning` exists, show it as a small red text under the toolbar and give the text an orange dashed outline while `fit !== 'ok'`.
- The `fontSize` shown in the layout is a display result. Do NOT write it back into the object (the object keeps the user's desired size, so deleting characters grows the text back).

## 10. Export

In `exportPdf.ts`, for every TextObject:
1. `pdfDoc.registerFontkit(fontkit)` once.
2. Embed the needed font with `pdfDoc.embedFont(font.bytes, { subset: true })`. Cache one embedded font per font key per export.
3. `const layout = layoutText(obj, font)`.
4. If `layout.cover`: `drawRectangle` with that color, no border. Convert y with `coords.ts` (`pdfY = pageHeight - y - height`).
5. `drawText(obj.text, { x: layout.textX, y: pageHeight - layout.baselineY, size: layout.fontSize, font: embedded, color })`. Note: `y` here is the BASELINE in PDF coordinates.
6. Remove the old Helvetica path for text completely. (Helvetica stays only as an emergency fallback if font loading failed, and then show a warning.)
7. If a character is not in the font, catch the error and show: "Some characters are not supported yet (for example Hindi/Marathi). Please remove them." Do not crash.

## 11. Add Text tool

Uses the same engine: `original = null`, default `fontFamily = 'arimo'`, `bold = false`, `italic = false`, `fontSize = 14`, `color = '#000000'`, `x` = click x, `baselineY` = click y + fontSize. No cover. Add small toolbar controls (only when a text object is selected): font family dropdown (4 options), Bold toggle, Italic toggle, size number input, color input. Changing them updates the object; preview and export follow automatically through `layoutText`.

## 12. Build order (one step, then STOP)

**Step A: Fonts.** Add dependency, `fontMatcher.ts` with `debugMatchFont()`, `fontLoader.ts`, `public/fonts/README.txt`.
Test: console shows the expected results from 4.3. Load `carlito-bold` and log its `ascent`, `descent`, and `measure('Hello', 12)` (all must be sensible numbers).

**Step B: Extraction.** `sampleColors.ts`, `extractText.ts`, new `TextRun` type, edit boxes per run.
Test: open the sample PDF in select mode. Boxes cover whole lines, not single words. Console log for one run: `text, fontSize, baselineY, family, bold, color, bgColor`. Values must look right (a normal black text on white shows `#000000` and `#FFFFFF`).

**Step C: Layout.** `layoutText.ts` and the new `TextObject` type.
Test with a temporary dev log: original `"ABC"` replaced by a text 3 times longer with `maxRight` close → `fit` is `shrunk` or `overflow`; shorter text → `ok`.

**Step D: Preview.** Section 9. Remove the old preview code for text.
Test: edit text in the PDF. The edited text sits on the same baseline as its neighbours, uses a similar font, no wrapping, no white box on colored backgrounds.

**Step E: Export.** Section 10.
Test: download and open in another PDF viewer. The result must look the same as the preview (same position, size, font, cover).

**Step F: Add Text + toolbar controls.** Section 11.

**Step G (later, only if I ask): Hindi/Marathi** using a Noto Sans Devanagari font and per-character fallback.

## 13. Acceptance tests (all must pass before we call it done)

1. A longer name replacing a shorter name in the same table cell: stays on ONE line, no overlap with the next column; shrinks slightly if needed and shows the warning.
2. A shorter text: the original is fully hidden, no leftover pixels from the old text.
3. Text on a gray or colored background: the cover box matches the background color, not white.
4. Bold original text → edited text is bold.
5. Edited text baseline is aligned with the neighbouring text on the same line (zoom 100% and 200%).
6. Preview and downloaded PDF look the same.
7. Typing 3 characters then deleting them restores the original size.
8. No console errors. Works in Chrome on desktop and on Android.

When Step A is done, STOP and wait for me to say "next".
