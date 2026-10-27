# Current Supabase verification — 2026-10-27

The website now uses hosted Supabase Auth/PostgreSQL. The older guide below was written for browser-local demo storage; its accounts, storage inspection, reset and concurrency limitations are historical. Use this section and README.md for current setup. The MTP requirement/risk ambiguities and full-campaign evidence requirements still apply.

## Current checks

Inside `website/`, run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`. These cover the SQL migration/RLS/seed and service boundaries. `npm.cmd run db:types` generates types from a fresh migration-applied local SQL catalog; the checked-in hosted types can instead be regenerated with the official CLI command in README.md.

For an explicitly seeded development project, `node scripts/verify-hosted.mjs --development-test` runs hosted Auth/API checks with independent clients. It creates one named integration event, retains its registration/ticket/attendance evidence, then cancels the event. It does not delete records. Never point this script at a production project.

## Selenium / Jira / Zephyr

Use an isolated browser profile and the synthetic test accounts in README.md. Keep passwords in test-run secret configuration; the shared fixture password is explicitly test-only in seed.sql. Record project, migration version, test account role, event IDs, build, browser/version and timestamp in each Zephyr execution; link failures and evidence to Jira. No external Jira/Zephyr connection or campaign was created by this integration.

| Element | Stable locator |
| --- | --- |
| Auth form | `[data-testid="login-form"]` |
| Email / password | `[data-testid="email-input"]`, `[data-testid="password-input"]` |
| Sign in / signup submit | `[data-testid="login-submit"]` |
| Navigation | `[data-testid="navigation-link"][href="/tickets"]` (choose required href) |
| Event card | `[data-testid="event-card"][data-event-id="EVENT_UUID"]` |
| Registration action | `[data-testid="register-button"]` |
| Confirmation / error | `[data-testid="confirmation-message"]`, `[data-testid="error-message"]` |
| QR ticket / cancellation | `[data-testid="ticket-qr"]`, `[data-testid="cancel-registration"]` |
| Pagination | `[data-testid="previous-page"]`, `[data-testid="next-page"]` |

Wait for visible content and enabled actions rather than fixed sleeps. Test student login, protected-route redirects, filters/pages, registration confirmation, ticket persistence after reload, cancellation retention, organizer draft/open/cancel flow, simulated scans and report totals. Use two independently authenticated clients against the same event for capacity/scan contention; browser-local single-thread tests are not concurrency evidence. Inspect authorized API responses or database invariants without collecting real personal data. Do not reseed mid-campaign.

## Verification scope

Hosted regression evidence covers password login, last-seat contention, duplicates, cancelled registration/seat release, ticket validation, repeat-scan deduplication, report reconciliation, organization isolation, role-escalation denial and signed-out denial. Browser smoke checks cover login, database-backed listings/details, registration, issued QR display, reload persistence and organizer reports. Email signup/confirmation delivery, complete Selenium/browser matrices, sustained load and full MTP exit are separate tests, not implied by these checks.

---

# Historical browser-local prototype guide

# MTP Testing Guide — Student Organization Event Registration System

Source: `../Cictematic_Solution_MTP.docx`, particularly Components VI–XIII and Appendices A–E. Prepared 23 October 2026 for the React frontend prototype in this folder.

This is a testing procedure, not an execution report. Checkboxes mean work to perform; they do not mean tests have passed. Record actual results separately for every build and environment.

## 1. Read this before testing

The MTP was written for a hypothetical three-tier system with REST interfaces, shared storage, and a separate scanning client. The current application simulates these responsibilities using browser storage. Test both the implemented prototype and the remaining system requirements, but report them separately.

| Label | Meaning |
| --- | --- |
| **NOW** | Can be exercised on this prototype using its UI, local storage inspection, or service tests. Results apply to this local implementation only. |
| **PARTIAL** | Some behavior is demonstrable locally; a complete MTP claim needs additional infrastructure or a decision. |
| **BACKEND** | Needs a real API, shared database, independent clients, dependency adapter, or deployment. Record as blocked if unavailable. |
| **DECISION** | An expected result depends on an unresolved contract. Record observations provisionally; do not invent a pass threshold. |
| **EXCLUDED** | Outside the present scope. Retain the reason and the trigger that would bring it into scope. |

### Source conflicts you must preserve

- Use Component VI's REQ-01–REQ-12 definitions and Appendix B's detailed twelve-condition table as this guide's working baseline. Component IV has a different TCND-01–TCND-14 summary; do not silently merge those identifiers.
- REQ-12 in Component VI is **scanner validation interface and recovery**, despite an earlier grouping referring to payment as REQ-12. Scanner testing belongs in the guide; payment remains excluded.
- Open-question IDs D-08–D-11 mean different things in different sections. Record the issue's name and source section as well as its ID. For example, Appendix B refers to notification/offline questions, while Component XII uses some of those IDs for group identity, duplicate rules, and capacity semantics.
- Component IX says an unavailable prerequisite is **Blocked**; Appendix B's repeated fail wording includes cases that cannot be set up. Use Component IX's explicit outcome definitions, and flag this discrepancy for review.
- Component IX's exit list allows signed acceptance of Critical risk, while nearby severity text also says open High defects prevent exit. Keep both visible and obtain the test lead's disposition; a tester cannot waive them unilaterally.
- Component VIII's payment entry criterion is conditional. It does not require adding payment before testing unrelated registration features.
- Browser matrices, accessibility targets, notification guarantees, expiry rules, and performance thresholds remain unconfirmed. Suggested procedures below do not turn those suggestions into MTP requirements.
- Prototype decisions (student-only sign-up, JSON QR fields, local role simulation, no withdrawal) are implementation defaults. They do not automatically close the MTP's open questions.

## 2. Required order and preparation

### 2.1 Campaign order

1. Review the requirements, risks, traceability, and open findings before execution.
2. Record the build, test environment, data seed, assigned tester, and expected results.
3. Run smoke checks.
4. Run Q1 component and integration checks, especially capacity, duplicates, QR construction, and attendance invariants.
5. Run Q2 business workflows and authorization conditions.
6. Run Q3 exploratory, usability, and acceptance sessions.
7. Run Q4 security, peak-load, recovery, and compatibility work where prerequisites exist.
8. Retest fixes, run the regression set against the latest build, and evaluate exit criteria.

The quadrants are perspectives, not four mandatory sequential phases. This ordering follows Component XII's execution guidance; repeat relevant quadrants as changes require.

### 2.2 Entry checklist — complete for each affected item

- [ ] Requirements and risk model reviewed; unresolved findings resolved or explicitly accepted as open.
- [ ] Each case has stable prerequisites, steps, and a written oracle (the observation that determines the result).
- [ ] Build available and identifiable; critical smoke checks run.
- [ ] Required environment operational; prototype substitutions clearly identified.
- [ ] Synthetic valid, invalid, and boundary data available.
- [ ] Student accounts and organizers from at least two organizations available.
- [ ] No real student identifiers, contact information, names, or photographs used as test data.
- [ ] Conditional payment cases remain suspended unless fees are approved and an adapter is available.
- [ ] Assign an owner and a trigger to every blocked or deferred case.

### 2.3 Local setup

Open PowerShell in the `website` folder:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run dev -- --port 5173
```

