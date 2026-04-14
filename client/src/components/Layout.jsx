import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, History, Send, Server, Archive, MessageSquare, Users, Bot, BarChart3, Settings, Moon, Sun } from 'lucide-react';
import { AppDataProvider, useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { formatLatency } from '../utils/format';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/compose', label: 'Compose', icon: Send },
  { to: '/inbox', label: 'Inbox', icon: MessageSquare },
  { to: '/history', label: 'History', icon: History },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/automation', label: 'Automation', icon: Bot },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/queue', label: 'Queue', icon: Archive },
];

function Sidebar() {
  const { user } = useAuth();
  const roleLabel = user?.role || 'guest';
  const initials = (user?.username || 'A').trim().charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Server size={18} />
        </div>
        <div>
          <div className="brand-title">SMS Dashboard</div>
          <div className="brand-subtitle">Local SMSGate control</div>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-meta">
          <div className="sidebar-username">{user?.username || 'admin'}</div>
          <div className="sidebar-role-chip">{roleLabel}</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const { status } = useAppData();
  const { logout } = useAuth();
  const connected = Boolean(status?.reachable);

  const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light');

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  return (
    <header className="topbar">
      <h1>SMS Dashboard</h1>
      <div className="topbar-status-row">
        <button type="button" className="icon-btn" onClick={() => setIsLight(!isLight)} aria-label="Toggle Theme">
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <div className={`topbar-connection ${connected ? 'online' : 'offline'}`}>
          <span className="topbar-connection-dot" />
          <span className="topbar-connection-label">{connected ? 'Connected' : 'Offline'}</span>
          <span className="topbar-connection-latency">{formatLatency(status?.latencyMs)}</span>
        </div>
        <button type="button" className="topbar-signout" onClick={logout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}

export function AppLayout() {
  return (
    <AppDataProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-shell">
          <Topbar />
          <div className="content-shell">
            <Outlet />
          </div>
        </main>
      </div>
    </AppDataProvider>
  );
}
