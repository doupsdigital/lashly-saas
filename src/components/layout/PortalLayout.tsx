import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Calendar, ClipboardList, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { nomeNegocio, logoUrl, slug, loading, nomeProfissional, plano } = usePortal();
  const isBasico = plano === 'basico';
  const isAuthPage = location.pathname.endsWith('/login') || location.pathname.endsWith('/cadastro');

  const handleSignOut = async () => {
    await signOut();
    navigate(slug ? `/portal/${slug}/login` : '/login', { replace: true });
  };

  const clientName = profile?.nome?.split(' ')[0] || 'Cliente';
  const initials = (profile?.nome || 'Cliente')
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const profissionalInitials = (nomeProfissional || nomeNegocio || 'Studio')
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const navItems = [
    { name: 'Catálogo', shortName: 'Catálogo', path: `/portal/${slug}/catalogo`, icon: BookOpen },
    ...(!isBasico && user ? [
      { name: 'Agendar', shortName: 'Agendar', path: `/portal/${slug}/agendar`, icon: Calendar },
      { name: 'Meus Agendamentos', shortName: 'Agendamentos', path: `/portal/${slug}/meus-agendamentos`, icon: ClipboardList },
      { name: 'Meu Perfil', shortName: 'Perfil', path: `/portal/${slug}/perfil`, icon: User },
    ] : []),
  ];

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

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans">
      {/* Header */}
      <header className="h-[60px] bg-white border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={nomeNegocio || 'Studio'} className="h-8 w-auto object-contain flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-title font-semibold text-lg flex-shrink-0">
              {profissionalInitials}
            </div>
          )}
          <span className="font-title font-semibold text-xl text-text-primary tracking-wide truncate">
            {nomeNegocio}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!isAuthPage && !isBasico && (user ? (
            <>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={clientName}
                  className="w-9 h-9 rounded-full object-cover border border-rose-200 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {initials}
                </div>
              )}
              <span className="text-sm text-text-secondary hidden sm:block">
                Olá, <span className="font-semibold text-text-primary">{clientName}</span>
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sair</span>
              </button>
            </>
          ) : (
            <Link
              to={`/portal/${slug}/login`}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-800 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Entrar
            </Link>
          ))}
        </div>
      </header>

      {/* Horizontal nav (desktop) */}
      {!isAuthPage && (
        <nav className="hidden md:flex bg-white border-b border-border px-6 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
                  isActive
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-text-secondary hover:text-rose-600 hover:border-rose-200'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-[1200px] w-full mx-auto">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      {!isAuthPage && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex z-30">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-rose-600' : 'text-text-muted hover:text-rose-400'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.shortName}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