Open `http://127.0.0.1:5173/`. Keep the server running during browser testing. Record Node/npm versions, browser/version, OS, viewport, timezone, date, and package-lock/build identifier. Keep command output with the run evidence. Node requirements and normal startup instructions are in `README.md`.

All seeded accounts use password `Campus123!`:

| Account | Email | Role / organization |
| --- | --- | --- |
| Alex Santos | student@campus.demo | Student |
| Sam Reyes | sam@campus.demo | Student |
| Jamie Cruz | organizer@campus.demo | Organizer, CICT |
| Morgan Rivera | arts@campus.demo | Organizer, Creative Arts Society |

Use additional fictional student accounts when needed. Independent browser profiles have independent demo databases; they are **not** two clients connected to a common backend. Tabs share localStorage but have per-tab sessions and no guaranteed transaction isolation.

### 2.4 Establish and restore a known data state

1. Save the evidence from the preceding case before resetting.
2. Select **Reset demo data**, read the confirmation, and confirm only for your disposable test data.
3. Verify that the application signs you out and restores the seeded accounts/events.
4. Sign in with the case's specified role.
5. Record any added test accounts, registrations, scans, or draft events.
6. Reset between independent cases; do **not** reset during a sequence intended to test repeat scans, cancellation retention, or persistence.

| Seed event | Purpose |
| --- | --- |
| Beyond the Code: Tech Summit (`tech`) | Open CICT event; Sam already registered; good for registration/check-in/reporting |
| The Creative Playground (`design`) | Open event owned by the other organization |
| Connect & Collaborate (`connect`) | Open CICT event with no seeded registrations |
| Build Your First App (`full`) | Capacity 1, already occupied by Sam |
| Student Leadership Forum (`draft`) | CICT draft for edit/open checks |
| Innovation Night (`cancelled`) | Cancelled CICT event with Sam's retained ticket |
| Campus Sketch Walk (`past`) | Past event for closed-registration checks |

Seeded dates are in September–December 2026. If testing later, create future-dated synthetic events; do not call a legitimately ended event an application failure. Automated tests freeze time at 23 October 2026. Display schedules in Asia/Manila.

### 2.5 Inspect stored evidence, not just screen messages

In browser developer tools, open **Application / Storage → Local Storage → this site's origin → `campus-demo-v1`**. Browser labels vary. Inspect the JSON arrays `events`, `registrations`, `tickets`, and `attendance`. Use Session Storage → `campus-session` to inspect the simulated session ID. Capture only synthetic data.

For the target event, verify independently:

```text
acceptedCount = number of registrations where eventId equals the event
remainingPlaces = capacity - acceptedCount
duplicateCount = registrations for the same eventId AND studentId
ticketCount = tickets for the accepted registrationId
attendanceCount = attendance records for the registrationId
```

Required invariants: `acceptedCount <= capacity`, `duplicateCount <= 1`, `ticketCount = 1` for each accepted registration, and `attendanceCount <= 1`. A rejected action must leave protected records unchanged. Compare before/after record IDs as well as counts: unchanged totals can hide replacement of records.

## 3. Static review and testware checks

These reviews are required testing work. They are not dynamic quadrant executions and should not be counted as such.

### ST-01 — Requirements and contracts (Appendix C)

- [ ] Confirm each REQ-01–REQ-12 has a clear expected result and a valid source.
- [ ] ER-01: review QR fields, encoding, identity scheme, event recoverability, malformed input behavior, and whether integrity/signatures are required.
- [ ] ER-02: agree final-place contention behavior: reject, wait, or queue; define the shared data transaction/isolation contract.
- [ ] ER-03: confirm one active registration per student/event; resolve parallel sessions, withdrawal, cancellation, and seat reissue rules.
- [ ] ER-04: review a role/action matrix, organization ownership, scanner identity, and authentication method.
- [ ] ER-05: obtain measurable performance, recovery, compatibility, availability, scalability, accessibility, and auditability targets, or document qualitative assessment explicitly.
- [ ] Define notification delivery/retry/failure semantics and offline/reconnection behavior by issue name, noting the document's conflicting question IDs.
- [ ] Keep findings open until the decision and affected artifacts are updated. A source gap is not automatically an application defect.

### ST-02 — Risk matrix validation (Appendix A)

For every risk record, inspect its identifier, description, likelihood, impact, score, level, mitigation/test response, priority, and evidence/justification. Confirm the required fields against the actual appendix schema.

- [ ] Recompute `score = likelihood × impact`; both inputs must be on the MTP's 1–5 scale.
- [ ] Confirm High = 16–25, Medium = 8–15, Low = 1–7.
- [ ] Check priority mapping: High → P1; Medium → P2; Low → P3, with any stated exceptions retained.
- [ ] Check the course limits: 6–10 product risks and 2–4 project/test risks.
- [ ] Verify High-risk mitigations trace to conditions in Appendix B.
- [ ] Reconcile counts, scores, levels, and priorities against Component V.
- [ ] Record a reason for changed scores; keep suspended payment risk visible.
- [ ] Review project risks such as environment absence, effort/availability, data loss, and unresolved decisions; name a contingency owner.
- [ ] Do not claim the register is exhaustive or invent financial loss estimates.

### ST-03 — Traceability validation (Appendix B)

- [ ] Check requirement → condition: every REQ-01–REQ-12 has planned coverage.
- [ ] Check condition → requirement: every case links to its basis, or is explicitly exploratory/error guessing.
- [ ] Check risk → condition: every High and Medium risk has a planned response.
- [ ] Check every condition's level, type, technique, priority, quadrant, and oracle.
- [ ] Identify and correct conflicting summary identifiers through a documented review disposition.
- [ ] Preserve blocked/provisional conditions and their dependencies.
- [ ] Link executable case IDs, run evidence, and defects without overwriting original MTP condition IDs.

