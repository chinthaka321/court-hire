import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser, UserButton, SignInButton } from '@clerk/clerk-react';
import { useMe } from '../hooks/useMe';
import { Calendar, ShieldCheck, LogIn, Menu, X, CircleDot } from 'lucide-react';

export function Navbar() {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const { isAdmin } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Book a Court', exact: true },
    ...(user ? [{ to: '/my-bookings', label: 'My Bookings', exact: false }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Control Center', exact: false }] : []),
  ];

  function isActive(to: string, exact: boolean) {
    return exact ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-emerald-500/20 shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-all duration-300">
              <CircleDot className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-xl tracking-tight leading-none">
                Court<span className="text-emerald-400">Book</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-400/80 mt-0.5">
                Pro Tennis Club
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map(({ to, label, exact }) => {
              const active = isActive(to, exact);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative px-4.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                    active
                      ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User profile & action controls */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-600/40 px-3 py-1 rounded-full shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Admin Authorized
              </span>
            )}

            {isLoaded && (
              user ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/my-bookings"
                    className="md:hidden relative p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                    aria-label="My Bookings"
                  >
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </Link>
                  <div className="ring-2 ring-emerald-500/40 rounded-full p-0.5 shadow-md">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              ) : (
                <SignInButton mode="modal">
                  <button className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer">
                    <LogIn className="w-4 h-4" /> Sign In
                  </button>
                </SignInButton>
              )
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-emerald-500/20 bg-slate-950/95 backdrop-blur-2xl px-4 py-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
          {navLinks.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                isActive(to, exact)
                  ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
