# Firmic B15.3 Phase 3 — Shared AI Execution Engine

This phase extracts Sonny's reusable execution state, confirmation behavior,
request lifecycle, and safe action runner into the Firmic AI Core.

## Copy

```text
src/os/ai/execution
```

Then replace:

```text
pages/sonny.tsx
```

Keep B15.2 and B15.3 Phases 1–2 already installed.

## Extracted

- Shared execution stages
- Working state
- Pending confirmations
- Pending AI plans
- AbortController lifecycle
- Confirm/cancel behavior
- Safe reusable action runner
- Execution progress-step definitions
- Unmount cleanup

## Still Sonny-specific

- Sonny backend chat calls
- Plan formatting
- Sonny navigation actions
- Operational dashboard refresh
- Meaning of each Sonny action

## Test

1. Send a normal command.
2. Confirm progress stages appear.
3. Trigger an approval action.
4. Confirm it using the button.
5. Trigger another and cancel it.
6. Test typed `confirm`.
7. Test typed `cancel action`.
8. Test task and orchestration controls.
9. Interrupt a request.
10. Switch workspaces and repeat.
11. Confirm errors still show correctly.

## Restart

```bash
cd frontend
rm -rf .next
npm run dev
```

No backend migration is required.

## Status

- Phase 1: Voice and speech — complete
- Phase 2: Conversation and streaming — complete
- Phase 3: Execution and confirmation — complete
- Next: Shared AI context and memory
