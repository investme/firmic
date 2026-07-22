FIRMIC B.6 — SONNY VOICE ORCHESTRATOR

REPLACE:

pages/sonny.tsx
services/sonnyApi.ts

REQUIREMENTS:

- B.5.4 orchestration API installed
- B.5.5 assignment-list endpoint installed
- Existing Firmic frontend running
- Chrome or Edge recommended for speech recognition

NO DATABASE MIGRATION.
NO BACKEND FILE REPLACEMENT.

WHAT B.6 ADDS

1. VOICE INPUT
- Browser speech recognition
- Microphone control
- Automatic command submission
- Chrome/Edge fallback warning

2. SPOKEN RESPONSES
- Browser speech synthesis
- Voice on/off toggle
- Read executive brief aloud
- Spoken confirmations and results

3. PERSISTENT CONVERSATION
- Per-company local conversation history
- Up to 80 recent messages
- Chat-style interface
- Workspace isolation

4. SAFE ORCHESTRATION CONTROL
- Approve orchestration
- Start orchestration
- Approve assignment
- Accept assignment
- Start assignment
- Complete assignment
- Complete orchestration
- Confirmation required before every operational write

5. COMPANY READING
- Company progress
- Tasks
- Documents
- Integrations
- Agents
- Orchestration runs
- Assignment lifecycle
- Current approvals
- Completed work

6. LIVE ASSIGNMENT HYDRATION
The page calls the B.5.5 assignment-list endpoint for every run.
This fixes the prior issue where run responses did not include assignments.

7. FINAL SONNY DESIGN
- Firmic dark command-center styling
- Purple visual system
- Conversation-led interface
- Executive brief
- AI workforce panel
- Orchestration timeline
- Operating priorities

SUPPORTED COMMANDS

Read-only:
- Brief me
- Summarize operations
- What happened today?
- Show agents
- Show orchestration status

Writes requiring confirmation:
- Create task: [task title]
- Approve orchestration
- Start orchestration
- Approve assignment
- Accept assignment
- Start assignment
- Complete assignment
- Complete orchestration

Confirmation:
- Confirm
- Proceed
- Yes confirm

Cancellation:
- Cancel
- Cancel action

INSTALL

1. Back up:

pages/sonny.tsx
services/sonnyApi.ts

2. Replace both files.

3. Restart frontend:

cd ~/Desktop/Firmic
npm run dev

4. Open:

http://localhost:3000/sonny

TEST CHECKLIST

A. DATA
- 8 agents visible
- Existing orchestration visible
- Existing Finance AI assignment visible
- Completed assignment status visible

B. CHAT
- Type: Brief me
- Sonny replies in conversation
- Refresh page
- Conversation remains

C. VOICE
- Click microphone
- Allow microphone permission
- Say: Brief me
- Sonny responds and reads the brief aloud

D. SAFE ACTION
Create a new test lifecycle or use a pending item.

Say:
Approve orchestration

Expected:
Sonny asks for confirmation.

Say:
Confirm

Expected:
The endpoint executes and the page refreshes.

E. COMPLETE RUN
After every assignment is completed:
- Say: Complete orchestration
- Confirm
- Run becomes completed

IMPORTANT MVP BOUNDARY

This phase makes Sonny the operational leader of the current MVP.
It does not implement the full specialist intelligence of all 15 agents.
Those agents remain registered and orchestrated, ready for post-acceptance work.

NEXT

1. End-to-end Sonny polish
2. Deployment
3. Pitch deck
4. Hub71 application