### ST-04 — Quadrants and principles (Appendices D and E)

- [ ] Q1: technology-facing checks supporting development (invariants, parsing, contracts).
- [ ] Q2: business-facing requirements, student/organizer journeys, event ownership, and reports.
- [ ] Q3: exploratory, usability, and acceptance sessions critiquing the product.
- [ ] Q4: technical critique through security, peak-load, recovery, and compatibility checks.
- [ ] Justify deeper effort on QR validation, attendance, and capacity rather than equal effort everywhere.
- [ ] Explain the seven principles using campaign evidence: limits of passing tests, non-exhaustive selection, early review, defect clustering, refreshed tests, context-driven techniques, and the absence-of-errors fallacy.
- [ ] Retain exploratory sessions and refresh inputs after fixes; repeatedly running the same green suite is insufficient.
- [ ] Review MTP components I–XIX, peer-review disposition, responsibility assignments, schedule, and approvals. Do not copy conflicting names from document sections into an execution assignment without confirmation.

## 4. Smoke tests — every build

Run before detailed cases and after environment recovery.

| ID | Instructions | Expected observation |
| --- | --- | --- |
| SM-01 | Start server; open site and refresh. | App loads; no fatal error or blank screen. |
| SM-02 | Sign in as student; open catalogue, event, and tickets. | Correct role navigation and readable pages. |
| SM-03 | Register for an available event. | Confirmation, one stored registration, one ticket. |
| SM-04 | Sign out; sign in as owning organizer; scan a seeded valid ticket. | One attendance record; scanner stays usable. |
| SM-05 | Open corresponding report. | Student/status and aggregate agree with stored attendance. |
| SM-06 | Refresh a nested route such as `/reports`; log out. | Route still loads locally; session ends; protected screens are unavailable after logout. |
| SM-07 | Inspect console and network activity during the above. | Record errors; no unhandled error prevents the journey. Optional font download failure must not make the interface unusable. |

Save smoke evidence and reset before detailed tests.

## 5. All twelve MTP conditions — detailed instructions

The IDs, risk links, priorities, and quadrant assignments below follow Appendix B's detailed condition table. They are preserved even where another section assigns a different priority. Resolve those disagreements in the reviewed baseline rather than silently changing them.

### TCND-01 — Student role boundary

**Basis:** REQ-01; RSK-05; P1; Component/System; Q2/Q4. **Availability: PARTIAL.** Techniques: equivalence partitioning and decision table.

1. Reset; sign in as Alex. Verify student navigation offers Discover events and My tickets.
2. Type `/manage`, `/scanner`, and `/reports` directly into the address bar, one at a time.
3. Verify the prototype redirects away from organizer functions and returns no organizer-only records through the tested application services.
4. In automated service checks, attempt event creation/status change and scanning under the student session; capture refusal and compare stored records before/after.
5. Log out; revisit protected URLs and use browser Back. Confirm a protected action cannot proceed without a session.
6. Sign up with fictional details; inspect that the granted role is student and cannot be selected as organizer in the UI.
7. Repeat organizer ownership checks with both organizations under TCND-09.

**Oracle/evidence:** UI restrictions plus service denial and unchanged protected records. A missing menu item alone does not prove authorization. A production claim requires API-level denial, no protected records in HTTP responses, and trusted server-side session enforcement. LocalStorage can be tampered with; do not report this demo as secure authorization.

Additional account cases: valid/invalid password; unknown email; duplicate email with case/whitespace variants; empty fields; invalid email; password below eight characters; refresh; logout/login persistence. Verify no account is created by a rejected sign-up.

### TCND-02 — Capacity and simultaneous final-place requests

**Basis:** REQ-03; RSK-03; P1; Component/Component integration; Q1. **Availability: PARTIAL / BACKEND for true concurrency.** Techniques: boundary values and state transition.

1. As CICT organizer, create a future event with capacity **1**, then open registration.
2. As Alex, register successfully. Inspect one registration, one ticket, zero remaining places.
3. As another unregistered fictional student, try to register. Inspect refusal and unchanged count/ticket set.
4. Repeat with capacity **2**: check before any registration, after the first, at capacity, and one attempt beyond capacity.
5. Exercise the seeded full event. Confirm registration is unavailable and a service attempt cannot insert a record.
6. Test capacity creation inputs **0**, **-1**, a fractional value, blank, and nonnumeric input. Verify creation is rejected; use service-level testing where HTML validation prevents submission. Zero is a rejection boundary, not an approved zero-capacity event.
7. **BACKEND:** prepare an event with exactly one remaining place and two distinct students on independent clients sharing the same database. Synchronize submissions with a barrier/load harness rather than relying on manual timing.
8. Release both requests together; inspect each response and the committed registration/ticket rows. Repeat from a restored fixture for a recorded number of runs.

**Oracle:** At capacity 1 exactly one acceptance; remaining contenders receive a distinguishable refusal or the approved contention outcome. Stored accepted count never exceeds capacity; remaining count agrees. No orphan tickets or negative remaining places. Generalize the count assertion to the number of remaining places.

**Evidence:** initial capacity/count, identities, request timing/responses, before/after records, repeat count, environment. Same-runtime Promise calls are useful local checks but are not evidence of distributed concurrency or transaction isolation. Waiting/queue semantics remain DECISION-dependent.

### TCND-03 — Duplicate registration prevention

**Basis:** REQ-04; RSK-04; P2; Component/System; Q1/Q2. **Availability: PARTIAL.** Techniques: requirements-based and equivalence partitioning.

1. Reset; register Alex for Tech Summit and save the registration/ticket IDs.
2. Revisit the event. Confirm the UI shows the existing registration and ticket link.
3. Attempt a second submission through the service test; also test rapid repeated activation if the UI permits it.
4. Refresh and sign out/in; repeat the attempted duplicate.
5. Register Alex for a different open event; confirm this succeeds under the prototype's one-place-per-event assumption.
6. Register another student for the original event if capacity allows; this must not be mistaken for a duplicate.
7. **BACKEND:** submit the same student/event pair simultaneously from two independent clients; inspect committed rows, not only responses.
8. **DECISION:** retain withdrawal/re-registration and overlapping-session cases until those rules are defined. The prototype has no student withdrawal feature.

**Oracle:** At most one active student/event registration; clear refusal to a genuine duplicate; no extra ticket or confirmation; the original ticket stays unchanged. A duplicate error accompanied by a second stored row is a failure.

