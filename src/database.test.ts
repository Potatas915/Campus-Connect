import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error The local SQL harness is a Node-only JavaScript module.
import { testDatabase } from '../scripts/database.mjs';
import type { PGlite } from '@electric-sql/pglite';
let db: PGlite;
let createdDraft: string;
const ids = { student: '00000000-0000-4000-8000-000000000001', other: '00000000-0000-4000-8000-000000000002', organizer: '00000000-0000-4000-8000-000000000003', arts: '00000000-0000-4000-8000-000000000004', admin: '00000000-0000-4000-8000-000000000005' };
const org = '10000000-0000-4000-8000-000000000001';
const arts = '10000000-0000-4000-8000-000000000002';
const tech = '20000000-0000-4000-8000-000000000001';
const draft = '20000000-0000-4000-8000-000000000002';
async function as(user: keyof typeof ids | null) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ? ids[user] : '']);
  if (user) await db.exec('set role authenticated');
}
async function register(eventId = tech, user: keyof typeof ids = 'student') {
  return db.query<{ id: string }>('insert into public.registrations(event_id,user_id) values($1,$2) returning id', [eventId, ids[user]]);
}
beforeAll(async () => {
  db = await testDatabase();
  await db.query("insert into public.organizations(id,name,short) values($1,'CICT','CICT'),($2,'Arts','CAS')", [org, arts]);
  for (const [name, id] of Object.entries(ids)) await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [id, `${name}@example.test`, { full_name: name, role: 'admin' }]);
  await db.query("update public.profiles set role='organizer',organization_id=$1 where id=$2", [org, ids.organizer]);
  await db.query("update public.profiles set role='organizer',organization_id=$1 where id=$2", [arts, ids.arts]);
  await db.query("update public.profiles set role='admin' where id=$1", [ids.admin]);
  for (const [id, status] of [[tech, 'open'], [draft, 'draft']]) await db.query("insert into public.events(id,organization_id,title,description,venue,category,start_at,capacity,status,created_by) values($1,$2,'Test event','Test description','Hall','Technology',now()+interval '30 days',1,$3,$4)", [id, org, status, ids.organizer]);
}, 30000);
afterAll(async () => { await db?.close(); });

