# Firmic UI Polish — Priority 1A

This package delivers the first Executive Experience polish sprint without
backend or database changes.

## Included

```text
pages/dashboard.tsx
pages/sonny.tsx

src/os/ui/
├── AIOnlinePill.tsx
├── AnimatedMetric.tsx
├── ExecutiveExecutionProgress.tsx
├── useLiveRelativeTime.ts
└── index.ts
```

## Install

1. Copy `src/os/ui` into the frontend.
2. Replace `pages/dashboard.tsx`.
3. Replace `pages/sonny.tsx`.
4. Keep all B15.2 and B15.3 files already installed.

## Improvements

### Command Center
- Live `Reviewed X seconds ago`
- Animated executive metric values
- AI Online pulse with active workforce count
- Premium hover movement and shadows on KPI cards
- Refreshing state stays connected to the review timestamp

### Sonny
- Live operational review timestamp
- AI workforce pulse indicator
- Cleaner `Operational Review Complete` wording
- Connected step-by-step execution line
- Active, completed, and upcoming execution states
- Responsive horizontal progress display

## Test

1. Open Command Center and watch KPI values animate.
2. Confirm the review timestamp updates each second.
3. Press Refresh and confirm the timestamp resets.
4. Confirm the AI Online pulse is visible.
5. Open Sonny and confirm its review timestamp.
6. Send a normal Sonny request.
7. Trigger an action requiring approval.
8. Confirm the execution line advances through the stages.
9. Test Interrupt.
10. Check desktop and tablet widths.

## Restart

```bash
cd frontend
rm -rf .next
npm run dev
```

No backend migration is required.
