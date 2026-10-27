# QA audit — Student Organization Event Registration System

Date: **27 October 2026, Asia/Manila**. Source: the user-supplied MTP v0.1-DRAFT requirements/conditions, using its Appendix B REQ/TCND identifiers. This is requirement-level coverage, not an overall MTP conformance declaration.

Target: http://localhost:5173. Secondary browser session: http://127.0.0.1:5173. Hosted data: the connected Supabase development project. Only synthetic test identities and three new `QA Audit 2026-10-27` events were used. Existing events were not edited, cancelled, deleted or reseeded.

Accounts used: Student A `student12@campus.test`; Student B `student13@campus.test`; Org 1 `cict.organizer@campus.test`; Org 2 `arts.organizer@campus.test`. The Org 1 organizer also acted as the validation/scanner account; no separate physical scanner was provided. The seeded admin was used only to cross-check the attempted signup profile.

Evidence: [exact browser observations](browser-evidence.md), [timestamped API responses and record snapshots](api-evidence.json), [fixture IDs](state.json), [API audit harness](run-api-audit.mjs). API timestamps are UTC; add eight hours for Manila time. Application source and schema were not changed to obtain these results.

## 1. Summary

| Feature | Part A existence | PASS | FAIL | BLOCKED | NOT TESTABLE |
| --- | --- | ---: | ---: | ---: | ---: |
| 1. Online event registration | **PARTIAL** | 3 | 1 | 0 | 1 |
| 2. QR ticket generation / validation | **PRESENT — simulated validation interface** | 5 | 0 | 0 | 0 |
| 3. Event management / attendance monitoring | **PRESENT** | 2 | 0 | 0 | 0 |
| **Total provided TCND conditions** | | **10** | **1** | **0** | **1** |

These counts cover the twelve supplied TCND conditions only. A1.1 signup completion was additionally **BLOCKED** by the hosted email rate limit; it is a Part A verification gap, not a thirteenth TCND or an extra pass. TCND-02 retains NOT TESTABLE for its prescribed truly simultaneous two-browser/device branch; the independent API contention and sequential branches were executed and are reported separately. A remaining-place display defect is counted under TCND-10. Optional ticket download/manual-entry absence is not converted into a mandatory-condition failure.

### Part A — every sub-feature

| Sub-feature | Existence | URL / observed evidence |
| --- | --- | --- |
| A1.1 Signup and role assignment (REQ-01) | **PARTIAL** | Signed-out signup view at `/` or the current protected URL. Form says “Create your student account”; submission reached Auth but ended in “email rate limit exceeded”. No new profile/role was observed. E05. |
| A1.2 Event list/details and remaining places (REQ-02) | **PARTIAL** | `/` and `/events/:id` show schedule, venue, capacity and places; cross-session counts stayed stale until reload. E03–E04. |
| A1.3 Register action (REQ-03) | **PRESENT** | Event A Save my spot accepted one registration; row/ticket persisted. E03 and API snapshots. |
| A1.4 Reject second registration (REQ-04) | **PRESENT** | After reload and independent session, UI points to existing ticket; API replay returns “You are already registered for this event. View your existing ticket.” E03 / TCND-03 evidence. |
| A1.5 Named confirmation / QR reference (REQ-11) | **PRESENT** | Named Event A detail plus confirmation/View my ticket; `/tickets` names Event A and displays its QR. Portal channel verified, not email. E03. |
| A2.1 QR per accepted registration (REQ-05) | **PRESENT** | Four accepted audit registrations produced four unique tickets; rejected requests added none. TCND-04 snapshots. |
| A2.2 Student ticket view/download | **PRESENT — view** | `/tickets`: one visible Student A QR, named event, payload disclosure; reload retained it. No download control observed. E03. |
| A2.3 Scanner or validation interface (REQ-12) | **PRESENT — validation simulator** | `/scanner`: event/ticket selection and server-backed Simulate scan. Successful submission created a real attendance row. No camera/import capability observed. E06. |
| A2.4 Four distinct outcomes (REQ-12) | **PRESENT** | First success, Already checked in, Wrong event, Invalid ticket: malformed QR payload; same continuous session. E06. |
| A2.5 Manual-entry fallback, if any | **ABSENT** | `/scanner` exposes presets and stored-ticket selection, no payload/ticket-ID input. Optional capability; no supplied condition made it mandatory. E06. |
| A3.1 Organizer creates event (REQ-10) | **PRESENT** | `/manage`: Event A saved as a draft with schedule/venue/capacity; invalid values refused. No fee field. E01. |
| A3.2 Edit before opening (REQ-10) | **PRESENT** | Edited venue while draft, verified new venue on detail; Edit disappeared after opening. E01/E03. |
| A3.3 Cancel event (REQ-10) | **PRESENT** | Cancelled only new QA Event A; status persisted and old ticket was refused. E08. |
| A3.4 Per-event report (REQ-09) | **PRESENT** | `/reports`: A = 1 registered / 1 checked in; B and Last Seat = 1 registered / 0 checked in. Correlated with actual rows. E07. |
| A3.5 Role-separated areas (REQ-01) | **PRESENT** | Student direct organizer URLs redirect to Discover; Org 2 has only its own management rows; API actions enforce boundaries. E02/E09. |

