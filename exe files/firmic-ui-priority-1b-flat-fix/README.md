# Firmic Priority 1B Flat Fix

Delete the old folders first:

```bash
rm -rf src/os/ui
```

Then copy this package's complete `src/os/ui` folder.

This version intentionally has **no executive subdirectory**.
All UI components live directly under:

```text
frontend/src/os/ui/
```

Replace `pages/dashboard.tsx`, then restart:

```bash
rm -rf .next
npm run dev
```
