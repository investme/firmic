# Firmic B15.3 — Shared AI Core, Phase 1

This is a safe first extraction from the working Sonny page.

## What moved out of `sonny.tsx`

- English text-to-speech
- Speech-recognition lifecycle
- Listening/speaking state
- Browser cleanup
- Shared error handling

The new reusable hook is:

```text
src/os/ai/hooks/useFirmicAIVoice.ts
```

It can later be used by Hermes, Julia, and every other AI worker.

## Install

1. Copy the folder:

```text
src/os/ai/hooks
```

into your frontend project.

2. Replace your current:

```text
pages/sonny.tsx
```

with the supplied file.

3. Keep the B15.2 files already installed:

```text
src/os/ai/language.ts
src/os/ai/voice.ts
src/os/ai/index.ts
```

## Important

The supplied page preserves Sonny's existing dashboard, orchestration,
confirmation, navigation, streaming, tasks, documents, and workspace logic.
It also preserves the approved heading:

```text
Good evening. Operational Review Completed.
```

## Test

```bash
cd frontend
rm -rf .next
npm run dev
```

Then verify:

1. Sonny opens normally.
2. The active workspace changes correctly.
3. Voice output is English.
4. Voice recognition works in Chrome or Edge.
5. Interrupt stops speaking/listening.
6. Navigation commands still execute.
7. Approval flows still work.

## Scope

This is intentionally the low-risk phase of B15.3. Chat streaming and action
execution remain inside the page for now, so the working orchestration flow is
not destabilized tonight.
