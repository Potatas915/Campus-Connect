import { useState } from 'react';
import { Link } from 'react-router-dom';
import { service, type Confirmation } from './service';
export function Confirmations({ notifications, events, act, organizer = false }: {
  notifications: Confirmation[]; events: { id: string; title: string }[];
  act: (work: () => Promise<unknown>, message?: string) => Promise<boolean>; organizer?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const shown = organizer ? notifications.filter(n => n.status === 'pending' || n.status === 'failed') : notifications;
  return <section className="panel confirmations" aria-label="Registration confirmations">
    <h2>{organizer ? 'Confirmations needing attention' : 'Registration confirmations'}</h2>
    {!shown.length && <p>{organizer ? 'All portal confirmations are up to date.' : 'Your event confirmations will appear here.'}</p>}
    <ul>{shown.map(n => <li key={n.registrationId}>
      <strong>{events.find(e => e.id === n.eventId)?.title ?? 'Event registration'}</strong>
      <p>{n.status === 'ready' ? n.message : n.status === 'inactive' ? 'Inactive — registration or event cancelled.' : n.status === 'failed' ? n.error : 'Registration accepted. Confirmation is pending.'}</p>
      {!organizer && n.status === 'ready' && <Link className="secondary" to="/tickets">View QR ticket</Link>}
      {(n.status === 'pending' || n.status === 'failed') && <button className="secondary" disabled={busy !== null} onClick={async () => {
        setBusy(n.registrationId);
        try { await act(() => service.publishConfirmation(n.registrationId)); } finally { setBusy(null); }
      }}>{busy === n.registrationId ? 'Publishing…' : 'Retry confirmation'}</button>}
    </li>)}</ul>
  </section>;
}