### TCND-04 — Ticket issuance, uniqueness, and malformed input

**Basis:** REQ-05; RSK-07; P2; Component; Q1. **Availability: NOW locally; PARTIAL for system-wide scale.** Techniques: requirements-based, boundary values, error guessing.

1. Accept a valid registration; inspect exactly one linked ticket.
2. Open My tickets repeatedly, refresh, then sign out/in. Verify the same ticket ID and payload are reused.
3. Attempt full-event, duplicate, cancelled-event, and past-event registrations. Compare ticket arrays before/after; none may issue a new ticket.
4. Create a reproducible synthetic batch across students and events using a test fixture. Record its size; compare all ticket IDs for uniqueness and one ticket per accepted registration.
5. View the QR payload and decode a rendered QR using an independent decoder where available. Confirm the image encodes the stored payload; a JSON view alone does not verify QR rendering.
6. In the scanner choose **Malformed payload**. Check rejection and unchanged attendance.
7. Extend service tests with truncated JSON, substituted characters, `null`, `{}`, missing IDs, unsupported version, and a field altered in an otherwise valid payload. Follow with a valid scan to check recovery.

**Oracle:** one ticket per accepted registration, globally distinct IDs in the tested dataset, no ticket for refusal, no attendance from malformed data. Record batch limits. Signature absence and expiration are contract-dependent; this prototype has no cryptographic signature or ticket expiry field.

### TCND-05 — Event-scoped identity and wrong-event rejection

**Basis:** REQ-06/REQ-07; RSK-01/RSK-07; P1; Component/Integration/System; Q1/Q2. **Availability: NOW locally; PARTIAL for a separate scanner API.** Techniques: decision table, state transition, error guessing.

1. Use two events **A** and **B**. For an unambiguous local test choose two CICT events so organizer ownership is not the cause of refusal.
2. Obtain a ticket issued for A. Decode/read its payload without looking up the registration; event A must be recoverable from the payload itself.
3. As owning organizer, select event B in Event check-in and choose **Wrong-event ticket**. Record which foreign ticket the scenario uses through the service fixture or stored data.
4. Compare attendance before/after. Verify the refusal specifically indicates the event mismatch and does not record attendance.
5. Reverse the event direction in an explicit service fixture and repeat.
6. At the correct event, scan an unused genuine ticket and confirm acceptance.
7. Alter only the event ID, registration ID, or ticket ID in service fixtures. Confirm an inconsistent combination cannot become a valid ticket.
8. Repeat the cross-event presentation using a screenshot/copy of the same payload as an error-guessing variant; copying a QR must not bypass event binding.

**Oracle:** event derivable from payload alone; each wrong-event presentation refused; unchanged attendance rows. This reproduces the class of failure in prior incident DEF-QR-001, which remains historical evidence, not a defect raised by this campaign.

### TCND-06 — Single-count attendance across repeats and devices

**Basis:** REQ-08; RSK-02; P1; Integration/System; Q1/Q4. **Availability: PARTIAL / BACKEND for multi-device guarantee.** Techniques: state transition, boundary values, error guessing.

1. Reset; sign in as CICT organizer; select Tech Summit and Sam's seeded ticket.
2. Simulate a first valid scan. Verify one attendance record linked to Sam's registration.
3. Scan it again, then several more times; record how many repetitions.
4. Expect **Already checked in** for each repeat; compare record ID/timestamp and report count with the first scan.
5. Repeat after refresh and organizer logout/login. The attendance record must persist.
6. Scan a second student's genuine ticket for the same event. Verify the count becomes two rather than treating different students as duplicates.
7. **BACKEND:** synchronize two authorized independent scanning clients against the same unused ticket and event. Repeat from clean fixtures.
8. Inspect the authoritative database after both requests complete; compare client outcomes and report totals.

**Oracle:** exactly one attendance record per student/event for one genuine registration; repeats never add or replace it. Same-runtime Promise tests cannot establish cross-device idempotency. A double-counted attendance record is Critical under the MTP.

### TCND-07 — Attendance report accuracy

**Basis:** REQ-09; RSK-08; P2; System; Q2/Q4. **Availability: NOW locally.** Techniques: requirements-based and error guessing.

1. Prepare event A with at least three synthetic registrations: S1 and S2 will scan; S3 will not. Prepare a foreign-event ticket S4.
2. Scan S1 successfully and repeat it. Scan S2 once. Reject S4 at A.
3. Open Attendance reports, select A, and inspect the stored attendance records independently.
4. Confirm checked-in total = 2; S1 and S2 each appear once as checked in. S3 may appear in the registration register as **Registered**, but must not appear as attended. S4 must not appear as an attendee of A.
5. Check both directions: every stored attendance record has exactly one checked-in row, and every checked-in row has exactly one stored record.
6. Confirm registered count and not-yet-checked-in count reconcile (`registered - checked in`).
7. Refresh, switch events and return, then repeat reconciliation. Include a zero-registration event and a registered-but-zero-attendance event.
8. Run TCND-12 and repeat this reconciliation after cancellation.

**Oracle:** report totals equal stored records, with no duplicate attendee, omitted successful scan, or phantom checked-in student. Appendix B's phrase “omits the student who never scanned” applies to attendance, not the prototype's broader registration table. Document that interpretation.

### TCND-08 — Registration confirmation and notification failure

**Basis:** REQ-11; RSK-09; P3 in Appendix B; Component/System; Q2/Q4. **Availability: PARTIAL / BACKEND for external delivery.** Techniques: requirements-based and checklist-based.

1. Register Alex for an available event.
2. Verify an on-screen success message, event-identifying context, and a working link to the issued ticket.
3. Open the ticket and verify it names the registered event, not another event.
4. Try duplicate and full-event requests. Confirm no success confirmation or new ticket is issued for either rejected attempt.
5. **BACKEND:** use a notification test double or sandbox provider to record the destination, event reference, ticket reference, and delivery result.
6. Simulate provider timeout, unavailable service, malformed response, and retry/recovery using the approved contract.
7. Verify registration/ticket state, failure visibility, and any retry behavior. Retries must not create a second registration/ticket.

**Oracle:** accepted registration produces the defined confirmation; rejected registration does not. The prototype demonstrates in-app confirmation only and sends no email. Appendix B expects registration success plus visible provider failure, while other text leaves failure semantics open: record the approved interpretation before scoring the dependency-failure branch.

### TCND-09 — Organizer ownership, creation, editing, and cancellation

