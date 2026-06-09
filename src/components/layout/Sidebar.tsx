import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  Tag,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const userEmail = profile?.email || user?.email || '';
  const userName = profile?.nome || 'Usuário';
  const initials = userName
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Persistence of sidebar state
  useEffect(() => {
    localStorage.setItem('rosae-sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Clientes', path: '/clientes', icon: Users },
    { name: 'Serviços', path: '/servicos', icon: Tag },
    { name: 'Agendamentos', path: '/agendamentos', icon: Calendar },
  ];

  const systemItems = [
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
  ];

  const renderNavItems = (items: typeof menuItems) => {
    return items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `
            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
            ${isActive 
              ? 'bg-rose-600 text-white font-medium' 
              : 'text-text-secondary hover:bg-rose-50 hover:text-rose-600'
            }
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? item.name : undefined}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105`} />
          {!collapsed && <span className="text-sm font-sans">{item.name}</span>}
        </NavLink>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 bottom-0 left-0 bg-white border-r border-border z-50 flex flex-col justify-between
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[64px]' : 'w-[220px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Top Header / Logo */}
        <div>
          <div className={`h-[60px] border-b border-border flex items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-title font-semibold text-lg flex-shrink-0">
                R
              </div>
              {!collapsed && (
                <span className="font-title font-semibold text-xl text-text-primary tracking-wide whitespace-nowrap">
                  Rosaê Clinic
                </span>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex absolute -right-3 top-[18px] w-6 h-6 rounded-full border border-border bg-white text-text-secondary hover:text-rose-600 items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer z-50"
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-6">
            {/* MENU SECTION */}
            <div className="space-y-1.5">
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Menu
                </p>
              )}
              <div className="space-y-1">
                {renderNavItems(menuItems)}
              </div>
            </div>

            {/* SYSTEM SECTION */}
            <div className="space-y-1.5">
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Sistema
                </p>
              )}
              <div className="space-y-1">
                {renderNavItems(systemItems)}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer: Logged in User Card */}
        <div className="p-3 border-t border-border bg-rose-50/30 flex flex-col gap-2">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={userName} 
                  className="w-9 h-9 rounded-full object-cover border border-rose-200 flex-shrink-0" 
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {initials}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">{userName}</p>
                  <p className="text-[10px] text-text-secondary truncate">{userEmail}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={handleSignOut}
                title="Sair do sistema"
                className="p-1.5 text-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={handleSignOut}
              title="Sair do sistema"
              className="mx-auto p-1.5 text-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
