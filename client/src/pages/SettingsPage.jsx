import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createUser, createWebhook, deleteUser, deleteWebhook, getStatus, getUsers, getWebhooks, testWebhook, updateWebhook } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user, token } = useAuth();
  const { pollingDelayMs, setPollingDelayMs } = useAppData();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('general');
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', secret: '', events: { inbound: true, delivered: false, failed: false } });

  const refresh = async () => {
    const statusRes = await getStatus();
    setStatus(statusRes);

    if (isAdmin) {
      const [usersRes, webhooksRes] = await Promise.all([getUsers(), getWebhooks()]);
      setUsers(usersRes.items || []);
      setWebhooks(webhooksRes.items || []);
    }
  };

  useEffect(() => {
    void refresh();
  }, [isAdmin]);

  const addUser = async (event) => {
    event.preventDefault();
    try {
      await createUser(form);
      toast.success('User created');
      setForm({ username: '', password: '', role: 'viewer' });
      await refresh();
    } catch {
      toast.error('Could not create user');
    }
  };

  const addWebhook = async (event) => {
    event.preventDefault();
    const selectedEvents = Object.entries(webhookForm.events).filter(([, enabled]) => enabled).map(([eventName]) => eventName);

    if (selectedEvents.length === 0) {
      toast.error('Select at least one webhook event');
      return;
    }

    try {
      await createWebhook({
        name: webhookForm.name,
        url: webhookForm.url,
        secret: webhookForm.secret || undefined,
        enabled: true,
        events: selectedEvents,
      });
      toast.success('Webhook created');
      setWebhookForm({ name: '', url: '', secret: '', events: { inbound: true, delivered: false, failed: false } });
      await refresh();
    } catch {
      toast.error('Could not create webhook');
    }
  };

  const toggleWebhookEnabled = async (webhook) => {
    try {
      await updateWebhook(webhook.id, {
        ...webhook,
        enabled: !webhook.enabled,
      });
      await refresh();
      toast.success(webhook.enabled ? 'Webhook disabled' : 'Webhook enabled');
    } catch {
      toast.error('Could not update webhook');
    }
  };

  const runWebhookTest = async (id) => {
    try {
      await testWebhook(id);
      toast.success('Webhook test sent');
    } catch {
      toast.error('Could not test webhook');
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token || '');
      toast.success('Token copied');
    } catch {
      toast.error('Could not copy token');
    }
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="settings-tabs">
          <button type="button" className={`btn btn-secondary ${tab === 'general' ? 'active-tab' : ''}`} onClick={() => setTab('general')}>General</button>
          {isAdmin ? <button type="button" className={`btn btn-secondary ${tab === 'users' ? 'active-tab' : ''}`} onClick={() => setTab('users')}>Users</button> : null}
          {isAdmin ? <button type="button" className={`btn btn-secondary ${tab === 'webhooks' ? 'active-tab' : ''}`} onClick={() => setTab('webhooks')}>Webhooks</button> : null}
          <button type="button" className={`btn btn-secondary ${tab === 'api' ? 'active-tab' : ''}`} onClick={() => setTab('api')}>API</button>
        </div>
      </section>

      {tab === 'general' ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">General</div>
              <h2>Connection and polling</h2>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>Test connection</button>
          </div>
          <div className="muted">SMSGate reachable: {String(status?.reachable)}</div>
          <div className="muted">Latency: {status?.latencyMs ?? '—'} ms</div>
          <div className="field compact settings-control-row">
            <span>Polling interval</span>
            <select value={pollingDelayMs} onChange={(event) => setPollingDelayMs(Number(event.target.value))}>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds</option>
            </select>
          </div>
        </section>
      ) : null}

      {isAdmin && tab === 'users' ? (
        <section className="panel">
          <div className="panel-header"><h2>Users</h2></div>
          <form className="grid-form" onSubmit={addUser}>
            <input placeholder="Username" value={form.username} onChange={(e) => setForm((x) => ({ ...x, username: e.target.value }))} required />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((x) => ({ ...x, password: e.target.value }))} required />
            <select value={form.role} onChange={(e) => setForm((x) => ({ ...x, role: e.target.value }))}>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" className="btn btn-primary">Add user</button>
          </form>

          <div className="table-wrap">
            <table className="message-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.username}</td>
                    <td>{item.role}</td>
                    <td>{item.created_at}</td>
                    <td><button type="button" className="icon-btn danger" onClick={() => void deleteUser(item.id).then(refresh)}>x</button></td>
                  </tr>
                ))}
                {users.length === 0 ? <tr><td colSpan="4" className="empty-state">No users found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isAdmin && tab === 'webhooks' ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">Webhooks</div>
              <h2>Delivery endpoints</h2>
            </div>
          </div>
          <form className="grid-form" onSubmit={addWebhook}>
            <input placeholder="Name" value={webhookForm.name} onChange={(e) => setWebhookForm((x) => ({ ...x, name: e.target.value }))} required />
            <input placeholder="URL" value={webhookForm.url} onChange={(e) => setWebhookForm((x) => ({ ...x, url: e.target.value }))} required />
            <input placeholder="Secret (optional)" value={webhookForm.secret} onChange={(e) => setWebhookForm((x) => ({ ...x, secret: e.target.value }))} />
            <div className="webhook-events-box">
              <label><input type="checkbox" checked={webhookForm.events.inbound} onChange={(e) => setWebhookForm((x) => ({ ...x, events: { ...x.events, inbound: e.target.checked } }))} /> inbound</label>
              <label><input type="checkbox" checked={webhookForm.events.delivered} onChange={(e) => setWebhookForm((x) => ({ ...x, events: { ...x.events, delivered: e.target.checked } }))} /> delivered</label>
              <label><input type="checkbox" checked={webhookForm.events.failed} onChange={(e) => setWebhookForm((x) => ({ ...x, events: { ...x.events, failed: e.target.checked } }))} /> failed</label>
            </div>
            <button type="submit" className="btn btn-primary">Add webhook</button>
          </form>

          <div className="table-wrap">
            <table className="message-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Events</th>
                  <th>Enabled</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {webhooks.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.url}</td>
                    <td>{(item.events || []).join(', ')}</td>
                    <td>
                      <button type="button" className={`status-chip ${item.enabled ? 'sent' : 'failed'}`} onClick={() => void toggleWebhookEnabled(item)}>
                        {item.enabled ? 'enabled' : 'disabled'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => void runWebhookTest(item.id)}>test</button>
                        <button type="button" className="icon-btn danger" onClick={() => void deleteWebhook(item.id).then(refresh)}>x</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {webhooks.length === 0 ? <tr><td colSpan="5" className="empty-state">No webhooks configured.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'api' ? (
        <section className="panel">
          {isAdmin ? (
            <>
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">API</div>
                  <h2>Access token</h2>
                </div>
                <button type="button" className="btn btn-secondary" onClick={copyToken} disabled={!token}>Copy token</button>
              </div>
              <div className="muted">Current JWT access token</div>
              <pre className="detail-pre">{token || 'No token found'}</pre>
            </>
          ) : (
            <>
              <div className="panel-header">
                <div>
                  <div className="panel-kicker">API</div>
                  <h2>Access token</h2>
                </div>
              </div>
              <div className="empty-state">Read-only mode: token details are available to admins only.</div>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
