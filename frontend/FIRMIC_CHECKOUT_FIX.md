# Firmic Checkout Lifecycle Fix

This package completes the checkout lifecycle correction.

## Correct behavior

- If the active company has no headquarters, checkout rents the selected headquarters once.
- If the active company already has the same headquarters, checkout does not call the rent endpoint again.
- If the company has a different active headquarters, checkout stops with a clear instruction instead of creating a conflicting rental.
- Existing tenants reconfiguring services automatically reuse their active headquarters.
- The confirmed order remains the single source of truth for checkout, dashboard billing, billing ledger, service summary, invoice, VAT, first payment, recurring payment, and saved payment method.

## Important MVP behavior

The card form records an MVP demonstration payment only. It stores card brand, cardholder name, and last four digits. It does not store the full card number or CVV and does not charge an external gateway.
