import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfissionalRoute({ children }: { children: React.ReactNode }) {
  const { user, isProfissional, estabelecimentoSlug, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-title font-semibold text-3xl shadow-md">
            S
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  console.log('[ProfissionalRoute] Render - user:', user?.email, 'isProfissional:', isProfissional, 'loading:', loading);

  if (!user) {
    console.log('[ProfissionalRoute] No user found, navigating to /login');
    return <Navigate to="/login" replace />;
  }
  if (!isProfissional) {
    if (estabelecimentoSlug) {
      console.log('[ProfissionalRoute] User is not pro, redirecting to client portal:', estabelecimentoSlug);
      return <Navigate to={`/portal/${estabelecimentoSlug}/catalogo`} replace />;
    }
    console.log('[ProfissionalRoute] User is not pro and no slug, navigating to /login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
