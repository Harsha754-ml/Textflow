import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getContacts, getConversation, sendSms } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTimestamp } from '../utils/format';

export function InboxPage() {
  const { messages, refreshMessages } = useAppData();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [activePhone, setActivePhone] = useState('');
  const [threadMessages, setThreadMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await getContacts();
        setContacts(response.items || []);
      } catch {
        setContacts([]);
      }
    };

    void run();
  }, []);

  const contactNameByPhone = useMemo(() => new Map(contacts.map((contact) => [contact.phone, contact.name])), [contacts]);

  const inbound = useMemo(() => messages.filter((message) => message.direction === 'inbound' || message.status === 'received' || message.direction === 'outbound'), [messages]);

  const threadSummaries = useMemo(() => {
    const groups = new Map();
    const sortedMessages = [...inbound].sort((left, right) => new Date(right.createdAt || right.created_at || 0).getTime() - new Date(left.createdAt || left.created_at || 0).getTime());

    for (const message of sortedMessages) {
      const phone = message.phone || message.phoneNumbers?.[0];
      if (!phone || groups.has(phone)) {
        continue;
      }

      groups.set(phone, {
        phone,
        contactName: contactNameByPhone.get(phone) || phone,
        lastMessage: message,
      });
    }

    const normalizedSearch = search.trim().toLowerCase();

    return [...groups.values()]
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        const preview = String(item.lastMessage.message || item.lastMessage.body || '').toLowerCase();
        return item.contactName.toLowerCase().includes(normalizedSearch)
          || item.phone.toLowerCase().includes(normalizedSearch)
          || preview.includes(normalizedSearch);
      })
      .sort((left, right) => new Date(right.lastMessage.createdAt || right.lastMessage.created_at || 0).getTime() - new Date(left.lastMessage.createdAt || left.lastMessage.created_at || 0).getTime());
  }, [contactNameByPhone, inbound, search]);

  const selectedPhone = activePhone || threadSummaries[0]?.phone || '';
  const selectedThread = threadSummaries.find((item) => item.phone === selectedPhone) || null;

  useEffect(() => {
    if (threadSummaries.length === 0) {
      setActivePhone('');
      return;
    }

    if (!activePhone || !threadSummaries.some((item) => item.phone === activePhone)) {
      setActivePhone(threadSummaries[0].phone);
    }
  }, [activePhone, threadSummaries]);

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

  const renderExtractedData = (extracted) => {
    if (!extracted || typeof extracted !== 'object') {
      return null;
    }

    const entries = Object.entries(extracted);
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="inbox-extracted-list">
        {entries.map(([label, value]) => (
          <span key={label} className="inbox-extracted-pill">
            <span className="inbox-extracted-label">{label}</span>
            <span className="inbox-extracted-value">{String(value)}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="inbox-page">
      <aside className="inbox-thread-list">
        <input
          className="inbox-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search conversations"
        />

        <div className="inbox-thread-list-scroll">
          {threadSummaries.length === 0 ? <div className="inbox-empty-list">No conversations yet</div> : null}
          {threadSummaries.map((thread) => {
            const timestamp = formatRelativeTimestamp(thread.lastMessage.createdAt || thread.lastMessage.created_at);
            const preview = thread.lastMessage.message || thread.lastMessage.body || '';

            return (
              <button
                key={thread.phone}
                type="button"
                className={`inbox-thread-row ${thread.phone === selectedPhone ? 'active' : ''}`}
                onClick={() => setActivePhone(thread.phone)}
              >
                <div className="inbox-thread-row-top">
                  <div className="inbox-thread-name">{thread.contactName}</div>
                  <div className="inbox-thread-time">{timestamp}</div>
                </div>
                <div className="inbox-thread-preview">{preview}</div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="inbox-thread-pane">
        <div className="inbox-thread-header">
          <div className="inbox-thread-title">{selectedThread?.contactName || selectedPhone || 'Select a conversation'}</div>
          <div className="inbox-thread-phone">{selectedPhone || ' '}</div>
        </div>

        <div className="inbox-thread-messages">
          {threadMessages.map((message) => {
            const isOutbound = message.direction === 'outbound';
            const bubbleClassName = isOutbound ? 'outbound' : 'inbound';
            const timestamp = formatRelativeTimestamp(message.createdAt || message.created_at);

            return (
              <div key={message.id} className={`inbox-message ${bubbleClassName}`}>
                <div className={`inbox-bubble ${bubbleClassName}`}>
                  <div>{message.message || message.body}</div>
                </div>
                {renderExtractedData(message.extracted)}
                <div className={`inbox-message-time ${bubbleClassName}`}>{timestamp}</div>
              </div>
            );
          })}
          {!loadingThread && threadMessages.length === 0 ? <div className="inbox-empty-thread">No messages in this thread.</div> : null}
          {loadingThread ? <div className="inbox-empty-thread">Loading thread...</div> : null}
        </div>

        <div className="inbox-reply-bar">
          <input
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={isAdmin ? 'Type a reply' : 'Read-only mode'}
            disabled={!isAdmin || sending || !selectedPhone}
          />
          <button type="button" className="inbox-send-button" onClick={() => void sendReply()} disabled={!isAdmin || !reply.trim() || sending || !selectedPhone}>
            {sending ? <span className="spinner" aria-label="Sending" /> : 'Send'}
          </button>
        </div>
      </section>
    </div>
  );
}
