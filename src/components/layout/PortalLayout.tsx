import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, ClipboardList, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const navItems = [
  { name: 'Catálogo', path: '/portal/catalogo', icon: BookOpen },
  { name: 'Agendar', path: '/portal/agendar', icon: Calendar },
  { name: 'Meus Agendamentos', path: '/portal/meus-agendamentos', icon: ClipboardList },
  { name: 'Meu Perfil', path: '/portal/perfil', icon: User },
];

export default function PortalLayout() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [businessName, setBusinessName] = useState('...');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('configuracao_negocio')
      .select('nome_negocio, logo_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBusinessName(data.nome_negocio || 'Studio');
          setLogoUrl(data.logo_url || null);
        }
      });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const clientName = profile?.nome?.split(' ')[0] || 'Cliente';
  const initials = (profile?.nome || 'Cliente')
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans">
      {/* Header */}
      <header className="h-[60px] bg-white border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-8 w-auto object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-title font-semibold text-lg flex-shrink-0">
                {businessName !== '...' ? businessName[0].toUpperCase() : 'S'}
              </div>
              <span className="font-title font-semibold text-xl text-text-primary tracking-wide hidden sm:block">
                {businessName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Horizontal nav (desktop) */}
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

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-[1200px] w-full mx-auto">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
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
              <span>{item.name.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
