import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const enabled = process.env.MTP_DEVELOPMENT_TEST === '1';
const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
// Explicitly synthetic credentials already documented in supabase/seed.sql.
const password = 'CampusTestOnly123!';
const clients: SupabaseClient[] = [];
function ok<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  expect(result.error, result.error?.message).toBeNull();
  return result.data!;
}
async function api(email: string) {
  const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  clients.push(c);
  const auth = ok(await c.auth.signInWithPassword({ email, password }));
  return { c, id: auth.user.id };
}
async function login(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}
test.beforeEach(() => {
  test.skip(!enabled, 'Set MTP_DEVELOPMENT_TEST=1 only for the designated seeded development project.');
  expect(url).toBe('https://fcpegloywagntqpeaocx.supabase.co');
});
test.afterEach(async () => { await Promise.all(clients.splice(0).map(c => c.auth.signOut())); });

test('TCND-01–12: shared registration, confirmation, scanner and report acceptance', async ({ browser }) => {
  const organizer = await api('cict.organizer@campus.test');
  const otherOrg = await api('arts.organizer@campus.test');
  const a = await api('student14@campus.test'), b = await api('student15@campus.test');
  const organization = ok(await organizer.c.from('profiles').select('organization_id').eq('id', organizer.id).single()).organization_id;
  const run = `MTP Core ${Date.now()}`;
  const events: { id: string; title: string }[] = [];
  const evidence: Record<string, unknown> = { at: new Date().toISOString(), run, browser: browser.version(), conditions: {} };
  const contexts = await Promise.all([0, 1, 2, 3].map(() => browser.newContext()));
  const [studentA, studentB, report, scanner] = await Promise.all(contexts.map(c => c.newPage()));
  const record = (condition: string, observation: unknown) => { (evidence.conditions as Record<string, unknown>)[condition] = observation; };
  try {
    for (const suffix of ['A', 'B']) {
      const e = ok(await organizer.c.from('events').insert({ organization_id: organization, created_by: organizer.id,
        title: `${run} ${suffix}`, description: 'Synthetic retained MTP core acceptance fixture.', venue: 'QA Hall', category: 'Technology',
        capacity: 1, start_at: new Date(Date.now() + 30 * 86400000).toISOString() }).select('id,title').single());
      ok(await organizer.c.from('events').update({ title: `${e.title} edited` }).eq('id', e.id));
      e.title += ' edited';
      ok(await organizer.c.from('events').update({ status: 'open' }).eq('id', e.id));
      events.push(e);
    }
    evidence.events = events;
    await Promise.all([login(studentA, 'student14@campus.test'), login(studentB, 'student15@campus.test'), login(report, 'cict.organizer@campus.test'), login(scanner, 'cict.organizer@campus.test')]);
    await studentA.goto('/manage');
    await expect(studentA).toHaveURL(/\/$/);
    const forbidden = await a.c.from('events').insert({ organization_id: organization, created_by: a.id, title: 'Forbidden', description: 'Synthetic', venue: 'Hall', category: 'Technology', capacity: 1, start_at: new Date(Date.now() + 86400000).toISOString() });
    expect(forbidden.error).toBeTruthy(); record('TCND-01', 'Student route redirected; server event creation denied.');
    for (const page of [studentA, studentB]) {
      await page.route('**/rest/v1/rpc/publish_confirmation', route => route.abort('failed'));
      await page.goto(`/events/${events[0].id}`);
      await expect(page.getByRole('button', { name: 'Save my spot' })).toBeEnabled();
    }
    await Promise.all([studentA, studentB].map(p => p.getByRole('button', { name: 'Save my spot' }).click()));
    await expect.poll(async () => ok(await organizer.c.from('registrations').select('*').eq('event_id', events[0].id)).length).toBe(1);
    const regs = ok(await organizer.c.from('registrations').select('*').eq('event_id', events[0].id));
    const winner = regs[0].user_id === a.id ? a : b;
    const winnerPage = winner === a ? studentA : studentB;
    const loserPage = winner === a ? studentB : studentA;
    await expect(winnerPage.getByTestId('confirmation-message')).toContainText('Registration accepted');
    await expect(loserPage.getByTestId('error-message')).toContainText('full');
    record('TCND-02', 'Concurrent clicks from independent browser contexts: exactly one accepted at capacity 1. Logical sessions on one machine; no physical-device claim.');
    expect((await winner.c.from('registrations').insert({ event_id: events[0].id, user_id: winner.id })).error?.message).toMatch(/already registered/);
    expect(ok(await organizer.c.from('registrations').select('id').eq('event_id', events[0].id))).toHaveLength(1);
    record('TCND-03', 'Duplicate refused; stored registration count remains 1.');
    const ticket = ok(await winner.c.from('tickets').select('*').eq('registration_id', regs[0].id).single());
    expect(JSON.parse(ticket.payload)).toMatchObject({ eventId: events[0].id, registrationId: regs[0].id, ticketId: ticket.id });
    expect(ok(await organizer.c.from('tickets').select('id').eq('event_id', events[0].id))).toHaveLength(1);
    record('TCND-04', 'Exactly one ticket with unique UUID and event/registration identity. Malformed rejection exercised in TCND-11.');
    await report.goto('/manage');
    const pending = report.getByRole('region', { name: 'Registration confirmations' }).getByRole('listitem').filter({ hasText: events[0].title });
    await expect(pending).toContainText('pending');
    await pending.getByRole('button', { name: 'Retry confirmation' }).click();
    await expect(pending).toHaveCount(0);
    expect(ok(await organizer.c.from('registration_notifications').select('status,message,ticket_id').eq('registration_id', regs[0].id).single())).toMatchObject({ status: 'ready', ticket_id: ticket.id });
    record('TCND-08', 'Aborted publication network request preserves accepted registration/ticket; organizer sees pending and publishes by retry. Internal failed-publisher branch proven separately in SQL tests.');
    await winnerPage.unroute('**/rest/v1/rpc/publish_confirmation');
    await winnerPage.goto('/tickets');
    await expect(winnerPage.getByRole('region', { name: 'Registration confirmations' })).toContainText(events[0].title);
    await report.goto('/reports');
    await report.getByRole('combobox', { name: 'Report event' }).selectOption(events[0].id);
    await scanner.goto('/scanner');
    await scanner.getByLabel('Check-in event').selectOption(events[0].id);
    const outcome = scanner.getByRole('region', { name: 'Scan outcome' });
    async function scan(payload: string, message: RegExp) {
      await scanner.getByLabel('QR payload').fill(payload);
      await scanner.getByRole('button', { name: 'Validate QR', exact: true }).click();
      await expect(outcome).toContainText(message);
    }
    await scan(ticket.payload, /checked in successfully/);
    await expect(report.getByRole('table').getByText(winner === a ? 'Student 14' : 'Student 15', { exact: false })).toBeVisible();
    await expect(report.getByRole('table').getByText('Checked in', { exact: true })).toBeVisible();
    record('TCND-07', 'Held-open organizer report picked up remote terminal check-in without navigation; row and stored attendance reconciled.');
    await scan(ticket.payload, /Already checked in/);
    // Exercise the actual decoder against a synthetic camera stream of the issued QR.
    const svg = await winnerPage.locator('.ticket-card').filter({ hasText: events[0].title }).getByTestId('ticket-qr').locator('svg').evaluate(element => new XMLSerializer().serializeToString(element));
    await scanner.evaluate(async image => {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
      const context = canvas.getContext('2d')!;
      const qr = new Image(); qr.src = 'data:image/svg+xml;base64,' + btoa(image); await qr.decode();
      const draw = () => { context.fillStyle = 'white'; context.fillRect(0, 0, 600, 600); context.drawImage(qr, 50, 50, 500, 500); };
      draw();
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
        const stream = canvas.captureStream(5);
        const timer = setInterval(draw, 200);
        const originalStop = stream.getTracks()[0].stop.bind(stream.getTracks()[0]);
        stream.getTracks()[0].stop = () => { clearInterval(timer); originalStop(); };
        return stream;
      } });
    }, svg);
    await scanner.getByRole('button', { name: 'Start camera' }).click();
    await expect(outcome).toContainText('Already checked in');
    await scanner.getByRole('button', { name: 'Stop camera' }).click();
    record('QR-camera-decoder', 'Issued QR image decoded through a synthetic canvas video stream, validated as a repeat and camera stopped. Physical camera not certified.');
    await scanner.getByLabel('Check-in event').selectOption(events[1].id);
    await scan(ticket.payload, /Wrong event/);
    expect(ok(await organizer.c.from('attendance').select('id').eq('event_id', events[1].id))).toHaveLength(0);
    record('TCND-05', 'Real issued A payload rejected at B with zero B attendance.');
    await scanner.getByLabel('Check-in event').selectOption(events[0].id);
    await scan('not-json', /malformed/);
    await scan(ticket.payload, /Already checked in/);
    record('TCND-11', 'Valid, repeat, wrong-event, malformed and next valid repeat in one scanner page without restart.');
    const organizer2 = await api('cict.organizer@campus.test');
    const repeats = await Promise.all([organizer, organizer2].map(o => o.c.rpc('scan_ticket', { selected_event: events[0].id, qr_payload: ticket.payload })));
    expect(repeats.every(r => r.data === 'Already checked in')).toBe(true);
    expect(ok(await organizer.c.from('attendance').select('id').eq('event_id', events[0].id))).toHaveLength(1);
    record('TCND-06', 'Concurrent independent authenticated repeat calls plus UI repeats leave exactly one attendance row.');
    const cross = await otherOrg.c.from('events').update({ status: 'cancelled' }).eq('id', events[0].id).select('id');
    expect(cross.data).toEqual([]);
    record('TCND-09', 'Owned future draft created/edited/opened; cross-organization cancellation returned no writable rows.');
    const rB = ok(await a.c.from('registrations').insert({ event_id: events[1].id, user_id: a.id }).select('id').single());
    await studentA.goto(`/events/${events[1].id}`);
    await expect(studentA.getByText('1 total places · 0 remaining')).toBeVisible();
    ok(await a.c.from('registrations').update({ status: 'cancelled' }).eq('id', rB.id));
    await expect(studentA.getByText('1 total places · 1 remaining')).toBeVisible();
    record('TCND-10', 'Held-open details changed from 0 remaining to 1 after API withdrawal, without reload.');
    ok(await organizer.c.from('events').update({ status: 'cancelled' }).eq('id', events[0].id));
    await scanner.getByLabel('Check-in event').selectOption(events[0].id);
    await scan(ticket.payload, /unavailable/);
    expect(ok(await organizer.c.from('attendance').select('id').eq('event_id', events[0].id))).toHaveLength(1);
    expect(ok(await organizer.c.from('registrations').select('id').eq('event_id', events[0].id))).toHaveLength(1);
    record('TCND-12', 'Cancelled event refusal differs from wrong-event; registration/ticket/attendance history retained.');
    await scanner.setViewportSize({ width: 390, height: 844 });
    await mkdir('qa-audit/2026-10-29', { recursive: true });
    await scanner.screenshot({ path: 'qa-audit/2026-10-29/scanner-mobile.png', fullPage: true });
    await expect(scanner.locator('body')).toBeVisible();
    expect(await scanner.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await report.screenshot({ path: 'qa-audit/2026-10-29/attendance-report.png', fullPage: true });
    evidence.status = 'PASS for executed branches';
  } finally {
    // Retain fixture history; no delete, reset or reseed. Close only test contexts.
    await mkdir('qa-audit/2026-10-29', { recursive: true });
    await writeFile('qa-audit/2026-10-29/core-browser-evidence.json', JSON.stringify(evidence, null, 2));
    await Promise.all(contexts.map(c => c.close()));
  }
});

