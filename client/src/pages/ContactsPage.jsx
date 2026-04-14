import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createContact, deleteContact, getContacts } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function ContactsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', group_name: '', notes: '' });

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await getContacts();
      setContacts(response.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onCreate = async (event) => {
    event.preventDefault();
    try {
      await createContact(form);
      toast.success('Contact added');
      setForm({ name: '', phone: '', group_name: '', notes: '' });
      await refresh();
    } catch {
      toast.error('Failed to add contact');
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteContact(id);
      toast.success('Contact removed');
      await refresh();
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">Contacts</div>
            <h2>Contact directory</h2>
          </div>
        </div>

        {isAdmin ? (
          <form className="grid-form" onSubmit={onCreate}>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} required />
            <input placeholder="Phone (+E.164)" value={form.phone} onChange={(e) => setForm((x) => ({ ...x, phone: e.target.value }))} required />
            <input placeholder="Group" value={form.group_name} onChange={(e) => setForm((x) => ({ ...x, group_name: e.target.value }))} />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        ) : null}

        <div className="table-wrap">
          <table className="message-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Group</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contacts.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.phone}</td>
                  <td>{item.group_name || '—'}</td>
                  <td>{item.notes || '—'}</td>
                  <td>{isAdmin ? <button type="button" className="icon-btn danger" onClick={() => void onDelete(item.id)}>x</button> : null}</td>
                </tr>
              ))}
              {contacts.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="5">{loading ? 'Loading contacts...' : 'No contacts yet.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
