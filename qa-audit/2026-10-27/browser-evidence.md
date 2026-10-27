# Browser evidence — QA audit, 27 October 2026

Target: `http://localhost:5173`. A second session used `http://127.0.0.1:5173` (separate browser-origin storage). Both are in the same in-app browser, not two independent physical devices. All quoted text below was observed during this audit. Only synthetic accounts and three named QA events were changed.

## E01 — Organizer create/edit and capacity validation

URL: http://localhost:5173/manage

1. Signed in as the CICT test organizer; opened **Create event**.
2. Form displayed Event title, Description, Schedule (Philippine time), Capacity (default **50**), Venue and Category. No fee/payment field was present.
3. Entered QA Event A, 30 November 2026 10:00 AM PHT, QA Test Hall A, and capacity 0. Save was blocked with **“Value must be greater than or equal to 1.”** DOM validity was false.
4. Capacity -1 produced the same message. Typing `abc` into the number field left it empty; Save was blocked with **“Please fill out this field.”** No corresponding invalid event was persisted (API attempts independently returned HTTP 400).
5. Capacity 3 saved: **“Draft event saved.”** The management row showed **“Draft”**, **“0 / 3”**, Edit, Open registration and Cancel event.
6. Edited the venue to **“QA Test Hall A Edited”** and saved. Opened registration: **“Registration opened.”** Row changed to **“Open registration”** and no Edit button remained.

Event A URL: http://localhost:5173/events/a493517f-e8cd-4e48-beb7-a3005e43aaae

## E02 — Student role isolation / direct URLs

Account: student12@campus.test (Student A).

Direct navigation to each of `/manage`, `/scanner`, `/reports` returned to `http://localhost:5173/`, showing **“Discover your next experience.”** Navigation contained Discover events and My tickets, with no organizer navigation or controls. API evidence independently shows only the student's own profile, no organizer registrations, and HTTP 403 for forced event creation.

## E03 — Catalogue, details, confirmation and ticket

1. Search **“QA Audit 2026-10-27”** showed Event A **“3 spots left”**, Event B **“3 spots left”**, Last Seat **“1 spots left”** before audit registrations.
2. Event A detail showed **“November 30, 2026 · 10:00 AM PHT”**, **“QA Test Hall A Edited”**, **“3 total places · 3 remaining”** and **“Save my spot”**.
3. Submitted once. The named Event A page showed **“You're registered!”**, **“View my ticket”**, **“3 total places · 2 remaining”**, and **“Registration confirmed! Your QR ticket is ready in My tickets.”**
4. `/tickets` showed the heading **“QA Audit 2026-10-27 Event A”**, **“Registered”**, one QR image titled **“Ticket for QA Audit 2026-10-27 Event A”**, Cancel registration and View QR payload. No download control was present.
5. Expanding View QR payload displayed:

```json
{"version":1,"eventId":"a493517f-e8cd-4e48-beb7-a3005e43aaae","registrationId":"9022b943-ce92-4c40-92e3-d5d960284add","ticketId":"b0a0f5c5-f60c-4ccc-bb50-699eafc25f08"}
```

6. Reload retained the ticket and session; one QR graphic was counted. Revisiting Event A after reload showed **“You're registered!”** and View my ticket, with no second registration action.
7. Independently signed in as the same student on the `127.0.0.1` origin. The same named Event A showed **“You're registered!”**, **“2 remaining”**, and View my ticket. API replay attempts in two independently authenticated sessions both returned **“You are already registered for this event. View your existing ticket.”**

The event name is supplied by the event/ticket context; the toast itself is generic. The portal states **“Your ticket is saved to your account. Registration emails are not sent.”** No email delivery was claimed or verified.

## E04 — Stale remaining places (confirmed defect)

URLs: catalogue http://localhost:5173/ and Last Seat detail http://localhost:5173/events/b0f21efd-ea16-4a04-aeee-bc090e7dd612

1. Kept Student A's session open while independent API sessions registered Student B in Event B and filled Last Seat.
2. Returned via the site's Discover events link and searched QA Audit. Event B still showed **“3 spots left”** although the organizer-visible records contained 1 accepted registration / capacity 3. Last Seat showed **“Open registration”**, **“1 spots left”** although records contained 1 accepted registration / capacity 1.
3. Opened Last Seat. It showed **“1 total places · 1 remaining”** and an enabled **“Save my spot”**.
4. Submitted. The portal showed **“This event is full.”**, but the same page continued to show **“1 remaining”**, **“Open registration”**, and Save my spot.
5. Reloaded. The page changed to **“Full”**, **“1 total places · 0 remaining”**, and disabled **“Registration unavailable”**.
6. Organizer management independently showed Last Seat **“Full”**, **“1 / 1”**; final API records contained exactly 1 accepted registration and 1 ticket. The rejected Student A request added neither a registration nor a ticket.

