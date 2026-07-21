import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser, UserButton, SignInButton } from '@clerk/clerk-react';
import { useMe } from '../hooks/useMe';

export function Navbar() {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  // DB-backed role, matching what the server's AdminOnly policy checks (#33)
  const { isAdmin } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Book a Court', exact: true },
    ...(user ? [{ to: '/my-bookings', label: 'My Bookings', exact: false }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel', exact: false }] : []),
  ];

  function isActive(to: string, exact: boolean) {
    return exact ? location.pathname === to : location.pathname.startsWith(to);
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/75 backdrop-blur-lg border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-dark to-primary flex items-center justify-center shadow-md shadow-primary/10 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 20 20" fill="white" className="w-5 h-5">
                  <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="1.5" fill="none" />
                  <path d="M3.5 10 Q10 4 16.5 10 Q10 16 3.5 10" fill="white" opacity="0.9" />
                </svg>
              </div>
              <span className="font-display font-bold text-on-surface text-xl tracking-tight">
                Court<span className="text-primary">Book</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1.5">
              {navLinks.map(({ to, label, exact }) => (
                <Link
                  key={to}
                  to={to}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(to, exact)
                      ? 'text-primary-dark bg-primary-light shadow-sm'
                      : 'text-on-surface-muted hover:text-on-surface hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {isActive(to, exact) && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isLoaded && (
                user ? (
                  <div className="flex items-center gap-4">
                    {/* Mobile: My Bookings icon */}
                    <Link
                      to="/my-bookings"
                      className="md:hidden relative p-2 rounded-xl text-on-surface-muted hover:bg-gray-100 hover:text-on-surface transition-all duration-200"
                      title="My Bookings"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </Link>
                    <div className="flex items-center gap-1">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </div>
                ) : (
                  <SignInButton mode="modal">
                    <button className="flex items-center gap-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl transition-all duration-200 shadow-md shadow-primary/10 hover:shadow-lg active:scale-95 cursor-pointer">
                      Sign In
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M1 8a.5.5 0 01.5-.5h11.793l-3.147-3.146a.5.5 0 01.708-.708l4 4a.5.5 0 010 .708l-4 4a.5.5 0 01-.708-.708L13.293 8.5H1.5A.5.5 0 011 8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </SignInButton>
                )
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(o => !o)}
                className="md:hidden p-2 rounded-xl text-on-surface-muted hover:bg-gray-100 hover:text-on-surface transition-all duration-200 cursor-pointer"
                aria-label="Menu"
              >
                {mobileOpen ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg px-4 py-3 flex flex-col gap-1.5 animate-fadeIn">
            {navLinks.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(to, exact)
                    ? 'text-primary bg-primary-light font-semibold shadow-sm'
                    : 'text-on-surface-muted hover:bg-gray-50 hover:text-on-surface'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
