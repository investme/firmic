# Firmic B14.3.3 — Global Search Index

This upgrade turns the command palette into a modular Firmic-wide search engine.

## Replace

Copy these files into `frontend/src/os/`:

- `types.ts`
- `searchEngine.ts`
- `useFirmicSearch.ts`
- `OSProvider.tsx`
- `CommandPalette.tsx`

Keep your existing:

- `OSContext.tsx`
- `useOS.ts`
- `commandRegistry.ts`

## New architecture

Every Firmic module can now register an independent search provider.

Examples:

- Tasks searches tasks
- Documents searches documents
- CRM searches contacts
- Billing searches invoices
- Executive Intelligence searches recommendations
- Sonny searches AI actions

Provider failures are isolated. One broken module will not break global search.

## Register a provider

See:

`src/os/examples/useTaskSearchProvider.ts`

Mount the provider hook once in the relevant authenticated layout or in a future `FirmicSearchProviders` component.

## Test

1. Start frontend and backend.
2. Press Ctrl/Cmd + K.
3. Search for Tasks, Billing, Sonny, or Documents.
4. Confirm loading state appears.
5. Confirm arrow keys and Enter work.
6. Confirm recent selections move upward when reopening the palette.

## Important

The included task provider is an integration example. Its endpoint must be changed to your actual backend task search endpoint.
