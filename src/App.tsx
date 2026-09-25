import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { PaywallScreen } from './components/PaywallScreen';
import { SplashScreen } from './components/SplashScreen';
import { TrialPopupModal, shouldShowTrialPopup } from './components/modals/TrialPopupModal';
import { requestPushPermission, scheduleDailyTrialReminder } from './lib/pushNotifications';
import { AutoUpdater } from './components/AutoUpdater';

import { PublicBirdShowcase } from './pages/PublicBirdShowcase';


// Login carregado sob demanda (apenas quando o usuário não estiver logado)
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));

function AppContent() {
  const location = useLocation();
  const { isReady, isInitialSyncDone } = useAppContext();
  const { user, loading: authLoading, isExpired, trialInfo, isAdmin } = useAuth();

  // ── Rota Pública de Compartilhamento (Visualização da Ave / Vitrine externa sem exigir login) ──
  if (location.pathname.startsWith('/p/')) {
    return (
      <Routes>
        <Route path="/p/ave/:id" element={<PublicBirdShowcase />} />
        <Route path="/p/vitrine/:id" element={<PublicBirdShowcase />} />
      </Routes>
    );
  }

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

  const isAppLoading = authLoading || !isReady || !isInitialSyncDone;

  return (
    <>
      {/* 🌟 SPLASH SCREEN ANIMADA: Fundo escuro com logo diminuindo e transição lisa ao carregar/logar */}
      <SplashScreen isLoading={isAppLoading} />

      {/* Renderiza o App apenas quando autenticado e com banco pronto */}
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

          {/* App Routes com resposta síncrona instantânea (0ms sem desmontagem de telas) */}
          <Routes>
            <Route path="/" element={<Layout showUpgradeModal={showUpgradeFromPopup} onUpgradeModalClose={() => setShowUpgradeFromPopup(false)} />}>
              <Route index element={null} />
              <Route path="birds" element={null} />
              <Route path="vitrine" element={null} />
              <Route path="lots" element={null} />
              <Route path="eggs" element={null} />
              <Route path="settings" element={null} />
              <Route path="*" element={null} />
            </Route>
          </Routes>
        </>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AutoUpdater />
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
