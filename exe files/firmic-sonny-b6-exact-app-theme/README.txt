FIRMIC — SONNY B.6 EXACT APP THEME

REPLACE ONLY:

pages/sonny.tsx

KEEP:

services/sonnyApi.ts
All backend files

SOURCE OF TRUTH:

This correction was built from the real B.6 Voice Orchestrator page,
not the older pre-B.6 Sonny page.

EXACT FIRMIC DESIGN SYSTEM:

Page:
bg-slate-50

Primary cards:
bg-white
border-slate-200
rounded-3xl
shadow-sm

Secondary surfaces:
bg-slate-50
border-slate-200

Headings:
text-slate-950

Descriptions:
text-slate-500

Primary actions:
bg-violet-600
hover:bg-violet-700
text-white

Purple information:
bg-violet-50
border-violet-100
text-violet-700 / text-violet-800

Status colors:
emerald-50/200/700
sky-50/200/700
amber-50/200/700
rose-50/200/700

PRESERVED:

- Sonny voice recognition
- Spoken replies
- Conversation history
- Company reading
- Agent list
- Orchestration controls
- Assignment controls
- Confirmation system
- Assignment hydration
- Completed-run handling

INSTALL:

1. Replace pages/sonny.tsx
2. Do not replace sonnyApi.ts
3. Restart:

cd ~/Desktop/Firmic
npm run dev

4. Hard refresh the browser:

Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
