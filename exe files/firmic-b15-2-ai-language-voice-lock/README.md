# Firmic B15.2 — Sonny English Voice Lock

This package fixes the actual voice issue in the current Sonny page.

The current implementation selects a preferred voice by name, but it does not
set `utterance.lang`. Browser speech voices also load asynchronously. When
`getVoices()` returns an empty list, the browser falls back to the computer's
default voice, which can be German, Swiss German, French, or another language.

## Add these frontend files

Copy:

```text
frontend/src/os/ai/language.ts
frontend/src/os/ai/voice.ts
frontend/src/os/ai/index.ts
```

## Update `pages/sonny.tsx`

### 1. Add this import

```tsx
import {
  getFirmicAILanguage,
  speakEnglish,
  stopFirmicVoice,
} from "../src/os/ai";
```

### 2. Replace the complete existing `speak` function with

```tsx
async function speak(text: string) {
  if (!voiceEnabled) return;

  await speakEnglish(text, {
    rate: 0.92,
    pitch: 0.96,
    volume: 1,
    onStart: () => setSpeaking(true),
    onEnd: () => setSpeaking(false),
    onError: () => setSpeaking(false),
  });
}
```

### 3. In `startListening()`, replace

```tsx
recognition.lang = "en-US";
```

with:

```tsx
recognition.lang = getFirmicAILanguage().speechRecognitionCode;
```

### 4. Replace voice cancellation calls where convenient

```tsx
window.speechSynthesis?.cancel?.();
```

with:

```tsx
stopFirmicVoice();
```

The old cancellation calls are still safe, so this step is optional.

## Why this fix is reliable

- Explicitly sets `utterance.lang = "en-US"`.
- Waits for browser voices to finish loading.
- Selects only voices whose language code begins with `en`.
- Refuses to use the browser's foreign default voice.
- Keeps speech recognition locked to English.
- Centralizes the voice policy for Sonny, Hermes, Julia, and future agents.

## Optional backend AI policy

Add:

```text
backend/services/ai/language_policy.py
```

When Firmic later calls an LLM directly, prepend:

```python
from services.ai.language_policy import FIRMIC_AI_LANGUAGE_POLICY

system_prompt = f"{FIRMIC_AI_LANGUAGE_POLICY}\n\n{agent_specific_prompt}"
```

Your current `sonny_chat.py` produces deterministic executive responses and
does not currently show a direct model system-prompt call. Therefore, the
foreign-language speech heard today is primarily a browser voice-selection
problem, not Sonny's backend deciding to write in German.

## Test

1. Restart the frontend.
2. Open Sonny.
3. Keep `Voice enabled`.
4. Ask: `Give me today's executive brief.`
5. Confirm the visible answer is English.
6. Confirm the spoken voice is English.
7. Refresh the page and repeat.
8. Test once in Chrome and once in Edge.

## Restart

Frontend:

```bash
cd frontend
rm -rf .next
npm run dev
```

No database migration is required.
