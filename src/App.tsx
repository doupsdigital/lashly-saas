import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { applyPalette } from './utils/theme';
import ProfissionalRoute from './components/common/ProfissionalRoute';
import ClienteRoute from './components/common/ClienteRoute';
import Layout from './components/layout/Layout';
import PortalLayout from './components/layout/PortalLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import PerfilCliente from './pages/PerfilCliente';
import Servicos from './pages/Servicos';
import Agendamentos from './pages/Agendamentos';
import Configuracoes from './pages/Configuracoes';
import MeusHorarios from './pages/MeusHorarios';
import CadastroProfissional from './pages/CadastroProfissional';
import PortalCatalogo from './pages/portal/PortalCatalogo';
import PortalAgendar from './pages/portal/PortalAgendar';
import PortalMeusAgendamentos from './pages/portal/PortalMeusAgendamentos';
import PortalPerfil from './pages/portal/PortalPerfil';
import CadastroCliente from './pages/portal/CadastroCliente';
import PortalLogin from './pages/portal/PortalLogin';
import { PortalProvider } from './contexts/PortalContext';

import PlanGuard from './components/common/PlanGuard';
import BillingGuard from './components/common/BillingGuard';
import Faturamento from './pages/Faturamento';
import InstallBanner from './components/common/InstallBanner';
import SplashScreen from './components/common/SplashScreen';

export default function App() {
  useEffect(() => {
    // 1. Aplica o tema salvo localmente de forma imediata (carregamento rápido)
    const cachedPalette = localStorage.getItem('app_theme_palette') || 'rosa_rose';
    const cachedDarkMode = localStorage.getItem('app_theme_dark_mode') === 'true';
    applyPalette(cachedPalette, cachedDarkMode);

    // 2. Consulta o banco para manter o tema atualizado de forma isolada por tenant
    async function fetchTheme() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        // Buscar estabelecimento_id do usuário logado
        const { data: profile } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.estabelecimento_id) {
          const { data, error } = await supabase
            .from('configuracao_negocio')
            .select('paleta_cores, modo_escuro')
            .eq('estabelecimento_id', profile.estabelecimento_id)
            .maybeSingle();
          
          if (!error && data) {
            const dbPalette = data.paleta_cores || 'rosa_rose';
            const dbDarkMode = data.modo_escuro ?? false;
            applyPalette(dbPalette, dbDarkMode);
            
            // Sincronizar cache local para a próxima inicialização rápida
            localStorage.setItem('app_theme_palette', dbPalette);
            localStorage.setItem('app_theme_dark_mode', String(dbDarkMode));
          }
        }
      } catch (err) {
        console.error('Erro ao sincronizar tema:', err);
      }
    }
    fetchTheme();
  }, []);

  return (
    <AuthProvider>
      <SplashScreen />
      <InstallBanner />
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<CadastroProfissional />} />

          {/* Rotas da profissional */}
          <Route
            path="/"
            element={
              <ProfissionalRoute>
                <Layout />
              </ProfissionalRoute>
            }
          >
            {/* Páginas acessíveis independente de faturamento */}
            <Route path="assinatura" element={<Faturamento />} />
            <Route path="configuracoes" element={<Configuracoes />} />

            {/* Proteção de Faturamento Ativo / Trial Válido */}
            <Route element={<BillingGuard />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="clientes/:id" element={<PerfilCliente />} />
              <Route path="servicos" element={<Servicos />} />
              
              {/* Recursos Premium/Agendamento protegidos por plano */}
              <Route element={<PlanGuard requiredFeature="scheduling" />}>
                <Route path="agendamentos" element={<Agendamentos />} />
                <Route path="meus-horarios" element={<MeusHorarios />} />
              </Route>
            </Route>
          </Route>

          {/* Portal da cliente */}
          <Route
            path="/portal/:slug"
            element={
              <PortalProvider>
                <PortalLayout />
              </PortalProvider>
            }
          >
            <Route index element={<Navigate to="catalogo" replace />} />
            <Route path="catalogo" element={<PortalCatalogo />} />
            <Route path="login" element={<PortalLogin />} />
            <Route path="cadastro" element={<CadastroCliente />} />

            {/* Rotas protegidas do cliente */}
            <Route
              element={
                <ClienteRoute>
                  <Outlet />
                </ClienteRoute>
              }
            >
              <Route path="agendar" element={<PortalAgendar />} />
              <Route path="meus-agendamentos" element={<PortalMeusAgendamentos />} />
              <Route path="perfil" element={<PortalPerfil />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
