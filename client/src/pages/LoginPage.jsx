import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(username, password);
      toast.success('Logged in');
      navigate('/', { replace: true });
    } catch {
      toast.error('Invalid username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div>
          <div className="panel-kicker">Authentication</div>
          <h2>Sign in</h2>
        </div>

        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>

        <button type="submit" className="btn btn-primary login-btn" disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner" aria-label="Signing in" /> : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
