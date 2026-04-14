import { NavLink, Outlet } from 'react-router-dom';
import { Activity, History, Send, Server, Archive } from 'lucide-react';
import { AppDataProvider, useAppData } from '../context/AppDataContext';
import { StatusIndicator } from './StatusIndicator';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/send', label: 'Send SMS', icon: Send },
  { to: '/history', label: 'History', icon: History },
  { to: '/queue', label: 'Queue', icon: Archive },
];

function Sidebar() {
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

      <div className="sidebar-footnote">Scheduled sends, retries, and CSV export are managed locally.</div>
    </aside>
  );
}

function Topbar() {
  const { status } = useAppData();

  return (
    <header className="topbar">
      <h1>SMS dashboard</h1>
      <div className="topbar-status">
        <StatusIndicator reachable={status.reachable} latencyMs={status.latencyMs} checking={false} />
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
