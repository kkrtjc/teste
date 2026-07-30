import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { PaywallScreen } from './components/PaywallScreen';
import { SplashScreen } from './components/SplashScreen';
import { TrialPopupModal, shouldShowTrialPopup } from './components/modals/TrialPopupModal';
import { requestPushPermission, scheduleDailyTrialReminder } from './lib/pushNotifications';

// Importação direta síncrona das páginas para resposta instantânea (0ms) na troca de abas no celular
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Lots } from './pages/Lots';
import { Birds } from './pages/Birds';
import { Settings } from './pages/Settings';
import { Eggs } from './pages/Eggs';

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

  // Se não estiver autenticado e a checagem inicial já concluiu, exibe a tela de login
  if (!user && !authLoading) {
    return <Login />;
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
            <Routes>
              <Route path="/" element={<Layout showUpgradeModal={showUpgradeFromPopup} onUpgradeModalClose={() => setShowUpgradeFromPopup(false)} />}>
                <Route index element={<Dashboard />} />
                <Route path="birds" element={<Birds />} />
                <Route path="lots" element={<Lots />} />
                <Route path="eggs" element={<Eggs />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
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
