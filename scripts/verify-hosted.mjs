import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

// Explicit opt-in: creates one named event and retained test records in a seeded
// development project. Uses only the publishable key and seeded test accounts.
if (!process.argv.includes('--development-test')) throw new Error('Pass --development-test only for the seeded development project.');
const env = Object.fromEntries((await readFile(new URL('../.env.local', import.meta.url), 'utf8')).trim().split(/\r?\n/).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
const make = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const clients = [];
async function login(email) {
  const c = make(); clients.push(c);
  const result = await c.auth.signInWithPassword({ email, password: 'CampusTestOnly123!' });
  assert.equal(result.error, null, `Login failed for test role: ${result.error?.message}`);
  return { c, id: result.data.user.id };
}
const ok = result => { assert.equal(result.error, null, result.error?.message); return result.data; };
try {
  const organizer = await login('cict.organizer@campus.test');
  const arts = await login('arts.organizer@campus.test');
  const first = await login('student14@campus.test');
  const second = await login('student15@campus.test');
  const admin = await login('cict.admin@campus.test');
  assert.equal(ok(await admin.c.from('profiles').select('id')).length, 19);
  const org = ok(await organizer.c.from('profiles').select('organization_id').eq('id',organizer.id).single()).organization_id;
  const e = ok(await organizer.c.from('events').insert({ organization_id: org, created_by: organizer.id, title: `Integration smoke ${new Date().toISOString()}`, description: 'Synthetic independent-client capacity, cancellation and scan verification. Retained as test evidence.', venue: 'Test Hall', category: 'Technology', start_at: new Date(Date.now()+86400000*30).toISOString(), capacity: 1 }).select('*').single());
  ok(await organizer.c.from('events').update({ status: 'open' }).eq('id',e.id).select('id').single());
  const attempts = await Promise.all([first,second].map(p => p.c.from('registrations').insert({ event_id:e.id,user_id:p.id }).select('id').single()));
  assert.equal(attempts.filter(r => !r.error).length,1,'Exactly one independent client may take the last seat.');
  assert.match(attempts.find(r => r.error).error.message,/full/i);
  const winner = attempts[0].error ? second : first;
  const loser = winner === first ? second : first;
  const r = attempts.find(r => !r.error).data;
  assert.match((await winner.c.from('registrations').insert({ event_id:e.id,user_id:winner.id })).error.message,/already registered/i);
  const t = ok(await winner.c.from('tickets').select('*').eq('registration_id',r.id).single());
  ok(await winner.c.from('registrations').update({ status:'cancelled' }).eq('id',r.id).select('id').single());
  assert.match((await organizer.c.rpc('scan_ticket',{selected_event:e.id,qr_payload:t.payload})).error.message,/cancelled/i);
  const replacement = ok(await loser.c.from('registrations').insert({event_id:e.id,user_id:loser.id}).select('id').single());
  const pass = ok(await loser.c.from('tickets').select('*').eq('registration_id',replacement.id).single());
  assert.match(ok(await organizer.c.rpc('scan_ticket',{selected_event:e.id,qr_payload:pass.payload})),/successfully/);
  assert.equal(ok(await organizer.c.rpc('scan_ticket',{selected_event:e.id,qr_payload:pass.payload})),'Already checked in');
  assert.equal(ok(await organizer.c.from('attendance').select('id').eq('event_id',e.id)).length,1);
  assert.equal(ok(await arts.c.from('registrations').select('id').eq('event_id',e.id)).length,0);
  assert.match((await arts.c.rpc('scan_ticket',{selected_event:e.id,qr_payload:pass.payload})).error.message,/access/i);
  assert.ok((await first.c.from('profiles').update({role:'admin'}).eq('id',first.id)).error);
  assert.ok((await make().from('events').select('id')).error);
  ok(await organizer.c.from('events').update({status:'cancelled'}).eq('id',e.id).select('id').single());
  console.log('PASS: hosted Auth, admin visibility, independent-client last-seat race, duplicate rejection, cancellation/seat release, QR validation, scan deduplication, reports, cross-organization RLS, role escalation and signed-out denial.');
  console.log(`Retained test evidence event: ${e.id}`);
} finally { await Promise.all(clients.map(c => c.auth.signOut())); }
