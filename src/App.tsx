import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { PaywallScreen } from './components/PaywallScreen';
import { SplashScreen } from './components/SplashScreen';
import { TrialPopupModal, shouldShowTrialPopup } from './components/modals/TrialPopupModal';
import { requestPushPermission, scheduleDailyTrialReminder } from './lib/pushNotifications';

// Code-splitting com React.lazy para carregamento instantâneo do bundle principal
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Lots = lazy(() => import('./pages/Lots').then(m => ({ default: m.Lots })));
const Birds = lazy(() => import('./pages/Birds').then(m => ({ default: m.Birds })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Eggs = lazy(() => import('./pages/Eggs').then(m => ({ default: m.Eggs })));

function AppContent() {
  const { isReady } = useAppContext();
  const { user, loading: authLoading, isExpired, trialInfo, isAdmin } = useAuth();

  // ── Estado do popup de trial ──
  const [showTrialPopup, setShowTrialPopup] = useState(false);
  const [showUpgradeFromPopup, setShowUpgradeFromPopup] = useState(false);

  // Decide se deve mostrar o popup de trial
  useEffect(() => {
    if (!user || !isReady || isExpired || isAdmin) return;

    if (shouldShowTrialPopup(trialInfo.isTrial, isAdmin)) {
      setShowTrialPopup(true);
    }
  }, [user, isReady, isExpired, isAdmin, trialInfo.isTrial]);

  // Se não estiver autenticado e a checagem inicial já concluiu, exibe a tela de login imediatamente
  if (!user && !authLoading) {
    return (
      <Suspense fallback={<SplashScreen isLoading={true} />}>
        <Login />
      </Suspense>
    );
  }

  // Se o período de testes ou assinatura expirou (e não for conta de admin), exibe a tela de bloqueio total
  if (user && isReady && isExpired && !isAdmin) {
    return <PaywallScreen />;
  }

  const isAppLoading = authLoading || !isReady;

  return (
    <>
      {/* 🌟 SPLASH SCREEN ANIMADA: Fundo escuro com logo diminuindo e transição lisa ao carregar/logar */}
      <SplashScreen isLoading={isAppLoading} />

      {/* Renderiza o App Router apenas quando autenticado e com banco pronto */}
      {user && isReady && (
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

          {/* App Router com resposta síncrona instantânea (0ms) */}
          <Router>
            <Suspense fallback={<SplashScreen isLoading={true} />}>
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
      )}
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
