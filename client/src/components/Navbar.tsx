import { Link, useLocation } from 'react-router-dom';
import { useUser, UserButton, SignInButton } from '@clerk/clerk-react';

export function Navbar() {
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-[#f0f0f0]">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
        <Link to="/" className="font-bold text-[#1b5e3b] text-lg tracking-tight">
          CourtBook
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <Link
              to="/my-bookings"
              className={`text-sm font-medium ${
                location.pathname === '/my-bookings'
                  ? 'text-[#1b5e3b]'
                  : 'text-[#404942] hover:text-[#1b5e3b]'
              }`}
            >
              My Bookings
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="text-sm font-medium text-[#404942] hover:text-[#1b5e3b]"
            >
              Admin
            </Link>
          )}
          {isLoaded && (
            user
              ? <UserButton afterSignOutUrl="/" />
              : <SignInButton mode="modal">
                  <button className="text-sm font-semibold text-white bg-[#1b5e3b] px-3 py-1.5 rounded-lg hover:bg-[#004527] transition-colors">
                    Sign In
                  </button>
                </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
}
