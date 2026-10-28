import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
// @ts-expect-error Node-only SQL harness.
import { testDatabase } from '../scripts/database.mjs';
let db: PGlite;
const student = '00000000-0000-4000-8000-000000000001';
const organizer = '00000000-0000-4000-8000-000000000002';
const outsider = '00000000-0000-4000-8000-000000000003';
const org = '10000000-0000-4000-8000-000000000001';
let event: string, registration: string;
async function as(id: string | null) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  if (id) await db.exec('set role authenticated');
}
beforeAll(async () => {
  db = await testDatabase();
  for (const id of [student, organizer, outsider]) await db.query('insert into auth.users(id,email) values($1,$2)', [id, `${id}@example.test`]);
  await db.query("insert into public.organizations(id,name,short) values($1,'Test org','TEST')", [org]);
  await db.query("update public.profiles set role='organizer',organization_id=$1 where id=$2", [org, organizer]);
  event = (await db.query<{ id: string }>("insert into public.events(organization_id,title,description,venue,category,start_at,capacity,status,created_by) values($1,'Welcome event','Description','Hall','Technology',now()+interval '30 days',2,'open',$2) returning id", [org, organizer])).rows[0].id;
  await as(student);
  registration = (await db.query<{ id: string }>('insert into public.registrations(event_id,user_id) values($1,$2) returning id', [event, student])).rows[0].id;
}, 30000);
afterAll(async () => { await db?.close(); });
it('queues one confirmation per accepted registration and forbids direct writes', async () => {
  expect((await db.query('select status from public.registration_notifications')).rows).toEqual([{ status: 'pending' }]);
  await expect(db.exec("update public.registration_notifications set status='ready'")).rejects.toThrow();
  await expect(db.query('insert into public.registrations(event_id,user_id) values($1,$2)', [event, student])).rejects.toThrow('already registered');
  expect((await db.query('select * from public.registration_notifications')).rows).toHaveLength(1);
});
it('keeps accepted registration and ticket on publication failure and permits safe retry', async () => {
  await as(null);
  await db.exec("alter function campus_private.confirmation_text(uuid) rename to confirmation_text_original; create function campus_private.confirmation_text(uuid) returns text language plpgsql as $$ begin raise exception 'private provider detail'; end; $$; revoke all on function campus_private.confirmation_text(uuid) from public,anon,authenticated;");
  await as(student);
  expect((await db.query<{ result: string }>('select public.publish_confirmation($1) result', [registration])).rows[0].result).toBe('failed');
  expect((await db.query('select * from public.registrations')).rows).toHaveLength(1);
  expect((await db.query('select * from public.tickets')).rows).toHaveLength(1);
  await as(organizer);
  expect((await db.query('select status,error_message from public.registration_notifications')).rows).toEqual([{ status: 'failed', error_message: 'Confirmation could not be published. Please retry.' }]);
  await as(null);
  await db.exec('drop function campus_private.confirmation_text(uuid); alter function campus_private.confirmation_text_original(uuid) rename to confirmation_text;');
  await as(organizer);
  expect((await db.query<{ result: string }>('select public.publish_confirmation($1) result', [registration])).rows[0].result).toBe('ready');
  await db.query('select public.publish_confirmation($1)', [registration]);
  const rows = (await db.query<{ message: string; attempts: number; ticket_id: string }>('select * from public.registration_notifications')).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].message).toContain('Welcome event');
  expect(rows[0].ticket_id).toBeTruthy();
  expect(rows[0].attempts).toBe(2);
});
it('denies other students and anonymous publication and preserves cancelled history', async () => {
  await as(outsider);
  expect((await db.query('select * from public.registration_notifications')).rows).toHaveLength(0);
  await expect(db.query('select public.publish_confirmation($1)', [registration])).rejects.toThrow('access');
  await as(student);
  await db.query("update public.registrations set status='cancelled' where id=$1", [registration]);
  expect((await db.query<{ status: string }>('select status from public.registration_notifications')).rows[0].status).toBe('inactive');
  expect((await db.query<{ result: string }>('select public.publish_confirmation($1) result', [registration])).rows[0].result).toBe('inactive');
  await as(null); await db.exec('set role anon');
  await expect(db.query('select public.publish_confirmation($1)', [registration])).rejects.toThrow();
});
it('backfills a pre-upgrade database without changing tickets or notifying cancelled history', async () => {
  const legacy = await testDatabase({ through: '20261027093956' });
  try {
    await legacy.exec(await readFile(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'));
    const before = (await legacy.query('select id,payload from public.tickets order by id')).rows;
    const expected = (await legacy.query("select r.id from public.registrations r join public.events e on e.id=r.event_id where r.status<>'cancelled' and e.status<>'cancelled'")).rows.length;
    await legacy.exec(await readFile(new URL('../../supabase/migrations/20261029010000_registration_notifications.sql', import.meta.url), 'utf8'));
    expect((await legacy.query('select * from public.registration_notifications')).rows).toHaveLength(expected);
    expect((await legacy.query('select id,payload from public.tickets order by id')).rows).toEqual(before);
  } finally { await legacy.close(); }
}, 30000);
