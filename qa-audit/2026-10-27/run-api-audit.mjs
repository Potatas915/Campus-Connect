import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';
const base = new URL('./', import.meta.url);
const mode = process.argv[2];
if (!['setup','registration','reconcile','cancelled','final'].includes(mode)) throw new Error('Use setup, registration, reconcile, cancelled or final. Development QA fixtures only.');
const env = Object.fromEntries((await readFile(new URL('../../.env.local',base),'utf8')).trim().split(/\r?\n/).map(s=>{const at=s.indexOf('=');return [s.slice(0,at),s.slice(at+1)];}));
const clients=[];
const make=()=>createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
const accounts={studentA:'student12@campus.test',studentB:'student13@campus.test',org1:'cict.organizer@campus.test',org2:'arts.organizer@campus.test',admin:'cict.admin@campus.test'};
const c={};
const identities={};
let state={}; let evidence={scope:'Synthetic QA fixtures only; API evidence, not browser screenshots.',startedAt:new Date().toISOString(),checks:[]};
try{state=JSON.parse(await readFile(new URL('state.json',base),'utf8'));}catch{ /* First run has no saved fixture state. */ }
try{evidence=JSON.parse(await readFile(new URL('api-evidence.json',base),'utf8'));}catch{ /* First run starts a new evidence file. */ }
const check=(id,action,expected,observed)=>{const entry={id,at:new Date().toISOString(),action,expected,observed};evidence.checks.push(entry);console.log(JSON.stringify(entry));};
const clean=r=>({data:r.data,error:r.error?{code:r.error.code,message:r.error.message}:null,status:r.status});
async function login(key,email=accounts[key]){const client=make();clients.push(client);const auth=ok(await client.auth.signInWithPassword({email,password:'CampusTestOnly123!'}));identities[key]=auth.user.id;return client;}
async function snapshot(label){
 const ids=[state.A,state.B,state.race].filter(Boolean).map(e=>e.id);
 const events=ok(await c.org1.from('events').select('id,title,venue,start_at,end_at,registration_deadline,capacity,status').in('id',ids).order('title'));
 const registrations=ok(await c.org1.from('registrations').select('id,event_id,user_id,status,registered_at').in('event_id',ids).order('id'));
 const tickets=ok(await c.org1.from('tickets').select('id,event_id,registration_id,payload').in('event_id',ids).order('id'));
 const attendance=ok(await c.org1.from('attendance').select('id,event_id,registration_id,checked_in_by,checked_in_at').in('event_id',ids).order('id'));
 const counts=ok(await c.org1.rpc('event_counts')).filter(r=>ids.includes(r.event_id));
 const value={label,at:new Date().toISOString(),events,registrations,tickets,attendance,counts};
 evidence.snapshots??=[]; evidence.snapshots.push(value);return value;
}
async function attempt(client,event,user){const start=performance.now(),startedAt=new Date().toISOString();const result=await client.from('registrations').insert({event_id:event,user_id:user}).select('id,event_id,user_id,status').single();return {startedAt,finishedAt:new Date().toISOString(),durationMs:Math.round(performance.now()-start),...clean(result)};}
try{
 for(const key of Object.keys(accounts))c[key]=await login(key);
 state.identities=identities;state.accounts=accounts;
 if(mode==='setup'){
  if(state.A)throw new Error('Setup was already completed; preserving existing QA fixtures.');
  state.prefix='QA Audit 2026-10-27';
  state.A=ok(await c.org1.from('events').select('*').eq('title',state.prefix+' Event A').single());
  assert.equal(state.A.status,'open');
  const org=ok(await c.org1.from('profiles').select('organization_id').eq('id',identities.org1).single()).organization_id;
  for(const [key,title,capacity] of [['B','Event B',3],['race','Last Seat',1]]){
   const e=ok(await c.org1.from('events').insert({organization_id:org,created_by:identities.org1,title:state.prefix+' '+title,description:'Synthetic retained audit fixture.',venue:'QA Test Hall '+title,start_at:'2026-11-30T10:00:00+08:00',capacity,category:'Technology'}).select('*').single());
   state[key]=ok(await c.org1.from('events').update({status:'open'}).eq('id',e.id).select('*').single());
  }
  check('SETUP','Create isolated events under seeded Org 1 organizer.','Three named synthetic events; no changes to existing events.',Object.fromEntries(['A','B','race'].map(k=>[k,{id:state[k].id,title:state[k].title,capacity:state[k].capacity,status:state[k].status}])));
  for(const capacity of [0,-1,'abc']){
   const r=await c.org1.from('events').insert({organization_id:org,created_by:identities.org1,title:state.prefix+' Invalid '+capacity,description:'Should not persist.',venue:'QA',start_at:'2026-11-30T10:00:00+08:00',capacity,category:'Technology'}).select('id');
   check('TCND-09','Try invalid capacity '+capacity+' via the same database API.','No event created.',clean(r));
   assert.ok(r.error);
  }
  const org2Before=ok(await c.org2.from('events').select('id,status,venue').eq('id',state.A.id).single());
  const edit=await c.org2.from('events').update({venue:'UNAUTHORIZED QA CHANGE'}).eq('id',state.A.id).select('id').single();
  const cancel=await c.org2.from('events').update({status:'cancelled'}).eq('id',state.A.id).select('id').single();
  const org1After=ok(await c.org1.from('events').select('id,status,venue').eq('id',state.A.id).single());
  assert.ok(edit.error);assert.ok(cancel.error);assert.deepEqual(org1After,org2Before);
  check('TCND-09','Org 2 attempts edit/cancel of Org 1 Event A.','Denied; venue/status unchanged.',{edit:clean(edit),cancel:clean(cancel),before:org2Before,after:org1After});
  const privateRows=await c.studentA.from('registrations').select('*').in('event_id',[state.A.id,state.B.id,state.race.id]);
  const profiles=ok(await c.studentA.from('profiles').select('id,role'));
  const forceCreate=await c.studentA.from('events').insert({organization_id:org,created_by:identities.studentA,title:'Unauthorized student event',description:'Should not persist.',venue:'QA',category:'Technology',start_at:'2026-11-30T10:00:00+08:00',capacity:1}).select('id');
  assert.deepEqual(privateRows.data,[]);assert.deepEqual(profiles,[{id:identities.studentA,role:'student'}]);assert.ok(forceCreate.error);
  check('TCND-01','Student queries organizer records and attempts event creation.','No other profiles/private registrations; organizer action denied.',{profiles,registrations:clean(privateRows),create:clean(forceCreate)});
  await snapshot('before student UI registration');
 }
 if(mode==='registration'){
  const before=await snapshot('after Student A browser registration');
  const own=before.registrations.filter(r=>r.event_id===state.A.id&&r.user_id===identities.studentA);
  assert.equal(own.length,1);
  const duplicate=await attempt(c.studentA,state.A.id,identities.studentA);
  const secondSession=await login('studentASecond',accounts.studentA);
  const duplicateSecondSession=await attempt(secondSession,state.A.id,identities.studentA);
  const ownTickets=before.tickets.filter(t=>own.some(r=>r.id===t.registration_id));assert.equal(ownTickets.length,1);
  check('TCND-03','Replay accepted registration and retry from independently authenticated second session.','Clear refusal; still exactly one registration/ticket.',{duplicate,duplicateSecondSession,registration:own,tickets:ownTickets});
  assert.match(duplicate.error.message,/already registered/i);assert.match(duplicateSecondSession.error.message,/already registered/i);
  const bA=await attempt(c.studentB,state.A.id,identities.studentB);assert.equal(bA.error,null);state.studentBA=bA.data;
  const bB=await attempt(c.studentB,state.B.id,identities.studentB);assert.equal(bB.error,null);state.studentBB=bB.data;
  const gate=Promise.withResolvers();
  const started=Date.now();
  const raceResults=await Promise.all(['studentA','studentB'].map(async key=>{await gate.promise;return {account:key,...await attempt(c[key],state.race.id,identities[key])};}).map((p,i)=>{if(i===1)gate.resolve();return p;}));
  const sequential=await attempt(c.studentA,state.race.id,identities.studentA);
  assert.equal(raceResults.filter(r=>!r.error).length,1);
  const full=await snapshot('last-seat concurrent requests and capacity-plus-one');
  const accepted=full.registrations.filter(r=>r.event_id===state.race.id&&r.status!=='cancelled');assert.equal(accepted.length,1);
  check('TCND-02','Barrier-release two independently authenticated API requests for one seat, then retry sequentially.','At most one accepted; count=1/capacity1; rejected request has no ticket.',{startedAt:new Date(started).toISOString(),attempts:raceResults,sequential,accepted,counts:full.counts.filter(r=>r.event_id===state.race.id),tickets:full.tickets.filter(t=>t.event_id===state.race.id),browserSimultaneity:'API request intervals only; not two physical devices.'});
  const countsBefore=full.counts.find(r=>r.event_id===state.A.id);
  const cancel=await c.studentB.from('registrations').update({status:'cancelled'}).eq('id',state.studentBA.id).select('id,status').single();ok(cancel);
  const after=await snapshot('after cancelling Student B registration in A');
  check('TCND-10','Cancel unscanned Student B registration in A.','Accepted count drops 2→1; remaining 1→2; cancelled registration/ticket retained.',{before:countsBefore,after:after.counts.find(r=>r.event_id===state.A.id),cancel:clean(cancel)});
  const activeTickets=after.tickets;assert.equal(new Set(activeTickets.map(t=>t.id)).size,activeTickets.length);assert.equal(new Set(activeTickets.map(t=>t.payload)).size,activeTickets.length);
  check('TCND-04','Compare every accepted audit registration and issued ticket, including rejected duplicates/full requests.','One ticket per accepted registration; unique IDs/payloads; no ticket for rejection.',{registrations:after.registrations,tickets:activeTickets});
  state.aTicket=activeTickets.find(t=>t.event_id===state.A.id&&own.some(r=>r.id===t.registration_id));
  state.bTicket=activeTickets.find(t=>t.registration_id===state.studentBB.id);
  state.cancelledTicket=activeTickets.find(t=>t.registration_id===state.studentBA.id);
  const wrong=await c.org1.rpc('scan_ticket',{selected_event:state.B.id,qr_payload:state.aTicket.payload});
  assert.match(wrong.error.message,/Wrong event/);
  check('TCND-05','Present Event A issued payload to Event B validator.','Wrong event refusal; Event B attendance remains zero.',{response:clean(wrong),payload:JSON.parse(state.aTicket.payload),eventBAttendance:ok(await c.org1.from('attendance').select('*').eq('event_id',state.B.id))});
  const inactive=await c.org1.rpc('scan_ticket',{selected_event:state.A.id,qr_payload:state.cancelledTicket.payload});
  check('TCND-10','Try the cancelled Student B registration ticket.','Inactive ticket refused.',clean(inactive));assert.ok(inactive.error);
  await snapshot('before scanner UI sequence');
 }
 if(mode==='reconcile'){
  const before=await snapshot('after four-outcome browser scanner sequence');
  assert.equal(before.attendance.filter(a=>a.event_id===state.A.id).length,1);
  const secondScanner=await login('scannerSecond',accounts.org1);
  const outcomes=await Promise.all([c.org1,secondScanner].map(async scanner=>{const t=performance.now();const r=await scanner.rpc('scan_ticket',{selected_event:state.A.id,qr_payload:state.aTicket.payload});return {durationMs:Math.round(performance.now()-t),...clean(r)};}));
  assert.ok(outcomes.every(r=>r.data==='Already checked in'));
  const after=await snapshot('after repeated scans on independent organizer sessions');
  const aAttendance=after.attendance.filter(a=>a.event_id===state.A.id);assert.equal(aAttendance.length,1);
  check('TCND-06','Repeat issued A ticket from two independent organizer API sessions.','Exactly one attendance row, correlated to scanned Student A registration.',{outcomes,attendance:aAttendance,registrations:after.registrations.filter(r=>r.event_id===state.A.id)});
  check('TCND-07','Reconcile attendance in both directions across events A/B and cancelled registration.','A contains only Student A; B empty; no cancelled/unscanned student counted.',{attendance:after.attendance,registrations:after.registrations,studentA:identities.studentA,studentB:identities.studentB});
  const elapsed=[];
  for(const [name,payload] of [['repeat',state.aTicket.payload],['wrong-event',state.bTicket.payload],['unreadable','not-a-qr-payload']]){
   const start=performance.now();const result=await c.org1.rpc('scan_ticket',{selected_event:state.A.id,qr_payload:payload});elapsed.push({name,durationMs:Math.round(performance.now()-start),...clean(result)});
  }
  check('PART-C','Observe future-event check-in and network validation round-trip.','Report only; team timing/window assumptions are not failure thresholds.',{event:state.A.start_at,checkIn:after.attendance[0]?.checked_in_at,roundTrips:elapsed,displayedPayload:JSON.parse(state.aTicket.payload)});
 }
 if(mode==='cancelled'){
  const before=await snapshot('after organizer browser event cancellation');
  assert.equal(before.events.find(e=>e.id===state.A.id).status,'cancelled');
  const response=await c.org1.rpc('scan_ticket',{selected_event:state.A.id,qr_payload:state.aTicket.payload});
  assert.match(response.error.message,/unavailable/);
  const after=await snapshot('cancelled event ticket rejection');
  check('TCND-12','Present issued A ticket after event cancellation.','Refused distinctly from wrong-event; earlier registrations, tickets and attendance retained.',{response:clean(response),registrations:after.registrations.filter(r=>r.event_id===state.A.id),tickets:after.tickets.filter(t=>t.event_id===state.A.id),attendance:after.attendance.filter(a=>a.event_id===state.A.id)});
 }
 if(mode==='final'){
  check('TCND-09','Cross-check failed Org 2 browser capacity submissions.','No invalid Org 2 event persisted.',ok(await c.org2.from('events').select('id,title').eq('title','QA Audit Invalid Org 2')));
  check('A1.1','Look for the synthetic browser signup profile after its reported errors.','Record role only if signup actually created a profile.',ok(await c.admin.from('profiles').select('id,email,role').in('email',['qa.audit.20261027.1818@example.test','qa.audit.20261027.1818@example.com'])));
  const final=await snapshot('final retained QA evidence');
  const counts=final.events.map(e=>({event:e.title,id:e.id,capacity:e.capacity,status:e.status,accepted:final.registrations.filter(r=>r.event_id===e.id&&r.status!=='cancelled').length,remaining:e.capacity-final.registrations.filter(r=>r.event_id===e.id&&r.status!=='cancelled').length,attendance:final.attendance.filter(a=>a.event_id===e.id).length}));
  check('FINAL','Read final retained fixture invariants.','Capacity never exceeded; counts reconcile with issued registrations.',counts);
  assert.ok(counts.every(e=>e.remaining>=0));
 }
 evidence.updatedAt=new Date().toISOString();
 await writeFile(new URL('state.json',base),JSON.stringify(state,null,2)+'\n');
 await writeFile(new URL('api-evidence.json',base),JSON.stringify(evidence,null,2)+'\n');
}catch(error){
 evidence.failure={at:new Date().toISOString(),mode,message:error.message};
 await writeFile(new URL('state.json',base),JSON.stringify(state,null,2)+'\n');
 await writeFile(new URL('api-evidence.json',base),JSON.stringify(evidence,null,2)+'\n');
 throw error;
}finally{
 await Promise.all(clients.map(client=>client.auth.signOut({scope:'local'})));
}