test('new student signup assigns a safe role in the actual website', async ({ page }) => {
  const email = `mtp.core.${Date.now()}@example.com`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Full name').fill('Synthetic MTP Student');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(page.getByText('Student account', { exact: true })).toBeVisible();
  await page.goto('/reports');
  await expect(page).toHaveURL(/\/$/);
});

test('organizer creates, edits, opens and cancels a future event through the website', async ({ page }) => {
  await login(page, 'cict.organizer@campus.test');
  await page.goto('/manage');
  await page.getByRole('button', { name: 'Create event', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Create a new experience' });
  const title = `MTP UI lifecycle ${Date.now()}`;
  await form.getByLabel('Event title').fill(title);
  await form.getByLabel('Description').fill('Synthetic retained organizer form acceptance fixture.');
  await form.getByLabel('Schedule (Philippine time)').fill(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16));
  await form.getByLabel('Venue').fill('QA Hall');
  await form.getByLabel('Capacity').fill('0');
  expect(await form.getByLabel('Capacity').evaluate(element => (element as HTMLInputElement).checkValidity())).toBe(false);
  await form.getByLabel('Capacity').fill('2');
  await form.getByRole('button', { name: 'Save draft' }).click();
  await expect(form).toHaveCount(0);
  const row = page.getByRole('row').filter({ hasText: title });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit draft event' });
  await edit.getByLabel('Venue').fill('QA Hall edited');
  await edit.getByRole('button', { name: 'Save draft' }).click();
  await expect(edit).toHaveCount(0);
  await row.getByRole('button', { name: 'Open registration' }).click();
  await expect(row.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Cancel event', exact: true }).click();
  await page.getByRole('dialog', { name: 'Cancel this event?' }).getByRole('button', { name: 'Cancel event', exact: true }).click();
  await expect(row).toContainText('Cancelled');
});

test('current report and mobile scanner remain usable at their intended widths', async ({ page }) => {
  const evidence = JSON.parse(await readFile('qa-audit/2026-10-29/core-browser-evidence.json', 'utf8'));
  await login(page, 'cict.organizer@campus.test');
  await page.goto('/reports');
  await page.getByRole('combobox', { name: 'Report event' }).selectOption(evidence.events[0].id);
  await expect(page.getByRole('table').getByText('Checked in', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'qa-audit/2026-10-29/attendance-report.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/scanner');
  await page.getByLabel('Check-in event').selectOption(evidence.events[0].id);
  await expect(page.getByRole('button', { name: 'Start camera' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'qa-audit/2026-10-29/scanner-mobile.png', fullPage: true });
});
