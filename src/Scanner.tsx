import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { service, type Snapshot, type User } from './service';
import { startCamera } from './camera';

export function Scanner({ data, user, act }: { data: Snapshot; user: User; act: (work: () => Promise<unknown>) => Promise<boolean> }) {
  const events = data.events.filter(e => user.role === 'admin' || e.organizationId === user.organizationId);
  const [eventId, setEventId] = useState(events.find(e => e.status === 'open')?.id ?? events[0]?.id ?? '');
  const [payload, setPayload] = useState(''), [result, setResult] = useState(''), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null), controller = useRef<AbortController | null>(null);
  const inflight = useRef(false), paused = useRef(false), mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);
  function stopCamera() { controller.current?.abort(); controller.current = null; setCamera(false); }
  async function validate(text: string) {
    if (inflight.current || !eventId || !text.trim()) return;
    inflight.current = true; paused.current = true; setBusy(true); setError('');
    try {
      await act(async () => {
        try {
          const outcome = await service.scan(eventId, text);
          if (mounted.current) setResult(outcome);
          return outcome;
        } catch (e) {
          if (mounted.current) { setResult(''); setError(e instanceof Error ? e.message : 'Validation unavailable. Please retry.'); }
          throw e;
        }
      });
    } finally { inflight.current = false; if (mounted.current) setBusy(false); }
  }
  async function openCamera() {
    if (!video.current || controller.current) return;
    const next = new AbortController(); controller.current = next;
    setError(''); setResult(''); paused.current = false; setCamera(true);
    try {
      await startCamera(video.current, text => { if (!paused.current && !inflight.current) void validate(text); }, next.signal);
    } catch (e) {
      if (!next.signal.aborted && mounted.current) {
        setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow access in your browser or paste the QR payload.' : e instanceof Error ? e.message : 'Camera unavailable. Paste the QR payload instead.');
        stopCamera();
      }
    }
  }
  return <>
    <div className="page-heading"><div><h1>Event check-in</h1><p>Scan a student's event QR ticket or paste its exact contents to validate it.</p></div></div>
    <div className="scanner-grid">
      <section className="panel">
        <label>Check-in event<select value={eventId} disabled={busy} onChange={e => { stopCamera(); setEventId(e.target.value); setResult(''); setError(''); paused.current = false; }}>
          {!events.length && <option value="">No managed events</option>}
          {events.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
        </select></label>
        <video ref={video} className="camera-preview" aria-label="QR camera preview" muted playsInline hidden={!camera}/>
        <div className="actions"><button className="secondary" disabled={!eventId || busy || camera} onClick={openCamera}>Start camera</button><button className="secondary" disabled={!camera} onClick={stopCamera}>Stop camera</button></div>
        <form onSubmit={e => { e.preventDefault(); void validate(payload); }}>
          <label>QR payload<textarea value={payload} onChange={e => setPayload(e.target.value)} placeholder="Paste the complete QR ticket contents" spellCheck={false}/></label>
          <button className="primary" disabled={busy || !eventId || !payload.trim()}>{busy ? 'Validating…' : 'Validate QR'}</button>
        </form>
        <p>Attendance is saved only after server validation. If a connection fails, retry the same ticket safely.</p>
      </section>
      <section className="panel scan-result" aria-label="Scan outcome">
        <h2>{busy ? 'Checking ticket…' : 'Scan outcome'}</h2>
        {error ? <p role="alert">{error}</p> : <p role="status">{result || 'Ready for a ticket.'}</p>}
        {(result || error) && <button className="primary" disabled={busy} onClick={() => { paused.current = false; setPayload(''); setResult(''); setError(''); }}>Scan next</button>}
        <p>{camera ? 'Camera is active. After each result, select Scan next before presenting another ticket.' : 'Start the camera or use the QR payload field.'}</p>
        <Link className="secondary" to="/reports">View attendance report</Link>
      </section>
    </div>
  </>;
}
