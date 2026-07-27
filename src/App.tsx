import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { PaywallScreen } from './components/PaywallScreen';
import { TrialPopupModal, shouldShowTrialPopup } from './components/modals/TrialPopupModal';
import { ADMIN_CPF } from './lib/AuthContext';
import { requestPushPermission, scheduleDailyTrialReminder } from './lib/pushNotifications';
import { Activity } from 'lucide-react';

// Lazy loading das páginas internas para otimização de bundle inicial no celular
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Lots = lazy(() => import('./pages/Lots').then(m => ({ default: m.Lots })));
const Birds = lazy(() => import('./pages/Birds').then(m => ({ default: m.Birds })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Eggs = lazy(() => import('./pages/Eggs').then(m => ({ default: m.Eggs })));

function AppContent() {
  const { isReady, isTutorialOpen } = useAppContext();
  const { user, cpf, loading: authLoading, isExpired, trialInfo } = useAuth();

  // ── Estado do popup de trial ──
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const [showUpgradeFromPopup, setShowUpgradeFromPopup] = useState(false);
  const isAdmin = cpf === ADMIN_CPF;

  const showOnboarding = false;

  // Decide se deve mostrar o popup de trial:
  // IMPORTANTE: Só mostra DEPOIS que o tutorial e onboarding forem concluídos/fechados!
  useEffect(() => {
    if (!user || !isReady || isExpired || isAdmin) return;

    // Se o tutorial manual ou o onboarding estão ativos, bloqueia a exibição simultânea do popup de trial
    if (isTutorialOpen || showOnboarding) {
      setShowTrialPopup(false);
      return;
    }

    // Se tutorial/onboarding foram concluídos ou fechados, aí sim exibe o popup de trial (1x a cada 24h)
    if (shouldShowTrialPopup(trialInfo.isTrial, isAdmin)) {
      setShowTrialPopup(true);
    }
  }, [user, isReady, isExpired, isAdmin, trialInfo.isTrial, isTutorialOpen, showOnboarding]);

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

  // 3.5. Se o período de testes ou assinatura expirou, exibe a tela de bloqueio total
  if (isExpired) {
    return <PaywallScreen />;
  }

  // 4. Primeiro login: perfil não configurado E tutorial concluído → exibe onboarding
  return (
    <>
      {/* ── Popup de trial: aparece 1x por dia, obrigatório antes do app ── */}
      {showTrialPopup && (
        <TrialPopupModal
          remainingDays={trialInfo.remainingDays}
          totalTrialDays={7}
          onClose={async () => {
            setShowTrialPopup(false);
            // Após o usuário fechar o popup, agenda notificação push para o dia seguinte
            const granted = await requestPushPermission();
            if (granted) {
              await scheduleDailyTrialReminder(trialInfo.remainingDays);
            }
          }}
          onUpgrade={() => {
            setShowTrialPopup(false);
            setShowUpgradeFromPopup(true);
          }}
        />
      )}

      {showOnboarding && <OnboardingModal />}

      <Router>
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[300px] w-full text-center text-theme-text-muted">
            <Activity size={32} className="animate-spin text-theme-primary mb-2" />
            <p className="text-sm font-medium">Carregando tela...</p>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Layout showUpgradeModal={showUpgradeFromPopup} onUpgradeModalClose={() => setShowUpgradeFromPopup(false)} />}>
              <Route index element={<Dashboard />} />
              <Route path="birds" element={<Birds />} />
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