“PRESENT — validation simulator” does not claim optical scanning. The supplied A2.3 explicitly allows a validation interface; the exercised simulator is backed by actual database validation, not merely a static result display.

## 2. Requirement coverage

| Requirement | Website status | Related TCND | Result | Evidence |
| --- | --- | --- | --- | --- |
| REQ-01 | PARTIAL | TCND-01; related ownership checks TCND-09 | **PASS for tested role conditions; signup completion BLOCKED** | Student direct URLs denied and private rows excluded. New signup hit hosted rate limit; no new role observed. |
| REQ-02 | PARTIAL | TCND-10 | **FAIL** | Full one-seat event continued showing 1 remaining even after full rejection; reload changed it to 0. E04. |
| REQ-03 | PRESENT | TCND-02 | **NOT TESTABLE for prescribed two-browser/device simultaneity** | Overlapping API requests accepted one of two; sequential extra refused; true two-browser/device branch not demonstrated. Stale display separately fails REQ-02. |
| REQ-04 | PRESENT | TCND-03 | **PASS** | Two independently authenticated replay attempts refused; one original registration/ticket remained. |
| REQ-05 | PRESENT | TCND-04 | **PASS** | Four accepted registrations, four distinct ticket IDs and payloads; no extra ticket for rejected duplicates/full request. |
| REQ-06 | PRESENT | TCND-05 | **PASS for inspected payload** | Version, eventId, registrationId and ticketId were present in displayed/issued JSON. Optical decode not independently performed. |
| REQ-07 | PRESENT | TCND-05, TCND-12 | **PASS** | A ticket at B refused with zero B attendance; cancelled-event ticket refused with different message. |
| REQ-08 | PRESENT | TCND-06 | **PASS** | Repeated UI/API scans, including independent organizer sessions, left exactly one A attendance row. |
| REQ-09 | PRESENT | TCND-07 | **PASS** | Report and attendance rows agree in both directions; unscanned/cancelled participants not counted as attended. |
| REQ-10 | PRESENT | TCND-09, TCND-12; Part A creation/edit | **PASS for executed cases** | Draft creation/edit/open, invalid-capacity refusal, cross-org write denial and cancellation retention observed. |
| REQ-11 | PRESENT | TCND-08 | **PASS — portal channel** | Named event/ticket confirmation on acceptance; full rejection showed error and added no in-portal registration/ticket. Email channel unverified. |
| REQ-12 | PRESENT — validation simulator | TCND-11 | **PASS — simulator session** | Four distinct outcomes in order; subsequent scan succeeded as a repeat after malformed rejection. No hardware claim. |

### Condition execution ledger