## E05 — Signup verification blocked

URL: http://127.0.0.1:5173/events/a493517f-e8cd-4e48-beb7-a3005e43aaae (signed-out signup view)

Selected Create an account. The form showed **“Find where you belong.”**, **“Create your student account.”**, Full name, Email address and Password. No role selector was present.

- Synthetic `qa.audit.20261027.1818@example.test` returned **“Email address \"qa.audit.20261027.1818@example.test\" is invalid”**.
- Retried with the reserved example.com domain (`qa.audit.20261027.1818@example.com`): **“email rate limit exceeded”**.
- Final admin-authorized profile lookup for both synthetic addresses returned an empty array. New-account role assignment and confirmation delivery were not observed. Seeded-account roles/login are separate verified evidence, not proof of signup completion.

## E06 — One continuous validation session

URL: http://localhost:5173/scanner

UI explicitly said **“Simulate QR validation against your organization's event records.”**, **“SIMULATED VALIDATION TERMINAL”**, and **“No camera is used.”** Controls: Check-in event, Simulation, Registered student's ticket and Simulate scan. There was no manual payload/ticket-ID field, camera/file import or ticket download interface.

Selected **“QA Audit 2026-10-27 Event A (open)”** and **“Test Student 12 · b0a0f5c5-f60”**. Without reloading or changing the event:

| Order | Input selected | Exact visible result | Approximate click-to-result time |
| --- | --- | --- | --- |
| 1 | Valid ticket / repeat scan | Test Student 12 checked in successfully | 1,196 ms |
| 2 | Same valid ticket | Already checked in | 407 ms |
| 3 | Wrong-event ticket | Wrong event: this ticket belongs to another event. | 425 ms |
| 4 | Malformed payload | Invalid ticket: malformed QR payload. | 464 ms |

After the fourth result, Simulate scan was enabled. Selected valid again and submitted a fifth time: **“Already checked in”**. This demonstrates recovery, not merely a visible button. These timings include browser automation/network overhead and measure to visible result, not a controlled performance benchmark.

## E07 — Attendance reconciliation

URL: http://localhost:5173/reports

| Selected event | Exact summary | Rows observed |
| --- | --- | --- |
| Event A | Registered students 1; Checked in 1; Not yet checked in 0 | Test Student 12 / student12@campus.test / Checked in / Oct 27, 6:20 PM |
| Event B | Registered students 1; Checked in 0; Not yet checked in 1 | Test Student 13 / student13@campus.test / Registered / — |
| Last Seat | Registered students 1; Checked in 0; Not yet checked in 1 | Test Student 13 / student13@campus.test / Registered / — |

Student B's own cancelled registration in A is retained in the database but excluded from this active-registration report. Independent API snapshots show A's only attendance belongs to Student A's registration; there are no attendance rows for B/Last Seat. Repeated API scans in two organizer sessions both returned Already checked in and left exactly one A attendance row.

## E08 — Event cancellation and retention

URL: http://localhost:5173/manage

Selected Cancel event only in the **QA Audit 2026-10-27 Event A** row. Confirmation said **“Registration and check-in will close. Existing tickets and attendance records will be retained. This action cannot be undone.”** Confirmed for this synthetic QA fixture.

At `/scanner`, selected **“QA Audit 2026-10-27 Event A (cancelled)”**, the same Student A ticket and Valid ticket / repeat scan. Result: **“Check-in is unavailable for this event.”** This differs from the wrong-event message.

At `/reports`, Event A still showed Registered students 1 / Checked in 1 / Not yet checked in 0 and the same Student A row/time. API cross-check retained 2 historical registrations (1 attended, 1 student-cancelled), 2 tickets and 1 attendance.

## E09 — Other organization

Account: arts.organizer@campus.test.

At http://127.0.0.1:5173/manage, the heading organization was **“Creative Arts Society”**; the three management rows were Campus Sketch Walk, Visual Storytelling Workshop and The Creative Playground. No Org 1 QA event or its management actions was listed.

Direct URL http://127.0.0.1:5173/events/a493517f-e8cd-4e48-beb7-a3005e43aaae displayed the non-draft Event A details but no Edit or Cancel event actions. API edit/cancel attempts made earlier while A was open each returned HTTP 406 / PGRST116, and Org 1's before/after venue and status were identical. Read access to a published event is not management access.

Org 2 capacity follow-up: opened Create event as the Arts organizer and completed the other fields for `QA Audit Invalid Org 2`. Values 0 and -1 each gave “Value must be greater than or equal to 1.” Typing abc left the number field empty and gave “Please fill out this field.” Closed the unsaved form. An independent Org 2 API query for that exact title returned `[]`; no invalid event was saved.