**Basis:** REQ-10; RSK-05; P1; Component/System; Q2/Q4. **Availability: PARTIAL.** Techniques: decision table and requirements-based.

1. As CICT organizer create a future draft with title, description, venue, schedule, category, and valid whole-number capacity. Verify stored owner is CICT.
2. Edit the draft; inspect every changed field on the event page and in storage.
3. Open registration. Verify student catalogue visibility and that edit is no longer available; service attempts to edit an open event must fail.
4. Try invalid capacities (TCND-02), missing mandatory fields, and past/invalid dates. Verify no invalid event record is inserted or changed.
5. As Arts organizer, try direct CICT draft URLs and service attempts to edit, open, cancel, or scan the CICT event. Record refusal and unchanged records.
6. Create an Arts event; verify it is stored under Arts and cannot be reassigned to CICT through an authorized operation.
7. As the owning organizer, cancel a draft and an open event. Test both declining and confirming the cancellation dialog.
8. Confirm a cancelled event cannot reopen through the implemented service. Test retained records under TCND-12.

**Oracle:** owned actions succeed at allowed lifecycle states; foreign-organization actions are denied without record disclosure or mutation. Formal server-side authorization remains BACKEND. Fee-field testing stays EXCLUDED until payment is approved.

### TCND-10 — Catalogue and remaining-place consistency

**Basis:** REQ-02; RSK-03/RSK-04; P2; System; Q2. **Availability: PARTIAL because withdrawal is absent.** Techniques: requirements-based and error guessing.

1. As student browse the catalogue; open event details and compare title, organization, schedule, venue, capacity, and remaining places with storage.
2. Test search and each category filter; combine them, search for no match, clear them, and include/exclude past events. These are prototype-supporting checks for the catalogue journey.
3. Inspect open, full, cancelled, and past events. Student-visible data must not include foreign/private drafts.
4. Open a nonexistent event URL; verify a clear unavailable state without a crash.
5. Record `capacity - registrations` before registration; register a student; refresh the catalogue/details and verify it decreases by one.
6. Try a refused duplicate and refused full registration. The remaining count must not change.
7. Compare full and cancelled-event counts against stored registrations; cancellation does not free seats by deleting retained records.
8. Observe changes in a second tab after storage events, while documenting that synchronization is best effort.
9. **DECISION / BLOCKED:** Appendix B also asks for a registration withdrawal and coordinated count change. No student withdrawal exists in this prototype. Do not substitute organizer event cancellation or manually deleting JSON for a completed withdrawal case.

**Oracle:** displayed remaining places agree with stored capacity minus accepted registrations at the observed state, including after allowed changes. Record the untested withdrawal branch explicitly.

### TCND-11 — Scanner outcomes and recovery without restart

**Basis:** REQ-12; RSK-07/RSK-02/RSK-01; P1; Integration/System; Q1/Q4. **Availability: PARTIAL.** Techniques: decision table, error guessing, state transition.

1. Prepare two unused tickets S1 and S2 for the same owned event A, plus one ticket for another event.
2. Stay in the same scanner session; do not refresh, restart, or sign out between the following actions.
3. Submit S1: expect a first-scan acceptance.
4. Submit S1 again: expect **Already checked in**, not another acceptance.
5. Submit a foreign-event ticket: expect wrong-event refusal.
6. Submit the malformed scenario: expect unreadable/invalid-payload refusal.
7. After those four submissions, inspect exactly one attendance row (S1).
8. Select S2 and submit it: expect acceptance without restarting, proving the client still accepts work. The final attendance count is now two.
9. Repeat with invalid input first and several failures in succession; verify no sticky error prevents the next genuine scan.
10. **BACKEND:** repeat through the separate scanner client's REST interface. Capture request/response contracts and connection recovery, not just local function results.

**Oracle:** four distinguishable outcomes; one attendance row before the fifth scan; next genuine ticket accepted without restart. Repeat scans may be classified as previously processed rather than new success; they must not add attendance. Current simulator is not proof of a separately callable scanner API.

### TCND-12 — Cancellation after registration and attendance

**Basis:** REQ-07/REQ-10; RSK-01/RSK-07; P1; Integration/System; Q1/Q2. **Availability: NOW locally.** Techniques: state transition, error guessing, requirements-based.

1. Prepare an owned open event with S1 and S2 registered and ticketed.
2. Check in S1. Save registration IDs, ticket IDs, attendance ID/timestamp, and the report.
3. As owning organizer cancel the event and confirm the dialog.
4. Verify registrations, tickets, and S1's attendance remain present.
5. Present S2's unused ticket and S1's previously scanned ticket at the cancelled event. Both must be refused; no new attendance is added.
6. Compare the message with the wrong-event scenario. Cancelled-event unavailability must be distinguishable from event mismatch.
7. Verify new student registration is closed, ticket display indicates cancellation, and the event cannot reopen through the implemented transition.
8. Open the report and reconcile against retained records: S1 still checked in exactly once; S2 not checked in.

**Oracle:** cancellation revokes further honoring of tickets, preserves historical records, and leaves the report reconcilable. The seeded cancelled event alone cannot prove retention of **pre-cancellation attendance**; perform the full sequence above.

## 6. Validation decision table

Run locally through service tests/simulator where inputs are available; repeat against the real API later. Keep each refusal distinguishable where required. The contract must decide precedence when multiple conditions are invalid; do not prescribe an unapproved message precedence.

| Case | Authorized owner | Event open | Payload genuine/readable | Matches selected event | Already attended | Expected state effect |
| --- | --- | --- | --- | --- | --- | --- |
| DT-01 | Yes | Yes | Yes | Yes | No | Accept; add one attendance row |
| DT-02 | Yes | Yes | Yes | Yes | Yes | Already recorded; no mutation |
| DT-03 | Yes | Yes | Yes | No | Either | Wrong-event refusal; no mutation |
| DT-04 | Yes | Yes | No | N/A | N/A | Invalid/unreadable refusal; no mutation |
| DT-05 | Yes | Cancelled | Yes | Yes | Either | Cancelled/unavailable refusal; retain history |
| DT-06 | No | Any | Any | Any | Any | Access denied; no protected disclosure or mutation |
| DT-07 | Yes | Draft | Yes | Yes | No | Check-in unavailable in prototype; confirm target contract |
| DT-08 | Yes | Yes | Structurally readable but unknown/altered IDs | Yes | No | Invalid registration/ticket refusal; no mutation |

Expiry, absent signature, separate scanner role, offline validation, and scheduled check-in windows need explicit contract decisions. Do not manufacture production requirements from simulator behavior.

