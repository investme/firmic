# Firmic B15.1 — Context-Aware Command Palette

## Add

```text
src/os/contextCommands.ts
```

## Replace

```text
src/os/OSProvider.tsx
```

## What changes

- `Ctrl + K` remains available in both applications.
- Tenant routes show tenant commands only.
- Admin routes show admin commands only.
- Admin mode blocks tenant routes.
- Tenant mode blocks admin routes.
- Tenant search providers do not run in Admin mode.
- Changing between tenant and admin automatically closes and resets the palette.

## Admin route detection

The provider treats these as Admin mode:

```text
/admin
/admin-*
/admin/*
```

## Test

1. Open `/dashboard` and press `Ctrl + K`.
2. Confirm Sonny, Documents, Tasks, Billing, etc. appear.
3. Confirm no Admin commands appear.
4. Open `/admin` and press `Ctrl + K`.
5. Confirm Companies, Offices, Compliance, Billing, Support, AI Admin,
   Reports, Users, and Settings appear.
6. Confirm no tenant workspace result appears.
7. Search for `company` in Admin mode and open `All Companies`.
8. Switch back to `/dashboard` and test the tenant palette again.

## Restart

```bash
rm -rf .next
npm run dev
```
