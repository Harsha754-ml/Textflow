import { NavLink, Outlet } from 'react-router-dom';
import { Activity, History, Send, Server, Archive, MessageSquare, Users, Bot, BarChart3, Settings } from 'lucide-react';
import { AppDataProvider, useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { StatusIndicator } from './StatusIndicator';

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

      <div className="sidebar-footnote">
        <div>{user?.username || 'Signed in user'}</div>
        <div className="muted">{roleLabel}</div>
        {roleLabel === 'viewer' ? <div className="muted">Read-only mode</div> : null}
      </div>
    </aside>
  );
}

function Topbar() {
  const { status } = useAppData();
  const { logout } = useAuth();

  return (
    <header className="topbar">
      <h1>SMS Dashboard</h1>
      <div className="topbar-status-row">
        <StatusIndicator reachable={status.reachable} latencyMs={status.latencyMs} checking={false} />
        <button type="button" className="btn btn-secondary topbar-logout" onClick={logout}>
          Sign out
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
