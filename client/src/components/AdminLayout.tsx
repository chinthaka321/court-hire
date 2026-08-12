import { Outlet, NavLink, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  CalendarCheck,
  Landmark,
  Ban,
  ArrowLeft,
  ShieldCheck,
  CircleDot,
} from 'lucide-react';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/courts', label: 'Courts', icon: Landmark },
  { to: '/admin/blackouts', label: 'Blackouts', icon: Ban },
];

export function AdminLayout() {
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'Admin User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-slate-950 border-r border-emerald-500/20 shadow-2xl">
        <div className="flex items-center gap-3 px-6 h-20 border-b border-emerald-500/20 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CircleDot className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-black text-white text-lg tracking-tight leading-none block">
              Admin<span className="text-emerald-400">Suite</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-widest block mt-0.5">
              Court Operations
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
            Management Modules
          </div>
          {NAV.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 scale-102 border border-emerald-400/40'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 m-3 rounded-2xl bg-slate-900/90 border border-emerald-500/20 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest">
              Authorized Admin
            </span>
          </div>
          <p className="text-xs text-white font-black truncate">{displayName}</p>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 hover:text-emerald-300 mt-3 pt-3 border-t border-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Player Portal
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50 overflow-hidden">
        <header className="hidden md:flex items-center justify-between h-20 px-8 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
              Control Center Active
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs font-black text-slate-900 block">{displayName}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                System Administrator
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-600/30">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 flex z-50 border-t border-emerald-500/20 shadow-2xl">
        {NAV.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="truncate max-w-[60px]">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
