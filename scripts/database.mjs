import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFile, readdir } from 'node:fs/promises';

export async function testDatabase({ through } = {}) {
  const db = new PGlite({ extensions: { pgcrypto } });
  // Supabase supplies auth.users/auth.uid()/API roles. This local harness supplies
  // only their SQL boundary; it does not pretend to run GoTrue or PostgREST.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema extensions;
    create table auth.users (id uuid primary key, email text unique, raw_user_meta_data jsonb default '{}',
      instance_id uuid, aud text, role text, encrypted_password text, email_confirmed_at timestamptz,
      raw_app_meta_data jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz,
      confirmation_token text, recovery_token text, email_change_token_new text, email_change text);
    create table auth.identities (id uuid primary key, provider_id text, user_id uuid references auth.users(id),
      identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
      unique(provider_id,provider));
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
  `);
  const directory = new URL('../../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(n => n.endsWith('.sql')).sort()) {
    if (through && name.slice(0, 14) > through) continue;
    await db.exec(await readFile(new URL(name, directory), 'utf8'));
  }
  return db;
}
