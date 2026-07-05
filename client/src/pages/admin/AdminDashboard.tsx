import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminGetBookings, adminGetCourts } from '../../lib/api';
import { formatPrice, formatDateTime } from '../../lib/utils';
import type { AdminBooking, Court } from '../../types';

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-surface-high p-5">
      <p className="text-xs font-medium text-on-surface-muted uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1.5 ${accent ?? 'text-on-surface'}`}>{value}</p>
      {sub && <p className="text-xs text-on-surface-muted mt-1">{sub}</p>}
    </div>
  );
}

function BookingStateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-500',
    NoShow:    'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${cfg[state] ?? 'bg-gray-100 text-gray-500'}`}>
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
    queryFn: () => adminGetBookings({ date: today, page: 1, pageSize: 50 }),
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
    { to: '/admin/bookings',  label: 'Manage Bookings',  desc: 'View, search, cancel & refund' },
    { to: '/admin/courts',    label: 'Courts',            desc: 'Hours, slot length, boundaries' },
    { to: '/admin/pricing',   label: 'Pricing',           desc: 'Rate table per court' },
    { to: '/admin/blackouts', label: 'Blackouts',         desc: 'Block time for maintenance' },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>
        <p className="text-sm text-on-surface-muted mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Today's Bookings" value={todayCount} sub="confirmed slots" />
        <StatCard label="Today's Revenue" value={formatPrice(todayRevenue)} sub="from today's bookings" accent="text-primary" />
        <StatCard label="Total Bookings" value={totalBookings} sub="all time" />
        <StatCard label="Active Courts" value={activeCourts} sub={`of ${courts.length} courts`} />
      </div>

      {/* Recent bookings + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent bookings table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-high overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
            <h2 className="font-semibold text-on-surface">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <p className="text-sm text-on-surface-muted text-center py-10">No bookings yet.</p>
          ) : (
            <div className="divide-y divide-[#f0f0f0]">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-on-surface truncate">
                      {b.court.name}
                    </p>
                    <p className="text-xs text-on-surface-muted mt-0.5">
                      {formatDateTime(b.slotStarts[0])} &bull; {b.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-sm font-semibold text-on-surface">{formatPrice(b.amountCharged)}</span>
                    <BookingStateBadge state={b.state} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-3">
          {quickLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="bg-white rounded-xl border border-surface-high p-4 hover:border-primary hover:bg-[#f4fbf7] transition-colors group"
            >
              <p className="font-semibold text-on-surface group-hover:text-primary transition-colors">{l.label}</p>
              <p className="text-xs text-on-surface-muted mt-0.5">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
