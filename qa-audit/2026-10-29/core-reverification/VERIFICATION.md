# Core MTP verification — 29 October 2026

User decision: retain core scope and finish verification. Appendix additions (signed/expiring QR, check-in windows, offline queue and fee display) remain excluded from this task. No application or schema changes were necessary.

Build tested: `b9969fbd3e8633f897e980d0e523a36e12c2333e`, branch `main`, initially clean. The parent project is outside the nested application Git repository. Baseline: Main VI REQ-01–REQ-12 and detailed Appendix B TCND-01–TCND-12 of the root MTP; conflicting summary numbering is not merged.

## Fresh execution

| Command | Result |
| --- | --- |
| `npm.cmd test` | PASS: 9 files, 36 tests |
| `npm.cmd run lint` | PASS, exit 0 |
| `npm.cmd run build` | PASS, exit 0; nonfatal React Router directive and >500 KB chunk notices |
| `npm.cmd run test:e2e -- e2e/mtp.reverification.spec.ts` with development opt-in | PASS: all 4 tests in one run, 1.3 minutes, Microsoft Edge 156.0.4314.50 |
| `git diff --check` | PASS before report creation; rerun at closeout |

The browser suite was copied temporarily with only evidence paths changed to this directory. The temporary copy was removed after execution. The original suite and prior evidence were preserved. Development backend is the suite-asserted `fcpegloywagntqpeaocx`. Browser tests created retained synthetic records and a synthetic signup identity; no reset, reseed, deletion, deployment or schema mutation was performed.

## Requirement proof

| Requirement | Fresh evidence |
| --- | --- |
| REQ-01 Accounts/roles | Website signup assigned student; organizer route denied; SQL tests cover role escalation and row access |
| REQ-02 Catalogue/details | Website navigation/details and held-open count refresh; local catalogue/refresh regressions |
| REQ-03 Capacity | Two independent authenticated browser contexts contended for capacity 1: exactly one accepted |
| REQ-04 Duplicate prevention | Duplicate rejected and stored registration count remained 1 |
| REQ-05 Unique ticket | One ticket for accepted registration; SQL ticket/seed invariants; no large-volume uniqueness campaign |
| REQ-06 Event identity | Issued payload matched event, registration and ticket IDs |
| REQ-07 Correct-event validation | Real A ticket rejected at B; zero B attendance; malformed payload rejected |
| REQ-08 Single attendance | UI repeats and simultaneous authenticated repeat calls retained one attendance row |
| REQ-09 Report accuracy | Held-open report picked up another terminal's check-in and reconciled with stored attendance |
| REQ-10 Organizer management | Actual website create/edit/open/cancel passed; invalid capacity rejected; cross-organization update denied |
| REQ-11 Confirmation/recovery | Aborted publication preserved registration/ticket; organizer saw pending and retried successfully; SQL internal failure/retry test passed |
| REQ-12 Scanner recovery | Valid/repeat/wrong-event/malformed/repeat sequence passed without restart; issued QR decoded through synthetic camera video |

Machine-readable observations are in `core-browser-evidence.json`. Desktop report and 390px scanner screenshots were visually inspected. The scanner's horizontal navigation is clipped within its header at this width; the test establishes no document horizontal overflow, not full mobile accessibility certification. Form and outcome panels remain visible.

## Verdict and remaining acceptance

All twelve core requirements have implementation and passing evidence for the exercised branches. No new failing core behavior was observed. This is not full formal MTP exit certification.

Remaining evidence requires an actual device/operator or wider campaign:

1. Two real phones: camera permission grant/denial, physical QR scanning, simultaneous first check-ins and last-seat contention, interrupted connection followed by safe retry, and report reconciliation. The current browser suite uses logical sessions on one machine; concurrent repeat scans are not simultaneous first scans.
2. Firefox/Safari and the agreed physical mobile/browser matrix; full keyboard/screen-reader/accessibility and security campaigns; sustained load/recovery and volume uniqueness observations. Numerical performance thresholds must be agreed before assigning conformance.
3. Stakeholder acceptance and formal MTP exit approval. External tracker updates, production deployment and provider email delivery were not performed or claimed.

Do not add appendix features or rerun completed implementation to close these evidence gaps.
