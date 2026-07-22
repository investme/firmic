# B14.3.5 — Universal Action System

This package adds Firmic's shared action registry and execution engine.

## Add

Copy the complete folder:

```text
src/os/actions/
```

into:

```text
frontend/src/os/actions/
```

## Update `pages/_app.tsx`

Import:

```tsx
import { FirmicActionSystem } from "../src/os/actions";
```

Place it **inside `OSProvider`**:

```tsx
<OSProvider>
  <FirmicActionSystem>
    <Component {...pageProps} />
  </FirmicActionSystem>
</OSProvider>
```

Keep any existing providers and protected-route logic in their current order.

## Test

Restart the frontend:

```bash
rm -rf .next
npm run dev
```

Press `Ctrl + K`.

The launcher should now show:

- Create company
- Create task
- Upload document
- Book meeting
- Invite employee

Selecting an action navigates to the relevant workflow.

## Architecture

Modules can register their own action:

```tsx
const { registerAction } = useActions();

useEffect(() => {
  return registerAction({
    id: "billing.invoice.create",
    title: "Create invoice",
    category: "Billing",
    execute: async () => {
      return { success: true };
    },
  });
}, [registerAction]);
```

AI agents will later call the same execution layer:

```tsx
await executeAction("billing.invoice.create", {
  customerId: "customer-123",
});
```
