import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppContext } from './lib/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Genetics } from './pages/Genetics';
import { Meat } from './pages/Meat';
import { Eggs } from './pages/Eggs';
import { Health } from './pages/Health';
import { Losses } from './pages/Losses';
import { Birds } from './pages/Birds';
import { Activity } from 'lucide-react';

function AppContent() {
  const { isReady } = useAppContext();

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-theme-base text-white p-4 text-center">
        <Activity size={48} className="text-theme-primary animate-pulse mb-4" />
        <h2 className="text-2xl font-black text-white">Carregando Mura Manager...</h2>
        <p className="text-theme-text-muted mt-2">Sincronizando banco de dados offline...</p>
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
          <Route path="settings" element={<div className="text-white p-10">Configurações...</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
