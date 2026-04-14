import { RefreshCcw } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { formatRelativeTimestamp } from '../utils/format';

export function QueueMonitor() {
  const { queue, retryQueue } = useAppData();

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-kicker">Queue</div>
          <h2>Scheduled messages</h2>
        </div>
      </div>

      <div className="queue-grid">
        {queue.length === 0 ? (
          <div className="empty-state">No scheduled or retrying messages right now.</div>
        ) : (
          queue.map((item) => (
            <article key={item.id} className="queue-card">
              <div className="queue-card-head">
                <span className={`status-chip ${item.status}`}>{item.status}</span>
                <button type="button" className="icon-btn" onClick={() => void retryQueue(item.id)}>
                  <RefreshCcw size={16} />
                </button>
              </div>
              <div className="queue-body">
                <div><strong>Recipients:</strong> {item.phoneNumbers.join(', ')}</div>
                <div><strong>Scheduled:</strong> {formatRelativeTimestamp(item.scheduledAt)}</div>
                <div><strong>Retries:</strong> {item.attempts}</div>
                <div className="queue-message">{item.message}</div>
                {item.lastError ? <div className="queue-error">{item.lastError}</div> : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
