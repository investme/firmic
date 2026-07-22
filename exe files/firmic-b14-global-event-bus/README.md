# B14.3.6 — Global Event Bus

This package adds Firmic's application-wide event infrastructure.

## Add

Copy:

```text
src/os/events/
```

into:

```text
frontend/src/os/events/
```

## Update `pages/_app.tsx`

Import:

```tsx
import {
  ActionEventBridge,
  FirmicEventSystem,
} from "../src/os/events";
```

Use this provider order:

```tsx
<OSProvider>
  <FirmicEventSystem>
    <FirmicActionSystem>
      <ActionEventBridge />
      <Component {...pageProps} />
    </FirmicActionSystem>
  </FirmicEventSystem>
</OSProvider>
```

Keep your existing workspace, authentication and route-protection
providers in their current positions. The important rule is:

```text
OSProvider
  Event System
    Action System
      ActionEventBridge
      Application
```

## Test

Restart:

```bash
rm -rf .next
npm run dev
```

Then trigger one of the launcher actions.

`ActionEventBridge` automatically emits:

```text
action.started
action.completed
action.failed
```

## Publish an event

```tsx
const { publish } = useEvents();

await publish({
  type: FIRMIC_EVENTS.TASK_CREATED,
  payload: {
    id: task.id,
    title: task.title,
  },
  metadata: {
    source: "tasks-module",
    workspaceId: workspace.id,
  },
});
```

## Subscribe

```tsx
useEffect(() => {
  return subscribe(
    FIRMIC_EVENTS.TASK_CREATED,
    (event) => {
      refreshTasks();
      console.log(event.payload);
    },
  );
}, [subscribe]);
```

## Subscribe to every event

```tsx
useEffect(() => {
  return subscribeAll((event) => {
    console.log("[Firmic Event]", event);
  });
}, [subscribeAll]);
```

## Included capabilities

- Typed event envelopes
- Exact event subscriptions
- Wildcard subscriptions
- One-time subscriptions
- Async event handlers
- Handler failure isolation
- Event history
- Filtering by type, source, workspace and correlation
- Configurable history limit
- Action Engine integration
- SSR-safe event IDs
