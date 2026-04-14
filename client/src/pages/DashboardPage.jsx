import { Activity, Archive, Send } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

function StatCard({ label, value, icon: Icon }) {
  return (
    <article className="stat-card">
      <Icon size={18} />
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </article>
  );
}

export function DashboardPage() {
  const { status, messages, queue } = useAppData();

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard label="Connection" value={status.reachable ? 'Connected' : 'Offline'} icon={Activity} />
        <StatCard label="Messages" value={messages.length} icon={Send} />
        <StatCard label="Queue" value={queue.length} icon={Archive} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">Recent activity</div>
            <h2>Latest messages</h2>
          </div>
        </div>
        <div className="activity-list">
          {messages.slice(0, 5).map((message) => (
            <article key={message.id} className="activity-item">
              <div className="activity-title">{message.phoneNumbers.join(', ')}</div>
              <div className="activity-meta">{message.status}</div>
              <p>{message.message}</p>
            </article>
          ))}
          {messages.length === 0 ? <div className="empty-state">No messages loaded yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