| Condition | Result | Steps / expected / actual cross-check |
| --- | --- | --- |
| TCND-01 | **PASS** | Student visited `/manage`, `/scanner`, `/reports` directly: all redirected to `/`. Forced event creation HTTP 403; profile query returned self only; no organizer registrations returned. E02/API setup. |
| TCND-02 | **NOT TESTABLE** | No two independent browser engines/devices available. Supplemental barrier-released API requests both started at 18:16:56.323 PHT; one accepted, one “This event is full.”; intervals overlapped ~289 ms. Sequential extra request refused. Accepted count/ticket count each 1 at capacity 1. Stale UI count separately recorded as failure F01. |
| TCND-03 | **PASS** | Registered A, reloaded, opened independently authenticated second origin/session, replayed registration in two independent API sessions. Both clear duplicate refusals; one A registration/ticket for Student A in record snapshots, My tickets and organizer report. |
| TCND-04 | **PASS** | Correlated each of four accepted audit registrations with one ticket; IDs/payloads all distinct. Rejected duplicate/full requests did not add registrations or tickets. Cancelled registration retained its original inactive ticket. |
| TCND-05 | **PASS** | Presented issued Event A payload to Event B validator. “Wrong event: this ticket belongs to another event.” B attendance remained empty. Payload fields independently inspected; no fabricated QR was used for the cross-event attempt. |
| TCND-06 | **PASS** | Scanned A repeatedly in UI and through two independently authenticated organizer API sessions. All repeats returned Already checked in; organizer report and actual records contain one attendance row for Student A. |
| TCND-07 | **PASS** | Compared actual scan log to reports and registrations: only Student A attended A; Student B unscanned in B/Last Seat; cancelled Student B registration in A not counted as attended. No missing or extra attendance row. |
| TCND-08 | **PASS — portal** | Accepted registration produced named Event A context, View my ticket, and named QR card. Full rejection showed “This event is full.” with no new confirmation card or ticket. Rejected duplicate attempts added none. No email/inbox claim. |
| TCND-09 | **PASS** | Org 2 management excludes Org 1 A; direct event URL offers no management action; forced edit/cancel HTTP 406 and before/after fields identical. Capacities 0/-1/abc refused by UI and API, with no invalid event created. |
| TCND-10 | **FAIL** | Database count fell 2→1 after Student B cancelled A, releasing one place. However current session still showed B 3 places instead of 2, and full Last Seat 1 instead of 0, including after a rejected attempt. Reload reconciled it. E04. |
| TCND-11 | **PASS — simulator** | One `/scanner` session, no reload: valid → repeat → wrong-event → malformed. Exact messages in E06; after last rejection button was enabled and a fifth valid repeat returned Already checked in. |
| TCND-12 | **PASS** | Cancelled QA A with existing records, submitted same issued ticket: “Check-in is unavailable for this event.” Old active registration/attendance still visible in report; database retained both historical registrations/tickets and one attendance. |

## 3. Detailed FAIL / PARTIAL findings

### F01 — Remaining-place display stays stale after another session fills the event

- **Status / suggested severity:** confirmed **FAIL**, **Medium**. REQ-02 / TCND-10; relevant display subcheck of TCND-02. Database overbooking was not observed.
- **URLs:** http://localhost:5173/ and http://localhost:5173/events/b0f21efd-ea16-4a04-aeee-bc090e7dd612
- **Steps:** Keep Student A session open; let independent requests fill the one-seat QA event; navigate through Discover to that event; submit Save my spot; compare with organizer/database counts; reload.
- **Expected (MTP):** displayed remaining places equal capacity minus accepted registrations and reflect the released/occupied places.
- **Observed:** catalogue “1 spots left”; detail “1 total places · 1 remaining” and enabled Save my spot. Submission returned “This event is full.” but the count/button remained stale. Organizer/API showed 1 accepted / capacity 1. Reload showed Full, 0 remaining and disabled Registration unavailable. Event B likewise showed 3 spots while one of three places was occupied.
- **Evidence:** browser E04; API snapshots `last-seat concurrent requests and capacity-plus-one` and final fixture counts.
- **Impact:** users are offered a place that is no longer available; list/detail can disagree with the current database/report. The server still refused excess registration and issued no extra ticket.

### F02 — Signup exists, but successful new-account role assignment could not be verified

- **Status / suggested severity:** A1.1 **PARTIAL**, acceptance branch **BLOCKED**; **Low verification gap**, not a confirmed application defect. REQ-01 signup coverage remains incomplete.
- **URL:** http://127.0.0.1:5173/events/a493517f-e8cd-4e48-beb7-a3005e43aaae while signed out; same signup component is used at `/`.
- **Steps:** Select Create an account, enter synthetic name/email/password, submit using a reserved test domain; retry with a reserved example.com address; query the corresponding profile through the admin account.
- **Expected (MTP):** accepted account signup results in an assigned student or organizer role.
- **Observed:** `.test` address rejected as invalid; subsequent reserved example.com attempt returned “email rate limit exceeded”. Admin profile lookup returned `[]`. A form and seeded roles do not prove successful new-account provisioning.
- **Evidence:** browser E05; API final A1.1 lookup. An authorized deliverable test mailbox and an available Auth email quota are needed to complete this branch. No real email address was used.

## 4. Deviations and capability boundaries

- No payment field or payment step was observed; event details said “Registration is free.” Payment remains absent from the tested workflows, consistent with its stated exclusion.
- QR generation/student view and server-backed validation are available. Physical camera scanning, file import, ticket download and a manual-entry fallback were not observed. A2.3 allows a validation interface, so these absent capabilities were not invented as additional pass/fail requirements.
- Student cancellation releases capacity and retains an inactive ticket. Cancelled registrations remain in stored history but are excluded from the active-registration report. This is observed lifecycle behavior, not a claim that every open MTP lifecycle question is resolved.
- QR event-day expiry and the assumed scan window were not enforced in the observed early check-in. These are team assumptions in the supplied request, so they are observations, not failures.
- REQ-02 has an observed display defect. REQ-01 signup acceptance and the specified TCND-02 two-browser/device contention remain unverified. No additional mandatory feature was classified ABSENT from the supplied conditions.

