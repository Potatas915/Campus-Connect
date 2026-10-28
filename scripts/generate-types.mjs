import { writeFile } from 'node:fs/promises';
import { testDatabase } from './database.mjs';

const db = await testDatabase();
try {
  const { rows } = await db.query(`select table_name,column_name,data_type,is_nullable,column_default
    from information_schema.columns where table_schema='public' order by table_name,ordinal_position`);
  const types = { uuid: 'string', text: 'string', 'timestamp with time zone': 'string', integer: 'number', bigint: 'number' };
  let source = '// Generated from the versioned migrations by npm run db:types. Do not edit.\n';
  source += 'export type Database = { public: { Tables: {\n';
  for (const table of [...new Set(rows.map(r => r.table_name))]) {
    const columns = rows.filter(r => r.table_name === table);
    source += `  ${table}: {\n`;
    for (const kind of ['Row', 'Insert', 'Update']) {
      source += `    ${kind}: {\n`;
      for (const c of columns) {
        const optional = kind === 'Update' || kind === 'Insert' && (c.column_default || c.is_nullable === 'YES');
        source += `      ${c.column_name}${optional ? '?' : ''}: ${types[c.data_type] || 'unknown'}${c.is_nullable === 'YES' ? ' | null' : ''};\n`;
      }
      source += '    };\n';
    }
    source += '    Relationships: [];\n  };\n';
  }
  source += `}; Views: Record<never, never>; Functions: {
  event_counts: { Args: Record<never, never>; Returns: { event_id: string; accepted_count: number }[] };
  scan_ticket: { Args: { selected_event: string; qr_payload: string }; Returns: string };
  publish_confirmation: { Args: { registration: string }; Returns: string };
}; Enums: Record<never, never>; CompositeTypes: Record<never, never>; } };\n`;
  await writeFile(new URL('../src/database.types.ts', import.meta.url), source);
  console.log('Generated TypeScript table types from the applied local migration catalog.');
} finally { await db.close(); }
