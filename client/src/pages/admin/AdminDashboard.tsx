import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminGetBookings, adminGetCourts } from '../../lib/api';
import { formatPrice, formatDateTime } from '../../lib/utils';
import type { AdminBooking, Court } from '../../types';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm shadow-gray-200/40 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-extrabold mt-2 tracking-tight ${accent ?? 'text-on-surface'}`}>{value}</p>
          {sub && <p className="text-xs font-medium text-on-surface-muted mt-1.5">{sub}</p>}
        </div>
        <div className="p-3.5 bg-gray-50 rounded-2xl text-on-surface-muted group-hover:bg-primary-light group-hover:text-primary transition-all duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BookingStateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Cancelled: 'bg-red-50 text-red-600 border-red-100',
    NoShow:    'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border ${cfg[state] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {state}
    </span>
  );
}

export function AdminDashboard() {
  const today = new Date().toISOString().split('T')[0];

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['admin-courts'],
    queryFn: adminGetCourts,
  });

  const { data: todayData } = useQuery({
    queryKey: ['admin-bookings', 'today', today],
    // Completed only: a cancelled/refunded booking is neither a booking to
    // fulfil today nor revenue received (#27)
    queryFn: () => adminGetBookings({ date: today, page: 1, pageSize: 50, state: 'Completed' }),
  });

  const { data: recentData } = useQuery({
    queryKey: ['admin-bookings', 'recent'],
    queryFn: () => adminGetBookings({ page: 1, pageSize: 8 }),
  });

  const todayBookings: AdminBooking[] = todayData?.items ?? [];
  const todayCount: number = todayData?.total ?? 0;
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountCharged, 0);
  const recentBookings: AdminBooking[] = recentData?.items ?? [];
  const totalBookings: number = recentData?.total ?? 0;
  const activeCourts = courts.filter(c => c.active).length;

  const quickLinks = [
    {
      to: '/admin/bookings',
      label: 'Manage Bookings',
      desc: 'View, search, cancel & refund bookings',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      to: '/admin/courts',
      label: 'Courts Config',
      desc: 'Configure hours, slot lengths, active state',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      to: '/admin/pricing',
      label: 'Pricing Matrix',
      desc: 'Set custom peak and day/night rates',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      to: '/admin/blackouts',
      label: 'Blackouts Manager',
      desc: 'Block specific times for lessons or maintenance',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
        </svg>
      )
    },
  ];

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Dashboard</h1>
        <p className="text-sm font-semibold text-primary mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Today's Bookings"
          value={todayCount}
          sub="confirmed court slots"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Today's Revenue"
          value={formatPrice(todayRevenue)}
          sub="received today"
          accent="text-primary"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M8.433 7.418c.554-.589 1.448-.589 2.002 0l.207.22 1.477-1.477-.207-.22A4.085 4.085 0 009 4.75V3a1 1 0 10-2 0v1.75a4.1 4.1 0 00-2.514 1.258l-.007.008a1 1 0 01-1.414-1.414l.007-.007A6.1 6.1 0 017 2.85V1a1 1 0 10-2 0v1.85A6.086 6.086 0 001.078 6.847c-.57.575-.56 1.5.02 2.072l.007.007A6.086 6.086 0 005.078 10.85V13a1 1 0 102 0v-2.15a6.086 6.086 0 003.922-2.153l.007-.008a1 1 0 011.414 1.414l-.007.007A6.1 6.1 0 019 12.15V14a1 1 0 102 0v-1.85c.613-.105 1.196-.328 1.72-.65l1.493 1.493a1 1 0 001.414-1.414L14.134 10.1A4.088 4.088 0 0011 8.25V6.582a4.103 4.103 0 00-2.567.836l-.207-.22a4.085 4.085 0 000-2.002l.207.22z" />
            </svg>
          }
        />
        <StatCard
          label="Total Bookings"
          value={totalBookings}
          sub="aggregate book count"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
        <StatCard
          label="Active Courts"
          value={activeCourts}
          sub={`online of ${courts.length} total`}
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Recent bookings + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent bookings card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm shadow-gray-200/40">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-on-surface">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-bold text-primary hover:text-primary-dark hover:underline flex items-center gap-1">
              View All Bookings
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-semibold text-on-surface-muted">No Bookings Yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface truncate">
                      {b.court.name}
                    </p>
                    <p className="text-xs text-on-surface-muted mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-gray-700">{formatDateTime(b.slotStarts[0])}</span>
                      <span className="text-gray-300">•</span>
                      <span className="truncate">{b.user.email}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <span className="text-base font-extrabold text-on-surface">{formatPrice(b.amountCharged)}</span>
                    <BookingStateBadge state={b.state} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links side cards */}
        <div className="flex flex-col gap-3.5">
          <h2 className="text-lg font-bold text-on-surface px-1 mb-0.5">Quick Actions</h2>
          {quickLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-primary/40 hover:bg-emerald-50/10 transition-all duration-300 group flex items-start gap-4 shadow-sm shadow-gray-200/30"
            >
              <div className="p-3 bg-gray-50 rounded-xl text-on-surface-muted group-hover:bg-primary-light group-hover:text-primary transition-all duration-300 shrink-0">
                {l.icon}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-on-surface group-hover:text-primary transition-colors duration-200 flex items-center gap-1">
                  {l.label}
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary">
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </p>
                <p className="text-xs font-medium text-on-surface-muted mt-1 leading-normal">{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
