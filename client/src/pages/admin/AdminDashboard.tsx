import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminGetBookings, adminGetCourts } from '../../lib/api';
import { formatPrice, formatDateTime, toDateOnlyString } from '../../lib/utils';
import { courtNow } from '../../lib/courtTime';
import { isWalkIn, playerDisplayName } from '../../lib/booking';
import { BookingStateBadge } from '../../components/ui/BookingStateBadge';
import type { AdminBooking, Court } from '../../types';
import {
  CalendarCheck,
  BadgeDollarSign,
  TrendingUp,
  Landmark,
  ArrowRight,
  Ban,
  Clock,
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon: ReactNode;
  loading?: boolean;
}

function StatCard({ label, value, sub, accent, icon, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-200 rounded-xl mt-2 animate-pulse" />
          ) : (
            <p className={`text-3xl font-black mt-2 tracking-tight ${accent ?? 'text-slate-900'}`}>{value}</p>
          )}
          {sub && <p className="text-xs font-semibold text-slate-500 mt-1.5">{sub}</p>}
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const now = courtNow();
  const today = toDateOnlyString(now);

  const { data: courts = [], isLoading: courtsLoading } = useQuery<Court[]>({
    queryKey: ['admin-courts'],
    queryFn: adminGetCourts,
  });

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['admin-bookings', 'today', today],
    queryFn: () => adminGetBookings({ date: today, page: 1, pageSize: 50, state: 'Completed' }),
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['admin-bookings', 'recent'],
    queryFn: () => adminGetBookings({ page: 1, pageSize: 8 }),
  });

  const statsLoading = courtsLoading || todayLoading;

  const todayBookings: AdminBooking[] = todayData?.items ?? [];
  const todayCount: number = todayData?.total ?? 0;
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountCharged, 0);
  const recentBookings: AdminBooking[] = recentData?.items ?? [];
  const totalBookings: number = recentData?.total ?? 0;
  const activeCourts = courts.filter((c) => c.active).length;

  const quickLinks = [
    {
      to: '/admin/bookings',
      label: 'Manage Bookings',
      desc: 'View, search, cancel & issue refunds',
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      to: '/admin/courts',
      label: 'Courts Configuration',
      desc: 'Set operating hours, slot length, pricing & court status',
      icon: <Landmark className="w-5 h-5" />,
    },
    {
      to: '/admin/blackouts',
      label: 'Blackouts Manager',
      desc: 'Schedule court maintenance or tournament holds',
      icon: <Ban className="w-5 h-5" />,
    },
  ];

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider mb-3 backdrop-blur-sm border border-emerald-500/30">
            <Clock className="w-3.5 h-3.5" /> Real-time Facility Metrics
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Operations Control Center
          </h1>
          <p className="text-sm text-emerald-100/80 mt-2 font-medium">
            Monitor reservations, revenue metrics, and court availability across the complex.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 self-start md:self-auto">
          <span className="text-[10px] uppercase tracking-widest font-black text-emerald-300 block">
            System Date
          </span>
          <span className="text-base font-black text-white">
            {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Today's Bookings"
          value={todayCount}
          sub="confirmed court sessions"
          loading={statsLoading}
          icon={<CalendarCheck className="w-6 h-6" />}
        />
        <StatCard
          label="Today's Revenue"
          value={formatPrice(todayRevenue)}
          sub="total collected today"
          accent="text-emerald-600"
          loading={statsLoading}
          icon={<BadgeDollarSign className="w-6 h-6" />}
        />
        <StatCard
          label="Total Bookings"
          value={totalBookings}
          sub="all-time system reservations"
          loading={recentLoading}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          label="Active Courts"
          value={activeCourts}
          sub={`online out of ${courts.length} total`}
          loading={courtsLoading}
          icon={<Landmark className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/40">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-black text-slate-900">Recent Court Reservations</h2>
            <Link
              to="/admin/bookings"
              className="text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentLoading ? (
            <div className="divide-y divide-slate-100 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-36" />
                    <div className="h-3 bg-slate-200 rounded w-48" />
                  </div>
                  <div className="h-7 bg-slate-200 rounded-full w-20" />
                </div>
              ))}
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-semibold">
              No recent court bookings found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{b.court.name}</span>
                      {isWalkIn(b) && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          Walk-in
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      <span className="font-bold text-slate-700">{formatDateTime(b.slotStarts[0])}</span> •{' '}
                      {playerDisplayName(b)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-black text-slate-900">{formatPrice(b.amountCharged)}</span>
                    <BookingStateBadge state={b.state} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 px-1">Quick Operations</h2>
          <div className="flex flex-col gap-3.5">
            {quickLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex items-start gap-4 shadow-sm shadow-slate-200/40"
              >
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0 shadow-xs">
                  {l.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between text-sm">
                    <span>{l.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-600" />
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
                    {l.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
