CABLES PRO V8.0.0 — PROFESSIONAL EDITION FOUNDATION

This is a clean modular rebuild, not another patch to V7.

WHAT IS INCLUDED
- TypeScript source code
- Compiled static PWA in /dist
- Apple-style responsive interface
- Offline service worker
- Local-first data store
- Dashboard and global search
- Jobs and workflow stages
- Customers
- Diary
- Quotations
- Invoices
- Service contracts
- Technical reports
- Asset register
- Stock control
- Full JSON backup
- en-GB dates and GBP currency formatting

ARCHITECTURE
- src/app.ts: application UI and routing
- src/db.ts: local data and backups
- src/types.ts: typed business models
- public/: PWA assets
- dist/: ready-to-deploy GitHub Pages build

DEPLOY
Upload the CONTENTS of the dist folder to the root of the GitHub Pages repository.

DEVELOPMENT
npm run check
npm run build

IMPORTANT
This V8 foundation is local-first. Secure login, multi-user cloud sync, office/engineer sharing,
automated online email and customer portal access require a hosted backend and are deliberately
not simulated in this release.