## 5. Part C observations and Part D answers

### Part C — report only

| Assumption | Observed behavior |
| --- | --- |
| Capacity assumed 50 | Create form defaults to 50 but accepted QA capacities 1 and 3. Existing views also displayed other capacities. 0/negative/non-numeric creation was refused. A filled one-seat event rejected an additional registration. Maximum supported capacity was not probed. |
| QR valid on event day only | A ticket was accepted on **27 October 2026, 6:20 PM PHT**, for an event starting **30 November 2026, 10:00 AM PHT**. Displayed payload has no expiry field. Post-event expiry was not tested. |
| 30-minute pre-door to event-end scan window | The same month-early scan succeeded. No door/end inputs were present in the tested event form. No allowed-window enforcement can be claimed from this observation; post-end behavior remains untested. |
| Validation under 2 seconds | Four UI click-to-visible-result samples: **1.196 s**, **0.407 s**, **0.425 s**, **0.464 s**. Supplemental API round trips: about **0.234–0.728 s**. Small samples include automation/network overhead; no SLA or load-performance pass/fail is assigned. |

### Part D

| Question | Observed answer |
| --- | --- |
| D-09: multiple places / cancellation | Same-account duplicate requests were refused across independent sessions, retaining one registration/ticket for that event. Cancelling Student B's unscanned A registration reduced accepted count 2→1 and released a place; its ticket remained but was refused as inactive. Live UI counts may require reload (F01). |
| D-10: QR contents / event identity | JSON contained `version`, `eventId`, `registrationId`, `ticketId`. The explicit UUID identifies the event; a human-readable title requires lookup. No signature or expiry field was present in the displayed/issued payload. No optical decoding or cryptographic audit was performed. |
| D-11: last place while another request is in flight | In overlapping API requests, one request was accepted and the other returned “This event is full.” No waitlist/queued registration was returned; no extra row/ticket was stored. Internal database waiting/queueing was not directly observed. |
| D-02: fees/payment | No payment was collected in the completed registration. The form had no fee field; detail said Registration is free; no payment screen appeared. |

## 6. Limitations and retained evidence

- One in-app browser engine was available. Localhost/127.0.0.1 provided separate storage/auth sessions, and API clients had independent Auth sessions, but there was no pair of physical devices or independent browser engines. Exact simultaneous server arrival cannot be established from client-side request intervals. TCND-02 is therefore NOT TESTABLE for the prescribed branch, despite useful API contention evidence.
- Signup completion/role assignment and account-confirmation delivery were blocked by hosted email validation/rate limits and lack of a deliverable synthetic mailbox. Existing seeded logins/roles were verified separately.
- No optical QR scan, camera hardware, manual-entry fallback or downloadable artifact was available. Payload analysis uses the exposed payload plus database-issued JSON; it does not certify optical image decodability or cryptographic integrity.
- Portal confirmations were checked. Email delivery/non-delivery, provider queues and rejected-request email side effects were not independently monitored.
- No post-event time travel, expiry boundary test, load/endurance campaign, complete browser/device matrix or production security certification was performed. Existing unit tests/build results from prior work are not counted as this audit's condition evidence.
- This is a point-in-time audit of the supplied requirements/conditions, not all text/ambiguities in the complete MTP. No overall conformance verdict is given.

Final retained QA fixtures:

| Event | State | Capacity | Historical registrations | Active/attended registrations | Tickets | Attendance |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A — a493517f-e8cd-4e48-beb7-a3005e43aaae | Cancelled for TCND-12 | 3 | 2 | 1 | 2 | 1 |
| B — 9424cf48-5e84-4c7b-b0cc-30ed04effb0a | Open | 3 | 1 | 1 | 1 | 0 |
| Last Seat — b0f21efd-ea16-4a04-aeee-bc090e7dd612 | Open/full | 1 | 1 | 1 | 1 | 0 |

All four accepted registrations have one distinct ticket each; only Student A's Event A registration has attendance. No QA fixture exceeded capacity. Fixtures were retained, not deleted/reset. The audit harness passed focused ESLint validation. Application source, schema and dependencies were not modified; changed local files are this audit folder and the linked Second Brain handoff/index.
