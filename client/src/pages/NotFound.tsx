import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { IconBadge } from '../components/ui/IconBadge';
import { Compass } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
      <IconBadge icon={Compass} size="lg" />
      <h1 className="text-4xl font-black text-slate-900 tracking-tight">404 — Page Not Found</h1>
      <p className="text-sm font-semibold text-slate-500 max-w-sm mx-auto leading-relaxed">
        The page or court route you are looking for does not exist or has been moved.
      </p>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-2xl px-6 py-3.5 shadow-lg shadow-emerald-600/30"
        onClick={() => navigate('/')}
      >
        Return to Booking Calendar ›
      </Button>
    </div>
  );
}
