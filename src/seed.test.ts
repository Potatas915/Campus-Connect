import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
// @ts-expect-error Node-only SQL test harness.
import { testDatabase } from '../scripts/database.mjs';

it('seeds 19 Auth identities, 10 events and consistent tickets/attendance, without duplication on rerun', async () => {
  const db = await testDatabase();
  try {
    const sql = await readFile(new URL('../../supabase/seed.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    expect((await db.query('select * from public.organizations')).rows).toHaveLength(2);
    expect((await db.query('select * from public.events')).rows).toHaveLength(10);
    expect((await db.query("select * from public.profiles where role='student'")).rows).toHaveLength(15);
    expect((await db.query("select * from public.profiles where role='organizer'")).rows).toHaveLength(2);
    expect((await db.query("select * from public.profiles where role='admin'")).rows).toHaveLength(2);
    expect((await db.query('select * from auth.identities')).rows).toHaveLength(19);
    expect((await db.query('select * from public.tickets')).rows).toHaveLength(10);
    expect((await db.query("select * from public.registrations where status='cancelled'")).rows).toHaveLength(1);
    expect((await db.query("select * from public.registrations where status='attended'")).rows).toHaveLength(1);
    expect((await db.query('select * from public.attendance')).rows).toHaveLength(1);
    expect((await db.query("select e.id from public.events e join public.registrations r on r.event_id=e.id and r.status<>'cancelled' group by e.id having count(*)>e.capacity")).rows).toHaveLength(0);
    expect((await db.query("select id from auth.users where encrypted_password=extensions.crypt('CampusTestOnly123!',encrypted_password)")).rows).toHaveLength(19);
  } finally { await db.close(); }
}, 30000);
