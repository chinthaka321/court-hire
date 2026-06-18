import { Link } from 'react-router-dom';

const links = [
  { to: '/admin/courts',   label: 'Courts',   desc: 'Create & edit courts, hours, slot length' },
  { to: '/admin/pricing',  label: 'Pricing',  desc: 'Set 2×2 rate tables per court' },
  { to: '/admin/blackouts',label: 'Blackouts',desc: 'Block time ranges for maintenance' },
  { to: '/admin/bookings', label: 'Bookings', desc: 'Search, view, and override cancellations' },
];

export function AdminDashboard() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-[#191c19] mb-2">Admin Panel</h1>
      <p className="text-sm text-[#404942] mb-6">Manage your tennis facility.</p>

      <div className="grid grid-cols-2 gap-3">
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className="bg-white rounded-xl border border-[#e6e9e4] p-4 hover:border-[#1b5e3b] hover:bg-[#f8faf5] transition-colors"
          >
            <p className="font-semibold text-[#191c19]">{l.label}</p>
            <p className="text-xs text-[#404942] mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
