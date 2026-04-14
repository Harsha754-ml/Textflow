export function StatusIndicator({ reachable, latencyMs, checking }) {
  const tone = checking ? 'checking' : reachable ? 'online' : 'offline';
  const label = checking ? 'Checking connection' : reachable ? 'Connected' : 'Offline';

  return (
    <div className={`status-pill ${tone}`}>
      <span className="status-dot" />
      <div>
        <div className="status-label">{label}</div>
        <div className="status-meta">Latency {latencyMs == null ? '—' : `${latencyMs} ms`}</div>
      </div>
    </div>
  );
}
