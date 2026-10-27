import { client } from './supabase';
import type { Database } from './database.types';

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type User = { id: string; name: string; email: string; role: 'student' | 'organizer' | 'admin'; organizationId?: string };
export type Organization = { id: string; name: string; short: string };
export type Event = { id: string; organizationId: string; title: string; description: string; category: string; venue: string; date: string; capacity: number; status: 'draft' | 'open' | 'closed' | 'cancelled' | 'completed'; theme: number; registrationDeadline: string | null };
export type Registration = { id: string; studentId: string; eventId: string; status: 'registered' | 'cancelled' | 'attended'; createdAt: string };
export type Ticket = { id: string; registrationId: string; eventId: string; payload: string };
export type Attendance = { id: string; registrationId: string; eventId: string; scannedAt: string };
export type Snapshot = { organizations: Organization[]; events: Event[]; registrations: Registration[]; tickets: Ticket[]; attendance: Attendance[]; users: User[]; counts: Record<string, number> };
const profile = (p: Row<'profiles'>): User => ({ id: p.id, name: p.full_name, email: p.email, role: p.role as User['role'], organizationId: p.organization_id ?? undefined });
const event = (e: Row<'events'>): Event => ({ id: e.id, organizationId: e.organization_id, title: e.title, description: e.description, category: e.category, venue: e.venue, date: e.start_at, capacity: e.capacity, status: e.status as Event['status'], theme: e.theme, registrationDeadline: e.registration_deadline });
const ticket = (t: Row<'tickets'>): Ticket => ({ id: t.id, registrationId: t.registration_id, eventId: t.event_id, payload: t.payload });
export function checked<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error('The server returned no data. Please refresh and try again.');
  return data;
}
function success({ error }: { error: { message: string } | null }) { if (error) throw new Error(error.message); }
async function all<T extends keyof Database['public']['Tables']>(table: T): Promise<Row<T>[]> {
  const rows: Row<T>[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = checked(await client().from(table).select('*').order('id').range(offset, offset + 499)) as unknown as Row<T>[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
async function eventCounts() {
  const rows: { event_id: string; accepted_count: number }[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = checked(await client().rpc('event_counts').order('event_id').range(offset, offset + 499));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export const service = {
  async session(): Promise<User | null> {
    const { data, error } = await client().auth.getSession();
    if (error) throw new Error(error.message);
    if (!data.session) return null;
    return profile(checked(await client().from('profiles').select('*').eq('id', data.session.user.id).single()));
  },
  async login(email: string, password: string) { success(await client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })); },
  async signup(name: string, email: string, password: string) {
    const data = checked(await client().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin } }));
    return { needsConfirmation: !data.session };
  },
  async logout() { success(await client().auth.signOut()); },
  async snapshot(): Promise<Snapshot> {
    const [organizations, events, registrations, tickets, attendance, users, counts] = await Promise.all([
      all('organizations'), all('events'), all('registrations'), all('tickets'), all('attendance'), all('profiles'), eventCounts(),
    ]);
    return {
      organizations: organizations.map(o => ({ id: o.id, name: o.name, short: o.short })), events: events.map(event),
      registrations: registrations.map(r => ({ id: r.id, studentId: r.user_id, eventId: r.event_id, status: r.status as Registration['status'], createdAt: r.registered_at })),
      tickets: tickets.map(ticket), attendance: attendance.map(a => ({ id: a.id, registrationId: a.registration_id, eventId: a.event_id, scannedAt: a.checked_in_at })),
      users: users.map(profile), counts: Object.fromEntries(counts.map(c => [c.event_id, Number(c.accepted_count)])),
    };
  },
  async listEvents({ query = '', category = 'All events', includePast = false, page = 0, pageSize = 6 } = {}) {
    let request = client().from('events').select('*', { count: 'exact' }).neq('status', 'draft').order('start_at').order('id');
    if (!includePast) request = request.gt('start_at', new Date().toISOString());
    if (category !== 'All events') request = request.eq('category', category);
    // PostgREST .or() accepts a grammar; do not interpolate its punctuation.
    const search = query.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
    if (search) request = request.or(`title.ilike.%${search}%,description.ilike.%${search}%,venue.ilike.%${search}%`);
    const result = await request.range(page * pageSize, (page + 1) * pageSize - 1);
    return { events: checked(result).map(event), total: result.count ?? 0 };
  },
  async register(eventId: string) {
    const user = await service.session();
    if (!user) throw new Error('Please sign in to continue.');
    const r = checked(await client().from('registrations').insert({ event_id: eventId, user_id: user.id }).select('id').single());
    return ticket(checked(await client().from('tickets').select('*').eq('registration_id', r.id).single()));
  },
  async cancelRegistration(id: string) { checked(await client().from('registrations').update({ status: 'cancelled' }).eq('id', id).select('id').single()); },
  async saveEvent(input: Pick<Event, 'title' | 'description' | 'date' | 'venue' | 'capacity' | 'category'>, id?: string, organizationId?: string) {
    const user = await service.session();
    if (!user) throw new Error('Please sign in to continue.');
    const values = { title: input.title.trim(), description: input.description.trim(), start_at: input.date, venue: input.venue.trim(), capacity: input.capacity, category: input.category };
    if (id) checked(await client().from('events').update(values).eq('id', id).select('id').single());
    else {
      const org = user.role === 'admin' ? organizationId : user.organizationId;
      if (!org) throw new Error('Choose an organization.');
      checked(await client().from('events').insert({ ...values, organization_id: org, created_by: user.id }).select('id').single());
    }
  },
  async setStatus(id: string, status: 'open' | 'cancelled') { checked(await client().from('events').update({ status }).eq('id', id).select('id').single()); },
  async scan(eventId: string, payload: string) { return checked(await client().rpc('scan_ticket', { selected_event: eventId, qr_payload: payload })); },
};
