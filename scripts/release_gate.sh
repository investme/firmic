#!/usr/bin/env bash
set +e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

echo "============================================================"
echo "FIRMIC LOCAL RELEASE GATE"
echo "============================================================"

echo
echo "[1/3] Backend release gate"

(
    cd "$ROOT/Backend" || exit 1
    python scripts/release_gate.py
)
RC=$?

if [ "$RC" -eq 0 ]; then
    echo "BACKEND_GATE=PASS"
else
    echo "BACKEND_GATE=FAIL"
    FAIL=$((FAIL+1))
fi

echo
echo "[2/3] Frontend TypeScript"

(
    cd "$ROOT/frontend" || exit 1
    ./node_modules/.bin/tsc --noEmit --pretty false
)
RC=$?

if [ "$RC" -eq 0 ]; then
    echo "TYPESCRIPT_GATE=PASS"
else
    echo "TYPESCRIPT_GATE=FAIL"
    FAIL=$((FAIL+1))
fi

echo
echo "[3/3] Frontend production build"

(
    cd "$ROOT/frontend" || exit 1
    npm run build
)
RC=$?

if [ "$RC" -eq 0 ] &&
   [ -f "$ROOT/frontend/.next/BUILD_ID" ]; then
    echo "NEXT_BUILD_GATE=PASS"
else
    echo "NEXT_BUILD_GATE=FAIL"
    FAIL=$((FAIL+1))
fi

echo
echo "============================================================"
echo "LOCAL_RELEASE_GATE_FAILURE_COUNT=$FAIL"

if [ "$FAIL" -eq 0 ]; then
    echo "LOCAL_RELEASE_GATE=PASS"
else
    echo "LOCAL_RELEASE_GATE=FAIL"
fi

echo "DATABASE_MUTATION=NONE"
echo "============================================================"

[ "$FAIL" -eq 0 ]