describe('PostgreSQL capacity, tickets and access controls', () => {
  it('creates student profiles regardless of role metadata and hides drafts/other profiles', async () => {
    await as('student');
    expect((await db.query<{ role: string }>('select role from public.profiles')).rows).toEqual([{ role: 'student' }]);
    expect((await db.query('select * from public.events')).rows).toHaveLength(1);
    await expect(db.exec("update public.profiles set role='admin' where id=auth.uid()")).rejects.toThrow('permissions');
    await expect(db.exec(`update public.profiles set organization_id='${org}' where id=auth.uid()`)).rejects.toThrow('permissions');
  });
  it('issues exactly one scoped ticket, rejects duplicates and the full event', async () => {
    await as('student'); await register();
    const t = (await db.query<{ payload: string; id: string; registration_id: string }>('select * from public.tickets')).rows[0];
    expect(JSON.parse(t.payload)).toEqual({ version: 1, eventId: tech, registrationId: t.registration_id, ticketId: t.id });
    await expect(register()).rejects.toThrow('already registered');
    await as('other'); await expect(register(tech, 'other')).rejects.toThrow('full');
    expect((await db.query('select * from public.registrations')).rows).toHaveLength(0);
    expect((await db.query('select * from public.event_counts()')).rows[0]).toMatchObject({ accepted_count: 1 });
  });
  it('cancels own registration, releases the seat, retains ticket, forbids reopening', async () => {
    await as('student');
    await db.exec("update public.registrations set status='cancelled'");
    expect((await db.query('select * from public.tickets')).rows).toHaveLength(1);
    await expect(db.exec("update public.registrations set status='registered'")).rejects.toThrow('transition');
    await as('other'); await register(tech, 'other');
    await expect(db.exec("update public.registrations set status='attended'")).rejects.toThrow('transition');
    await expect(db.exec(`insert into public.attendance(registration_id,event_id,checked_in_by) select id,event_id,'${ids.other}'::uuid from public.registrations`)).rejects.toThrow();
  });
  it('prevents impersonation, cross-organization management and direct ticket/attendance writes', async () => {
    await as('student'); await expect(register(tech, 'other')).rejects.toThrow();
    await as('arts');
    expect((await db.query('select * from public.registrations')).rows).toHaveLength(0);
    expect((await db.query('select * from public.tickets')).rows).toHaveLength(0);
    expect((await db.exec(`update public.events set status='cancelled' where id='${tech}'`))[0].affectedRows).toBe(0);
    await expect(db.query('select public.scan_ticket($1,$2)', [tech, '{}'])).rejects.toThrow('access');
  });
  it('checks in once, rejects malformed/unknown/wrong-event/cancelled-registration tickets', async () => {
    await as('organizer');
    const tickets = (await db.query<{ payload: string; registration_id: string }>('select * from public.tickets order by registration_id')).rows;
    const active = (await db.query<{ payload: string }>("select t.payload from public.tickets t join public.registrations r on r.id=t.registration_id where r.status='registered'")).rows[0].payload;
    const cancelled = tickets.find(t => t.payload !== active)!.payload;
    for (const payload of ['broken', 'null', '{}', JSON.stringify({ ...JSON.parse(active), ticketId: 'unknown' })]) await expect(db.query('select public.scan_ticket($1,$2)', [tech, payload])).rejects.toThrow('Invalid ticket');
    await expect(db.query('select public.scan_ticket($1,$2)', [tech, cancelled])).rejects.toThrow('cancelled');
    await expect(db.query('select public.scan_ticket($1,$2)', [draft, active])).rejects.toThrow('unavailable');
    expect((await db.query<{ result: string }>('select public.scan_ticket($1,$2) result', [tech, active])).rows[0].result).toContain('successfully');
    expect((await db.query<{ result: string }>('select public.scan_ticket($1,$2) result', [tech, active])).rows[0].result).toBe('Already checked in');
    expect((await db.query('select * from public.attendance')).rows).toHaveLength(1);
    await as('other'); await expect(db.exec("update public.registrations set status='cancelled'")).rejects.toThrow();
  });
  it('preserves draft lifecycle, ownership and cancellation records', async () => {
    await as('organizer');
    await db.query("update public.events set title='Edited draft' where id=$1", [draft]);
    await db.query("update public.events set status='open' where id=$1", [draft]);
    await expect(db.query("update public.events set title='Invalid edit' where id=$1", [draft])).rejects.toThrow('Only draft');
    await expect(db.query('update public.events set organization_id=$1 where id=$2', [arts, draft])).rejects.toThrow('ownership');
    await db.query("update public.events set status='cancelled' where id=$1", [tech]);
    expect((await db.query('select * from public.attendance')).rows).toHaveLength(1);
    await expect(db.query("update public.events set status='open' where id=$1", [tech])).rejects.toThrow('transition');
  });
  it('permits admin management and denies anonymous access', async () => {
    await as('admin'); expect((await db.query('select * from public.profiles')).rows).toHaveLength(5);
    await db.query("update public.organizations set description='Admin edit' where id=$1", [org]);
    await as(null); await db.exec('set role anon');
    await expect(db.exec('select * from public.events')).rejects.toThrow('permission');
    await expect(db.exec('select public.event_counts()')).rejects.toThrow('permission');
    await as(null);
  });
  it('creates an owned future draft with a visible returning row', async () => {
    await as('organizer');
    const result = await db.query<{ id: string; status: string }>("insert into public.events(organization_id,title,description,venue,category,start_at,capacity,created_by) values($1,'New draft','Description','Hall','Workshop',now()+interval '5 days',10,$2) returning id,status", [org, ids.organizer]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ status: 'draft' });
    createdDraft = result.rows[0].id;
  });
  it('rejects draft, closed and past registration and cross-event QR payloads', async () => {
    await as(null);
    const eid = '20000000-0000-4000-8000-000000000099';
    await db.query("insert into public.events(id,organization_id,title,description,venue,category,start_at,capacity,status,created_by) values($1,$2,'Past','Description','Hall','Technology',now()-interval '1 day',3,'open',$3)", [eid,org,ids.organizer]);
    const closed = (await db.query<{ id: string }>("insert into public.events(organization_id,title,description,venue,category,start_at,capacity,status,created_by) values($1,'Closed','Description','Hall','Technology',now()+interval '1 day',3,'closed',$2) returning id", [org,ids.organizer])).rows[0].id;
    await as('student');
    await expect(register(eid)).rejects.toThrow('closed');
    await expect(register(createdDraft)).rejects.toThrow('closed');
    await expect(register(closed)).rejects.toThrow('closed');
    await as('organizer');
    const payload = (await db.query<{ payload: string }>('select payload from public.tickets limit 1')).rows[0].payload;
    await expect(db.query('select public.scan_ticket($1,$2)', [draft,payload])).rejects.toThrow('Wrong event');
  });
});
