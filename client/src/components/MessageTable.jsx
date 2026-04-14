import { Eye, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatRelativeTimestamp } from '../utils/format';

export function MessageTable() {
  const { messages, selectedMessage, loadingMessageId, loadMessage, closeMessage, removeMessage } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const sortKey = searchParams.get('sort') || 'createdAt';

  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...messages]
      .filter((message) => {
        const matchesQuery = !normalizedQuery || message.message.toLowerCase().includes(normalizedQuery) || message.phoneNumbers.join(' ').toLowerCase().includes(normalizedQuery);
        const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((left, right) => {
        const leftValue = new Date(left[sortKey] || left.createdAt).getTime();
        const rightValue = new Date(right[sortKey] || right.createdAt).getTime();
        return rightValue - leftValue;
      });
  }, [messages, query, statusFilter, sortKey]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  return (
    <section className="message-table-section">
      <div className="panel-header wrap">
        <div>
          <div className="panel-kicker">History</div>
          <h2>Message history</h2>
        </div>
        <div className="filters-row">
          <input type="search" value={query} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Search messages" />
          <select value={statusFilter} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="retrying">Retrying</option>
            <option value="completed">Completed</option>
          </select>
          <select value={sortKey} onChange={(event) => updateFilter('sort', event.target.value)}>
            <option value="createdAt">Newest</option>
            <option value="scheduledAt">Scheduled</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="message-table">
          <thead>
            <tr>
              <th>Recipients</th>
              <th>Message</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredMessages.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No messages match the current filters.</td>
              </tr>
            ) : (
              filteredMessages.map((message) => (
                <tr key={message.id}>
                  <td>{message.phoneNumbers.join(', ')}</td>
                  <td className="message-cell">{message.message}</td>
                  <td><span className={`status-chip ${message.status}`}>{message.status}</span></td>
                  <td>{formatRelativeTimestamp(message.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => void loadMessage(message.id)} disabled={loadingMessageId === message.id}>
                        <Eye size={16} />
                      </button>
                      <button type="button" className="icon-btn danger" onClick={() => void removeMessage(message.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedMessage ? (
        <div className="modal-backdrop" onClick={closeMessage} role="presentation">
          <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <div className="panel-kicker">Details</div>
                <h3>Message {selectedMessage.id}</h3>
              </div>
              <button type="button" className="icon-btn" onClick={closeMessage}>Close</button>
            </div>
            <pre className="detail-pre">{JSON.stringify(selectedMessage, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
