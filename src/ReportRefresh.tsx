import { useCallback, useEffect, useRef, useState } from 'react';
export function ReportRefresh({ refresh }: { refresh: () => Promise<void> }) {
  const [updated, setUpdated] = useState(() => new Date()), [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const mounted = useRef(false), inflight = useRef(false);
  const update = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true; setBusy(true);
    try {
      await refresh();
      if (mounted.current) { setUpdated(new Date()); setError(false); }
    } catch { if (mounted.current) setError(true); }
    finally { inflight.current = false; if (mounted.current) setBusy(false); }
  }, [refresh]);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => { void update(); }, 5000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, [update]);
  return <div className="refresh-state">
    <button className="secondary" disabled={busy} onClick={update}>{busy ? 'Refreshing…' : 'Refresh report'}</button>
    <p>Last refreshed <time dateTime={updated.toISOString()}>{updated.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })} PHT</time> · Updates every 5 seconds.</p>
    {error && <p role="alert">This report may be out of date. Your last loaded totals are retained. Check your connection and refresh the report.</p>}
  </div>;
}
