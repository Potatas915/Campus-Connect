import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
const base=new URL('./',import.meta.url), mode=process.argv[2];
if(!['setup','fill-a','release-a','fill-b','verify'].includes(mode))throw new Error('Explicit fix-retest mode required. Synthetic fixtures only.');
const env=Object.fromEntries((await readFile(new URL('../../.env.local',base),'utf8')).trim().split(/\r?\n/).map(s=>{const at=s.indexOf('=');return[s.slice(0,at),s.slice(at+1)];}));
const clients=[];
const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
async function login(email){const c=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(c);const auth=ok(await c.auth.signInWithPassword({email,password:'CampusTestOnly123!'}));return{c,id:auth.user.id,user:auth.user};}
let state={},evidence={checks:[]};
try{state=JSON.parse(await readFile(new URL('fix-state.json',base),'utf8'));evidence=JSON.parse(await readFile(new URL('fix-api-evidence.json',base),'utf8'));}catch{ /* First setup creates the fixture state. */ }
const record=(name,data)=>{const row={name,at:new Date().toISOString(),data};evidence.checks.push(row);console.log(JSON.stringify(row));};
try{
 const org=await login('cict.organizer@campus.test'), b=await login('student13@campus.test');
 if(mode==='setup'){
  assert.ok(!state.A,'Existing retest fixtures preserved.');
  const organization=ok(await org.c.from('profiles').select('organization_id').eq('id',org.id).single()).organization_id;
  for(const [key,suffix] of [['A','Availability'],['B','Rejection']]){
   const e=ok(await org.c.from('events').insert({organization_id:organization,created_by:org.id,title:'QA Fix Retest 2026-10-27 '+suffix,description:'Synthetic retained remediation verification.',venue:'QA Retest Hall',category:'Technology',capacity:1,start_at:'2026-11-30T10:00:00+08:00'}).select('*').single());
   state[key]=ok(await org.c.from('events').update({status:'open'}).eq('id',e.id).select('*').single());
  }
  record('retained retest fixtures',{A:state.A.id,B:state.B.id});
 }
 if(mode==='fill-a'||mode==='fill-b'){
  const key=mode==='fill-a'?'A':'B';
  state['registration'+key]=ok(await b.c.from('registrations').insert({event_id:state[key].id,user_id:b.id}).select('id,event_id,status').single());
  record('independent session filled '+key,state['registration'+key]);
 }
 if(mode==='release-a')record('independent session released A',ok(await b.c.from('registrations').update({status:'cancelled'}).eq('id',state.registrationA.id).select('id,status').single()));
 if(mode==='verify'){
  const a=await login('qa.fix.20261027@example.com');
  const profile=ok(await a.c.from('profiles').select('id,full_name,role,organization_id,email').eq('id',a.id).single());assert.equal(profile.role,'student');assert.equal(profile.organization_id,null);
  const escalation=await a.c.from('profiles').update({role:'admin'}).eq('id',a.id);assert.ok(escalation.error);
  record('fresh no-SMTP account and student-only role',{profile,hasSession:true,authEmailAutoConfirmed:!!a.user.email_confirmed_at,roleEscalationError:escalation.error.message});
  const settings=await fetch(env.VITE_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY}}).then(r=>r.json());
  assert.equal(settings.mailer_autoconfirm,true);record('public Auth settings',{mailer_autoconfirm:settings.mailer_autoconfirm,disable_signup:settings.disable_signup});
  const ids=[state.A.id,state.B.id];
  const registrations=ok(await org.c.from('registrations').select('id,event_id,user_id,status').in('event_id',ids));
  const tickets=ok(await org.c.from('tickets').select('id,event_id,registration_id').in('event_id',ids));
  const counts=ok(await org.c.rpc('event_counts')).filter(c=>ids.includes(c.event_id));
  assert.ok(counts.every(c=>c.accepted_count<=1));assert.equal(registrations.filter(r=>r.event_id===state.A.id&&r.user_id===a.id&&r.status==='registered').length,1);
  assert.equal(registrations.filter(r=>r.event_id===state.B.id&&r.user_id===a.id).length,0);
  record('fresh counts and persisted registrations/tickets',{registrations,tickets,counts});
 }
 await writeFile(new URL('fix-state.json',base),JSON.stringify(state,null,2)+'\n');await writeFile(new URL('fix-api-evidence.json',base),JSON.stringify(evidence,null,2)+'\n');
}finally{await Promise.all(clients.map(c=>c.auth.signOut({scope:'local'})));}
