# FreePDFEdit

FreePDFEdit is a browser-only PDF editor. Files stay on the user's device; there is no account, backend, upload, or watermark.

## Run locally

```bash
npm install
npm run dev
```

Create a `.env` file when needed:

```env
VITE_SHOW_ADS=false
```

Production builds can be checked with:

```bash
npm run build
npm run preview
```

## Deploy

### Vercel

1. Import the repository into Vercel.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add `VITE_SHOW_ADS=true` only when real ad code is configured.

### Cloudflare Pages

1. Create a Pages project from the repository.
2. Set the build command to `npm run build`.
3. Set the build output directory to `dist`.
4. Add `VITE_SHOW_ADS=true` only when real ad code is configured.
