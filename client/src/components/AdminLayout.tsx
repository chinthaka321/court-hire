import { Outlet, NavLink } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const NAV = [
  { to: '/admin',           label: 'Dashboard', end: true },
  { to: '/admin/bookings',  label: 'Bookings' },
  { to: '/admin/courts',    label: 'Courts' },
  { to: '/admin/pricing',   label: 'Pricing' },
  { to: '/admin/blackouts', label: 'Blackouts' },
];

function DashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px] flex-shrink-0">
      <path d="M2 4a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm0 10a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V4zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px] flex-shrink-0">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}
function CourtIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px] flex-shrink-0">
      <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
  );
}
function PriceIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px] flex-shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px] flex-shrink-0">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  );
}

const ICONS: Record<string, () => JSX.Element> = {
  Dashboard: DashIcon,
  Bookings:  ListIcon,
  Courts:    CourtIcon,
  Pricing:   PriceIcon,
  Blackouts: BlockIcon,
};

export function AdminLayout() {
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-[#1a4731]">
        {/* Sidebar brand header */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="1.5" fill="none" />
              <path d="M3.5 10 Q10 4 16.5 10 Q10 16 3.5 10" fill="white" opacity="0.9" />
            </svg>
          </div>
          <span className="font-bold text-white text-base tracking-tight">CourtBook</span>
        </div>
        <nav className="flex-1 pt-2">
          {NAV.map(({ to, label, end }) => {
            const Icon = ICONS[label];
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/55 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-white/35 uppercase tracking-wider font-medium">Administrator</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f8faf5] overflow-hidden">
        {/* Top header bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-6 bg-white border-b border-[#e6e9e4] flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-[#404942]">
            <span className="font-semibold text-[#191c19]">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#404942]">{displayName}</span>
            <div className="w-8 h-8 rounded-full bg-[#1a4731] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a4731] flex z-50 border-t border-white/10">
        {NAV.map(({ to, label, end }) => {
          const Icon = ICONS[label];
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/40'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
