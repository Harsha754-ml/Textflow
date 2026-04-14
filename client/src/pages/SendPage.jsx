import { SmsForm } from '../components/SmsForm';
import { useAuth } from '../context/AuthContext';

export function SendPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-stack">
      {isAdmin ? <SmsForm /> : <section className="panel"><div className="empty-state">Read-only mode: viewers cannot compose SMS.</div></section>}
    </div>
  );
}