## 7. Component, integration, and automated checks

### 7.1 Existing automated suite — NOW

Run `npm.cmd test`, retain output, and inspect `src/service.test.ts`. At the guide's preparation date it contains nine tests, which must be rerun for your actual build:

1. One event-scoped ticket, consistent reads, and logout/login persistence.
2. Sequential and same-runtime parallel duplicate prevention.
3. Full-capacity rejection and final-place boundary.
4. Past/draft/cancelled rejection and organizer registration denial.
5. Student/organization view limits and denied owned-event operations.
6. Draft creation/edit, post-opening edit rejection, cancellation record retention, and reopen rejection.
7. Student sign-up, duplicate email rejection, and demo reset.
8. First/repeat same-runtime scans and record/report reconciliation.
9. Wrong-event, malformed, altered, unknown, and cancelled scan rejection without attendance.

These tests use memory storage and a fixed clock. They do not test rendered React pages, actual camera scanning, image decoding, real HTTP boundaries, database transactions, notification providers, browser accessibility, or distributed load. `Promise.all` around synchronous local storage operations is not a race across machines.

### 7.2 Component gaps to cover with additional cases

- [ ] Input validation partitions for accounts/events and all invalid payload forms.
- [ ] Ticket identity uniqueness across a larger reproducible synthetic fixture.
- [ ] Draft/open/cancelled and not-attended/attended transition matrix.
- [ ] Cancellation retaining attendance already recorded, not just registrations.
- [ ] Scanner four-outcome sequence followed by a second valid ticket.
- [ ] Independent report set reconciliation in both directions.
- [ ] Event-not-found and unauthenticated service operations.
- [ ] Storage reset/version/invalid-data behavior as prototype-supporting robustness checks.

### 7.3 REST/component integration — BACKEND

The MTP names ITM-10 tier boundaries. Local async functions are not REST endpoints. After an API exists, document its actual paths and contract before running these checks:

- [ ] Registration → catalogue/capacity: accepted result and capacity decrement commit consistently; final-place race never oversells.
- [ ] Registration → QR issuance: one ticket for accepted registration, none on refusal; interruption cannot leave an orphan or duplicate.
- [ ] Validation → attendance store: commit once; duplicate/replayed/retried requests do not double count.
- [ ] Attendance store → report: committed entries and aggregates reconcile with no phantom/omitted student.
- [ ] Registration → notification: event/ticket reference correct; adapter failure handled according to approved semantics.
- [ ] Client → scanner endpoint: schema/version parsing, four distinct outcome codes, rejected scan followed by valid scan.
- [ ] Authorization at **every boundary**, including missing/expired/forged session and cross-organization IDs.
- [ ] Serialization/types, required fields, unknown IDs, malformed JSON, error shape/status, and retry/idempotency policy match the approved contract.

Do not invent endpoint names or HTTP status codes as if the MTP specified them. Record the actual contract used and capture request/response evidence without real credentials.

## 8. Q3 exploratory, usability, and acceptance testing

### 8.1 Exploratory charters

Use a documented time box (suggested starting point: 20–30 minutes per charter; this is a scheduling suggestion, not an MTP threshold). Record tester, build, data, notes, path followed, findings, and unanswered questions.

- [ ] **QR/attendance abuse:** copied QR, altered fields, rapid repeats, wrong event then correct event, successive invalid scans, refresh after scan, two tickets in rapid succession.
- [ ] **Organizer lifecycle:** draft edits, open/close navigation, cancel with ticketed students, attempted edits after opening, organization changes between logins.
- [ ] **Student registration:** rapid activation, back/refresh after success, multiple event registrations, stale catalogue, full event, ticket retrieval after login.
- [ ] **Reports:** switch events repeatedly, zero attendees, partial attendees, cancellation after attendance, duplicate names with distinct synthetic account IDs.
- [ ] **Storage/session disruptions:** extra tab, logout then Back, reset during navigation, corrupted/disallowed storage in a disposable profile. Distinguish known prototype limits from confirmed defects against agreed behavior.

### 8.2 Usability/accessibility exploration — NOW

- [ ] Ask a student representative to find an event, understand availability, register, and locate a ticket without coaching.
- [ ] Ask an organizer representative to create/open an event, check in a student, and reconcile attendance.
- [ ] Record completion obstacles, confusing labels, recovery problems, and participant feedback; avoid collecting real personal details.
- [ ] Navigate with keyboard only: Tab/Shift+Tab, Enter/Space, selects, links, checkboxes, and QR payload details.
- [ ] Verify visible focus; labels identify form controls; validation and notifications are understandable.
- [ ] Open each dialog; check initial focus, Tab containment, Escape, cancellation behavior, and focus recovery after closing.
- [ ] Check heading order, accessible button names, text contrast/readability, non-color status cues, and zoom to 200%.
- [ ] Use a screen reader if available; record the tool and observed limitations.

Formal WCAG certification is EXCLUDED until an agreed target exists. Exploratory accessibility work still proceeds.

### 8.3 Acceptance scenarios — NOW/PARTIAL

Have a designated student/organizer representative execute and sign off the observed prototype scope:

1. **Student:** login/sign-up → browse/filter → detail → register → confirmation → correct ticket → refresh and retrieve again.
2. **Organizer:** create draft → edit → open registration → see registrations → scan → report.
3. **Integrity:** wrong-event scan refused → correct scan accepted → repeat not counted → report shows one attendee.
4. **Isolation:** student cannot manage events; Arts organizer cannot alter CICT events.
5. **Cancellation:** issued ticket stops being honored; prior attendance/report history survives.

Ask whether the portal supports the actual workflow, not only whether the scripted clicks succeed. Record limitations, acceptance owner, date, and remaining gaps. Acceptance of the prototype does not close unexecuted backend requirements.

## 9. Q4 non-functional testing

### NF-01 — Event-launch peak performance and scalability

**BACKEND / DECISION.** Obtain an approved peak usage model, concurrent users, event volume, latency percentile, acceptable errors, and recovery target. The MTP does not supply numerical pass limits.

1. Seed the approved dataset; establish a low-load baseline.
2. Generate the approved launch peak against browsing and registration, including contention for the final seats.
3. Record load profile, duration, throughput, response percentiles, error outcomes, resource usage, and database constraints/locks where available.
4. Reconcile accepted registrations, tickets, and attendance after the run; performance must not be purchased by overselling or losing integrity.
5. Return to baseline and observe recovery against the approved target.

