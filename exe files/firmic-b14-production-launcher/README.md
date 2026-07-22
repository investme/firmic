# Firmic B14 Production Launcher

This version removes the inline `<style>` block and splits the launcher into maintainable components.

## Replace

Replace:

- `frontend/src/os/CommandPalette.tsx`

Add:

- `frontend/src/os/launcher/ExecutiveLauncher.tsx`
- `frontend/src/os/launcher/LauncherSearchInput.tsx`
- `frontend/src/os/launcher/LauncherResults.tsx`
- `frontend/src/os/launcher/LauncherResultRow.tsx`
- `frontend/src/os/launcher/LauncherFooter.tsx`
- `frontend/src/os/launcher/recentItems.ts`

## Important cleanup

Stop the development server, then remove the Turbopack cache:

Git Bash:

```bash
rm -rf .next
npm run dev
```

PowerShell:

```powershell
Remove-Item .next -Recurse -Force
npm run dev
```

This launcher keeps the floating desktop popup and mobile-friendly layout without any inline CSS or template-string styles.
