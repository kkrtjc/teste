import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Genetics } from './pages/Genetics';
import { Meat } from './pages/Meat';
import { Eggs } from './pages/Eggs';
import { Health } from './pages/Health';
import { Losses } from './pages/Losses';
import { Birds } from './pages/Birds';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Activity } from 'lucide-react';

function AppContent() {
  const { isReady } = useAppContext();
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
    return <Login />;
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

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="birds" element={<Birds />} />
          <Route path="genetics" element={<Genetics />} />
          <Route path="meat" element={<Meat />} />
          <Route path="eggs" element={<Eggs />} />
          <Route path="health" element={<Health />} />
          <Route path="losses" element={<Losses />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
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