For the frontend, you may record navigation/render timings qualitatively, but these do not establish backend capacity or system latency. Do not invent “under 2 seconds” or any other acceptance threshold. Endurance beyond event-launch peak is EXCLUDED until a usage model brings it into scope.

### NF-02 — Security and privacy

**PARTIAL locally; BACKEND for security claims.**

- [ ] Run the role/organization matrix at UI and service level; repeat at API/data boundaries when available.
- [ ] Try unauthenticated requests, foreign resource IDs, altered ticket IDs, replayed scans, and invalid input.
- [ ] Check that attacker-controlled event text is rendered as text rather than executable markup; use harmless synthetic probes in the disposable demo.
- [ ] Ensure logs/evidence use synthetic data; no real credentials or student details are captured.
- [ ] For a backend, assess session expiry/logout, secret handling, protected data disclosure, input validation, and stored access rules against its design.
- [ ] Record local plaintext demo passwords and tamperable client storage as architectural limitations; a successful local role check is not proof of production security.

### NF-03 — Recovery, availability, and dependency failure

**PARTIAL / BACKEND / DECISION.**

1. Local: refresh or close/reopen a page; confirm persisted data and expected session behavior. Distinguish closing one tab from browser session restoration, which can vary.
2. Local: deny or fill storage in a disposable profile; record whether the application explains failure and whether partial writes occur. Do not assume this unsupported condition passes.
3. Backend: interrupt network/API/database/provider access during registration and scan; capture state before interruption and after recovery.
4. Retry or reconnect under the approved policy. Verify no extra ticket, registration, or attendance row.
5. Test notification failure separately from registration failure. Keep registration-state semantics provisional until approved.
6. Test scanner offline degradation and reconnection; do not require offline acceptance when it is not specified. Invalid or unconfirmed work must not silently become accepted attendance.
7. Re-run smoke and affected cases after restoration. Measure recovery/availability only against approved targets.

The prototype has no notification provider, shared backend, offline queue, or service worker contract. Stopping its dev server is not equivalent to testing a database transaction failure.

### NF-04 — Browser/device/responsive compatibility

**NOW exploratory; DECISION for formal conformance.** Use available desktop browsers plus phone-sized layouts; a suggested exploratory sample is 390px, 768px, and 1440px widths. Record actual browser/device/version and viewport; the sample is not the MTP's approved support matrix.

- [ ] Login/sign-up, catalogue filters, details, ticket/QR rendering, dashboard, scanner, reports, and dialogs work at each sampled size.
- [ ] Mobile navigation includes logout and reset; tables scroll without hiding essential actions; dialogs remain usable with an on-screen keyboard.
- [ ] Text and buttons do not overlap; no unintended page-wide overflow; touch targets and focus remain usable.
- [ ] Native date/time input works; PHT schedule remains consistent when OS timezone changes.
- [ ] Reload nested routes. For an eventual host, test SPA fallback to `index.html` separately from Vite's development behavior.
- [ ] Repeat critical scan/registration workflows in each sampled browser.

Report observed compatibility, not certified support for an unspecified matrix.

### NF-05 — Maintainability, testability, and auditability

- [ ] Run TypeScript/build checks and the repeatable service tests against the recorded build.
- [ ] Review service/UI separation, traceability of changed rules, deterministic fixtures, and documented reset instructions.
- [ ] Record enough operation IDs, event IDs, timestamps, and outcomes to explain evidence without relying on screenshots alone.
- [ ] Review audit requirements with the owner; the prototype has data timestamps but no production audit trail or approved retention policy. Do not claim audit compliance.

## 10. Regression and defect retesting

Run the original reproduction for every fixed defect on the same build line or a recorded later build. Keep original evidence, fix/build reference, new actual result, and relevant neighboring cases. Reopen a defect closed without retest.

