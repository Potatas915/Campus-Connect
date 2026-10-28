# Core MTP website completion — 29 October 2026

The approved core scope is implemented in Campus-Connect and its existing development Supabase backend. This is acceptance evidence for the exercised core workflows, not formal sign-off on every provisional appendix provision or nonfunctional campaign in the MTP.

## Delivered

- Durable portal confirmations: pending/ready/failed/inactive records; event-naming message and ticket reference; student access and organizer-scoped retry. Registration remains accepted if publishing/network fails. Repeated publication does not duplicate the message or registration. Cancellation retains history and deactivates confirmation.
- Real browser QR input: explicit camera start/stop, software decoder loaded on demand, exact-payload paste fallback, distinct validation outcomes and Scan next. Permission/route/logout cleanup releases media tracks; delayed old camera requests cannot clear a newer preview. Server remains the authority for event, ownership, ticket identity and attendance.
- Reports: five-second full-snapshot refresh, manual refresh, last-success time and visible stale/error guidance. Network/focus failures retain the last loaded report. Superseded requests cannot clear newer state. A committed registration no longer invites a second insert if its follow-up refresh fails.
- Data-preserving migration `supabase/migrations/20261029010000_registration_notifications.sql`, type generation, setup documentation and repeatable browser acceptance tests.

## Exact verification

| Check | Actual result |
| --- | --- |
| `npm.cmd test` | **PASS: 9 files, 36 tests.** Real PGlite PostgreSQL migration/RLS/seed/backfill tests, service boundaries and React/camera regressions. |
| `npm.cmd run lint` | **PASS.** Includes corrected Node fetch global for retained audit script. |
| `npm.cmd run build` | **PASS.** React Router directive and >500 KB chunk notices remain nonfatal. QR decoder is dynamically imported on camera use. |
| Core browser flow + signup | **2 PASS**, Microsoft Edge 156.0.4314.50, 47.4 seconds for the final paired run. |
| Organizer UI lifecycle | **1 PASS**, 11.5 seconds including runner setup. Create, edit, invalid-capacity form boundary, open, cancel. |
| Responsive visual/read-only check | **1 PASS**, 7.2 seconds including runner setup. Desktop report and 390px scanner captured and visually inspected; no document horizontal overflow. |
| Hosted migration | Dry-run inspected; additive notification migration applied to **fcpegloywagntqpeaocx** through authenticated CLI. No reset/reseed/deletion. The connected MCP pointed elsewhere and was not used to mutate that project. |
| Fresh independent review | Three important recovery findings reproduced with failing tests and fixed: old camera stream cleanup; focus/stale refresh clearing data; accepted registration offering another insert. Covered by passing regression tests. |

Browser commands require `MTP_DEVELOPMENT_TEST=1`, browser-safe `.env.local` configuration and the designated seeded development backend. The final paired run executed the core and signup tests; the lifecycle and visual tests were then executed separately with `--grep`. They were not represented as a single four-test execution.

## Twelve-condition ledger

Baseline: Main VI and detailed Appendix B of root `Cictematic_Solution_MTP.docx`. Incompatible older summaries and reused IDs are not merged.

| Condition | Result and evidence |
| --- | --- |
| TCND-01 | **PASS exercised branches:** actual student route redirected and API creation refused; SQL tests deny role escalation and private rows. Actual website signup yielded a student account and denied report route access. |
| TCND-02 | **PASS logical-session race:** simultaneous registration clicks in independently authenticated browser contexts accepted exactly one registration at capacity 1; loser saw full. **Physical two-device branch not executed.** |
| TCND-03 | **PASS:** duplicate refused with clear message and no second stored registration. Database uniqueness is retained. |
| TCND-04 | **PASS exercised set:** one ticket for the accepted registration; event/registration/ticket IDs checked, malformed submission rejected later. Actual issued QR rendered and decoded from a synthetic video stream. No large-volume uniqueness campaign. |
| TCND-05 | **PASS:** issued A payload rejected at B with zero B attendance. |
| TCND-06 | **PASS exercised repeats:** UI repeats plus simultaneous independently authenticated API repeats left exactly one attendance row. Simultaneous first scans from physical devices remain unverified. |
| TCND-07 | **PASS:** held-open report picked up a remote terminal check-in and matched stored attendance. SQL and UI regressions separately prove refresh failure retention and stale-request protection. |
| TCND-08 | **PASS composed evidence:** hosted browser publishing request was deliberately aborted; accepted registration/ticket remained and organizer saw pending, retried and published the named event/ticket-linked confirmation. A forced internal publisher failure in disposable SQL tests produced failed status with safe error, preserved registration and recovered by authorized retry. No production failure switch or SMTP claim. |
| TCND-09 | **PASS exercised branches:** owned future draft created/edited/opened and cross-organization update denied. Separate actual website form test covered create/edit/open/cancel and rejected invalid capacity. |
| TCND-10 | **PASS:** held-open details changed from zero to one remaining after withdrawal without reloading; local regressions also cover another session filling a seat and rejected-action refresh. |
| TCND-11 | **PASS:** actual scanner page submitted valid, repeat, wrong-event, malformed and another repeat without restart; synthetic camera input decoded the issued QR and returned repeat; Stop camera worked. Physical-camera/browser matrix remains unverified. |
| TCND-12 | **PASS:** cancelled-event check-in refused with a different outcome from wrong event; prior registration/ticket/attendance retained. |

Machine-readable successful-run observations and fixture event IDs are in [core-browser-evidence.json](core-browser-evidence.json). Screenshots: [phone scanner](scanner-mobile.png), [attendance report](attendance-report.png). No Auth tokens, browser storage state or Playwright traces are retained in these artifacts.

## Data, scope and remaining limits

- The migration backfill test loads the old schema/real synthetic seed, applies the new migration, and compares original ticket IDs/payloads unchanged. Eligible historical registrations receive pending confirmations; cancelled history is skipped. The hosted migration did not reseed any data.
- Browser runs create distinct named synthetic events/registrations and reserved example.com signup identities and retain them. Interrupted development runs also left synthetic fixtures; they were not silently deleted. Only explicitly named new test fixtures were cancelled as part of cancellation acceptance. Prior QA records remain.
- Website-only scope remains. No native app, payment, email/push delivery, QR signing/expiry/scan-time policy, offline queue or unchecked manual attendance override was introduced. These are excluded/provisional decisions, not hidden implementation work.
- Not certified: physical camera behavior, exact physical two-device races, Firefox/Safari/full mobile browser matrix, sustained launch-peak load, a complete formal security/accessibility campaign, production deployment/SMTP, stakeholder approvals or full MTP exit. No percentage-complete or defect-free claim is made.
- Local frontend configuration was restored for the verified existing development backend; no service-role key is used in frontend variables. Development server is available at `http://127.0.0.1:5173` while its process remains running.
- The browser QR library and camera API integration follow the [ZXing browser documentation](https://github.com/zxing-js/browser); browser automation uses the [Playwright supported Edge channel](https://playwright.dev/docs/browsers#google-chrome--microsoft-edge). These links support the implementation references, not an external product certification.

Final hosted invariant read after acceptance: **24 registrations / 24 tickets / 6 attendance / 17 confirmations; 0 over-capacity events; 0 mismatched notification event/student ownership**. Current source SHA-256 fingerprints are in source-fingerprints.json.
