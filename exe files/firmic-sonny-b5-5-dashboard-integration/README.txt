FIRMIC B.5.5 — SONNY EXECUTIVE DASHBOARD INTEGRATION

REPLACE:
- pages/sonny.tsx
- services/sonnyApi.ts

REQUIREMENT:
B.5.4 backend must be installed and running.

NO DATABASE MIGRATION.
NO BACKEND FILES ARE CHANGED.

ADDED:
- Live Agent Registry
- Live orchestration runs
- Assignment queue
- Executive summary
- Run and assignment metrics
- Approve/start orchestration controls
- Approve/accept/start assignment controls
- Workspace isolation
- Partial API failure handling
- Recommendations
- Existing task command support

INSTALL:
1. Back up the existing two files.
2. Replace them with this package.
3. Restart frontend:

cd ~/Desktop/Firmic
npm run dev

4. Open:
http://localhost:3000/sonny

TEST:
1. Verify B.5.4 through Swagger.
2. GET /api/sonny/agents should return 8 agents.
3. Create one orchestration and assignment in Swagger.
4. Refresh /sonny.
5. Confirm the run and assignment appear.
6. Approve/start the run from the page.
7. Approve/accept/start the assignment from the page.

Completion/failure controls remain in Swagger because they require structured payloads.
They will be connected to Sonny commands and voice confirmation in B.6.

NEXT:
B.6 Sonny Voice and Conversational Orchestration.