Minimum proposed regression set (derived from the MTP's risk focus):

- [ ] TCND-01 student/organization denial and TCND-09 lifecycle ownership.
- [ ] TCND-02 final place/full capacity; TCND-03 sequential and available concurrency checks.
- [ ] TCND-04 one ticket and event-scoped payload.
- [ ] TCND-05 wrong-event rejection with unchanged records.
- [ ] TCND-06 repeat attendance; TCND-07 report reconciliation.
- [ ] TCND-11 invalid scan followed by valid recovery.
- [ ] TCND-12 cancelled tickets and retained history.
- [ ] Student/organizer smoke journeys, refresh, and current-build automated checks.
- [ ] TCND-08 confirmation after registration/notification-related changes.
- [ ] TCND-10 counts after catalogue/registration changes.

Expand the set when a fix affects another boundary; vary payloads, event IDs, input order, and data distributions to avoid repeatedly testing only familiar examples.

## 11. How to record results and defects

### 11.1 Outcome rules

| Outcome | Use when | Coverage claim |
| --- | --- | --- |
| Pass | Written expected result observed, with no contradiction. | Only that tested behavior on that build/environment. |
| Fail | Actual behavior contradicts the oracle. | Raise a defect; record execution separately from successful coverage. |
| Blocked | Missing environment, data, contract, or dependency prevents meaningful execution. | No verified coverage; name owner and unblock condition. |
| Deferred | A recorded decision postpones otherwise executable work. | No verified coverage; state the trigger for returning it to scope. |

Maintain **Not run** as a scheduling status before an execution attempt. Also record partial/provisional branches explicitly; never mark a whole multi-branch condition Pass because its local branch passed.

### 11.2 Execution record template

```markdown
## RUN-YYYYMMDD-001 / CASE-001
- MTP condition / requirement / risk:
- Item / level / type / technique / quadrant / test priority:
- Tester / execution time (Asia/Manila):
- Build identifier / dependency lock / browser / OS / viewport:
- Environment (prototype or full system):
- Data seed / test accounts / event and ticket IDs:
- Preconditions and reset point:
- Steps:
  1.
  2.
- Expected result / record-level oracle:
- Actual result:
- Before/after record counts and IDs:
- Outcome (Pass / Fail / Blocked / Deferred):
- Evidence links:
- Defect or open-question link:
- Unverified branches / limitation / next owner:
```

### 11.3 Defect report template

```markdown
## DEF-001 — Short observable problem
- Requirement / condition / item:
- Build / environment / data:
- Severity (Critical / High / Medium / Low):
- Defect priority (P0–P4; assigned at triage):
- Preconditions:
- Exact reproduction steps:
- Expected result:
- Actual result and record-level contradiction:
- Evidence / frequency / affected event-ticket IDs:
- Impact / workaround:
- Owner / status / triage date:
- Fix build / retest case / retest result:
- Regression evidence:
```

MTP severity meanings: **Critical** = wrong-event validation or duplicate attendance of the DEF-QR-001 class; **High** = violated requirement/capacity/duplicate invariant; **Medium** = incorrect documented path with a workaround; **Low** = cosmetic/wording. Record actual impact and let triage resolve overlaps. Test priorities P1–P3 rank tests; defect priorities P0–P4 rank defects. Do not copy one scale into the other.

Suggested evidence organization:

```text
testing/
  RUN-YYYYMMDD-build/
    environment.md
    execution-log.md
    traceability.md
    defects.md
    screenshots/
    record-snapshots/
    command-logs/
    progress-report.md
    completion-report.md
```

Use filenames including run, condition, case, and step, for example `RUN-001_TCND-05_step04_wrong-event.png`. Save before/after synthetic record snapshots, command output, and API responses where applicable. Screenshots alone cannot prove database invariants.

## 12. Suspension and resumption

Suspend the affected item, or the campaign if environmental, when:

- [ ] Build cannot deploy or required environment/database/network is unavailable.
- [ ] Authentication or another core function makes meaningful execution impossible.
- [ ] An open Critical defect invalidates downstream conditions.
- [ ] Required synthetic test data is missing/corrupt.
- [ ] An external dependency prevents interpretable results.
- [ ] Build/environment differs from the recorded basis, making results untrustworthy.

Any executing member may suspend. Record date, member, criterion, affected items/cases, state of the data, and conditions returned to the unexecuted pool.

Resume only after the cause is documented, environment/data restored, build ID recorded, smoke checks passed, and Critical defect fixed/retested or proceeding risk accepted in writing. Record who authorized resumption and who recorded it; separate those people where practical. Rerun interrupted conditions from a known state. Previous passes do not become current passes automatically.

If the deadline arrives before restoration, report blocked/unexecuted conditions and unsatisfied exit criteria. Do not invent a completion result to meet the schedule.

## 13. Monitoring, deliverables, and exit review

### 13.1 Track progress during execution

- [ ] Planned/executed/passed/failed/blocked/deferred counts by priority, condition, item, and build.
- [ ] Defects by severity and lifecycle state; retest and regression status.
- [ ] Requirement-to-case, case-to-requirement, and risk-to-case links.
- [ ] High/Medium risks with executed responses and those still unverified.
- [ ] Open-question owners, dependency/environment blocks, and schedule/effort changes.
- [ ] Changes to risk scores, test basis, QR format, schema, or lifecycle that invalidate earlier evidence.

Use progress measures as control inputs, not proof of correctness. A growing pass count alongside blocked P1 work is not an acceptable reason to ignore the block.

### 13.2 Deliverables checklist

- [ ] Reviewed/baselined MTP and approvals/dispositions, including any documented course deviations.
- [ ] Appendix A risk matrix with recomputed scores, evidence, and mitigations.
- [ ] Appendix B RTM with conditions, executable cases, outcomes, and evidence links.
- [ ] Appendix C static findings with explicit dispositions/owners.
- [ ] Appendix D justified quadrant coverage map.
- [ ] Appendix E principles evidence tied to what actually happened.
- [ ] Executable case specifications and role/configuration checklists.
- [ ] Reproducible synthetic data and environment/build record.
- [ ] Execution logs, screenshots, record snapshots, and command/API logs.
- [ ] Defect reports with separate severity/priority and fix retest evidence.
- [ ] Progress reports during execution and final completion report.

### 13.3 Apply the MTP's exit criteria

At item level, every planned condition against the item must be executed with no failures; a majority of passes is not an item pass. At campaign exit, evaluate and record each Component IX criterion:

1. All P1 planned conditions executed; local demonstration does not substitute for a blocked distributed branch.
2. All defects recorded with severity and P0–P4 defect priority; no unaccepted Critical defect. Any signed risk acceptance must name the person and rationale. Resolve the source's additional High-defect restriction explicitly.
3. Every High and Medium risk has an executed test response, or an explicit recorded reason why none is possible.
4. Every Component VI requirement has an executed condition, or an explicit reason for the gap.
5. Planned regression set executed against the current build.
6. Every Appendix C finding resolved or carried forward with an owner.

Do not introduce a “100% defect-free” promise or an unsupported pass-percentage target. A frontend-only completion report must state that full MTP exit is not demonstrated when P1 shared-database/API/device tests remain blocked.

### 13.4 Completion report contents

Include tested build/environment/date, actual scope, results per condition and branch, evidence links, remaining defects and acceptance decisions, unresolved static findings, requirement/risk coverage in both directions, blocked/deferred work and triggers, exclusions, regression status, and the decision for each exit criterion. Describe what was **not** tested and why. Explain effort concentrated on invariants/known-failure neighbors and which test inputs/techniques were refreshed.

## 14. Exclusions and remaining work at a glance

| Area | Current treatment | Trigger / required resource |
| --- | --- | --- |
| Payment, fees, payment adapter/provider internals | Excluded/suspended | Approved fee scope; then add/re-score requirements, risks, conditions, and adapter tests |
| Real email delivery and provider failure | Blocked for this prototype | Notification integration and approved delivery/failure/retry contract |
| Shared-database capacity/duplicate/scan races | Blocked for full claim | Backend, shared store, independent clients, synchronization harness |
| Separate scanner REST interface | Blocked for full REQ-12 claim | Named API contract and separate scanning client |
| Withdrawal/re-registration | Blocked decision/feature branch | Approved lifecycle/seat-release policy and implementation |
| Expiry/signature validation | Contract-dependent | Agreed payload/integrity/expiration contract; do not assume currently implemented |
| Offline validation/reconnection | Risk exploration; full feature unspecified | Approved safe-degradation/retry behavior and suitable environment |
| Browser/device conformance | Exploratory checks now; formal claim deferred | Approved support matrix |
| Accessibility certification | Excluded claim; usability/accessibility exploration now | Approved target/success criteria |
| Numeric performance/availability/recovery/scalability targets | No invented pass/fail limits | Approved measurable targets and realistic test environment |
| Endurance beyond event-launch peak | Excluded for this revision | Approved usage model and revised scope |
| Physical tickets, venue operations, third-party internal implementation | Excluded | Explicit revised system boundary |

**Final reporting rule:** a working demonstration, nine green automated tests, or an attractive report is not equivalent to executing the whole MTP. Preserve the difference between observed local behavior, confirmed full-system behavior, source gaps, and work still unexecuted.
