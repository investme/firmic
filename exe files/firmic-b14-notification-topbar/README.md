# B14 Executive Top Bar + Notification OS

Replace:
- pages/_app.tsx
- pages/dashboard.tsx
- components/FirmicSidebar.tsx

Add:
- components/ExecutiveTopBar.tsx
- src/os/notifications/index.tsx

Restart:
```bash
rm -rf .next
npm run dev
```

Test the dashboard, notification bell, sidebar unread badge, Ctrl+K actions,
mark-all-read, refresh, and Notification Archive link.

Read state is persisted locally because no backend mark-read endpoint contract
was included in the uploaded files.
