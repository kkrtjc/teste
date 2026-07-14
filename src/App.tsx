import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { Activity } from 'lucide-react';

import { Dashboard } from './pages/Dashboard';
import { Genetics } from './pages/Genetics';
import { Lots } from './pages/Lots';
import { Losses } from './pages/Losses';
import { Birds } from './pages/Birds';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';

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
              <Route path="losses" element={<Losses />} />
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
