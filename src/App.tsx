import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { Activity } from 'lucide-react';
import { Login } from './pages/Login';

// Lazy loading das páginas internas para otimização de bundle inicial no celular
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Genetics = lazy(() => import('./pages/Genetics').then(m => ({ default: m.Genetics })));
const Lots = lazy(() => import('./pages/Lots').then(m => ({ default: m.Lots })));
const Birds = lazy(() => import('./pages/Birds').then(m => ({ default: m.Birds })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Eggs = lazy(() => import('./pages/Eggs').then(m => ({ default: m.Eggs })));

function AppContent() {
  const { isReady, farmSettings, isTutorialOpen } = useAppContext();
  const { user, loading: authLoading } = useAuth();

  // 1. Carrega a sessão de autenticação primeiro
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-theme-base text-white p-4 text-center">
        <Activity size={48} className="text-theme-primary animate-pulse mb-4" />
        <h2 className="text-2xl font-black text-white">Verificando Acesso...</h2>
        <p className="text-theme-text-muted mt-2">Autenticando criatório...</p>
      </div>
    );
  }

  // 2. Se não estiver autenticado, exibe a tela de login
  if (!user) {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-theme-base text-white p-4 text-center">
          <Activity size={48} className="text-theme-primary animate-pulse mb-4" />
          <h2 className="text-2xl font-black text-white">Carregando Login...</h2>
        </div>
      }>
        <Login />
      </Suspense>
    );
  }

  // 3. Se estiver autenticado, mas o banco offline ainda está carregando
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-theme-base text-white p-4 text-center">
        <Activity size={48} className="text-theme-primary animate-pulse mb-4" />
        <h2 className="text-2xl font-black text-white">Carregando Mura Manager...</h2>
        <p className="text-theme-text-muted mt-2">Sincronizando banco de dados...</p>
      </div>
    );
  }

  // 4. Primeiro login: perfil não configurado E tutorial concluído → exibe onboarding
  const isProfileConfigured = !!(farmSettings.name && farmSettings.email);
  const showOnboarding = !isProfileConfigured && !isTutorialOpen;

  return (
    <>
      {showOnboarding && <OnboardingModal />}
      <Router>
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[300px] w-full text-center text-theme-text-muted">
            <Activity size={32} className="animate-spin text-theme-primary mb-2" />
            <p className="text-sm font-medium">Carregando tela...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="birds" element={<Birds />} />
              <Route path="genetics" element={<Genetics />} />
              <Route path="lots" element={<Lots />} />
              <Route path="eggs" element={<Eggs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
