import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export default function Header({ setMobileOpen }: HeaderProps) {
  const location = useLocation();

  // Mapeamento de rotas para títulos da página
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/clientes':
        return 'Clientes';
      case '/servicos':
        return 'Serviços';
      case '/agendamentos':
        return 'Agendamentos';
      case '/configuracoes':
        return 'Configurações';
      default:
        // Lidar com caminhos aninhados (ex: /clientes/:id)
        if (pathname.startsWith('/clientes/')) return 'Perfil do Cliente';
        return 'Rosaê Clinic';
    }
  };

  return (
    <header className="h-[60px] bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Acionador do menu Mobile */}
        <button 
          onClick={() => setMobileOpen(true)}
          className="md:hidden text-text-secondary hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <h1 className="font-title font-semibold text-2xl text-text-primary">
          {getPageTitle(location.pathname)}
        </h1>
      </div>
    </header>
  );
}
