import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="max-w-lg mx-auto px-4 pt-24 text-center">
      <p className="text-6xl font-bold text-primary mb-4">404</p>
      <h1 className="text-xl font-bold text-on-surface mb-2">Page not found</h1>
      <p className="text-sm text-on-surface-muted mb-8">The page you're looking for doesn't exist.</p>
      <button
        onClick={() => navigate('/')}
        className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-primary-dark transition-colors"
      >
        Back to home
      </button>
    </div>
  );
}
