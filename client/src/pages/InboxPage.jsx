import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getConversation, sendSms } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTimestamp } from '../utils/format';

export function InboxPage() {
  const { messages, refreshMessages } = useAppData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activePhone, setActivePhone] = useState('');
  const [threadMessages, setThreadMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const inbound = useMemo(() => messages.filter((message) => message.direction === 'inbound' || message.status === 'received' || message.direction === 'outbound'), [messages]);

  const threadPhones = useMemo(() => {
    const unique = new Set(inbound.map((item) => item.phone || item.phoneNumbers?.[0]).filter(Boolean));
    return [...unique];
  }, [inbound]);

  const selectedPhone = activePhone || threadPhones[0] || '';

  useEffect(() => {
    if (!selectedPhone) {
      setThreadMessages([]);
      return;
    }

    const run = async () => {
      setLoadingThread(true);
      try {
        const response = await getConversation(selectedPhone);
        setThreadMessages(response.items || []);
      } finally {
        setLoadingThread(false);
      }
    };

    void run();
  }, [selectedPhone]);

  const sendReply = async () => {
    if (!isAdmin || !selectedPhone || !reply.trim()) {
      return;
    }

    setSending(true);
    try {
      await sendSms({ phoneNumbers: [selectedPhone], message: reply.trim() });
      setReply('');
      const response = await getConversation(selectedPhone);
      setThreadMessages(response.items || []);
      await refreshMessages();
      toast.success('Reply sent');
    } catch {
      toast.error('Could not send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">Inbox</div>
            <h2>Conversations</h2>
          </div>
        </div>

        <div className="inbox-layout">
          <aside className="inbox-list">
            {threadPhones.length === 0 ? <div className="empty-state">No inbound threads yet.</div> : null}
            {threadPhones.map((phone) => (
              <button key={phone} type="button" className={`inbox-thread ${phone === selectedPhone ? 'active' : ''}`} onClick={() => setActivePhone(phone)}>
                <div>{phone}</div>
                <div className="muted">Thread</div>
              </button>
            ))}
          </aside>

          <section className="inbox-thread-view">
            <div className="panel-kicker">Thread</div>
            <h2>{selectedPhone || 'Select a conversation'}</h2>
            <div className="inbox-messages">
              {threadMessages.map((message) => (
                <article key={message.id} className={`inbox-bubble ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
                  <div>{message.message || message.body}</div>
                  <div className="muted">{formatRelativeTimestamp(message.createdAt || message.created_at)}</div>
                </article>
              ))}
              {!loadingThread && threadMessages.length === 0 ? <div className="empty-state">No messages in this thread.</div> : null}
              {loadingThread ? <div className="empty-state">Loading thread...</div> : null}
            </div>

            {selectedPhone ? (
              <div className="inbox-reply-row">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={isAdmin ? 'Type a reply' : 'Read-only mode'}
                  disabled={!isAdmin || sending}
                />
                <button type="button" className="btn btn-primary" onClick={() => void sendReply()} disabled={!isAdmin || !reply.trim() || sending}>
                  {sending ? <span className="spinner" aria-label="Sending" /> : 'Send'}
                </button>
              </div>
            ) : null}

            {!isAdmin ? (
              <div className="muted">Read-only mode: viewers cannot send replies.</div>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}
