# Firmic B15.3 Phase 2 — Shared Conversation & Streaming Core

This phase safely extracts Sonny's conversation state, tenant-local storage,
typing stream, message IDs, auto-scroll, and stream cleanup from `pages/sonny.tsx`.

## Copy

```text
src/os/ai/chat/useAIConversation.ts
src/os/ai/chat/index.ts
```

Then replace:

```text
pages/sonny.tsx
```

with the supplied file.

Keep all Phase 1 and B15.2 files already installed.

## What moved into the shared AI core

- Conversation messages
- Workspace-specific local storage
- Initial AI welcome message
- Message creation and IDs
- Streaming reply animation
- Streaming timer cleanup
- Voice playback after streaming
- Auto-scroll
- Clear-conversation behavior
- Workspace isolation between tenants

## Important tenant protection

Each workspace still uses a separate key:

```text
firmic_sonny_conversation_<workspace-id>
```

Switching from Marks to Soso cannot mix their conversations.

## Test checklist

1. Open Sonny in Marks.
2. Send a message and confirm streaming works.
3. Refresh and confirm the conversation remains.
4. Switch to Soso and confirm Marks messages do not appear.
5. Send a message in Soso.
6. Switch back to Marks and confirm its history returns.
7. Test voice playback after the streamed reply.
8. Test microphone input.
9. Type `clear conversation`.
10. Test Interrupt while Sonny is streaming.

## Restart

```bash
cd frontend
rm -rf .next
npm run dev
```

No backend or database migration is required.

## B15.3 status

- Phase 1: Shared voice and speech hook — complete
- Phase 2: Shared conversation and streaming core — complete
- Next: Shared execution and confirmation engine
