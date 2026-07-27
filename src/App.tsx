import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './lib/AppContext';
import { AuthProvider } from './lib/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Genetics } from './pages/Genetics';
import { Meat } from './pages/Meat';
import { Lots } from './pages/Lots';
import { Health } from './pages/Health';
import { Losses } from './pages/Losses';
import { Birds } from './pages/Birds';
import { AutoUpdater } from './components/AutoUpdater';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AutoUpdater />
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="birds" element={<Birds />} />
              <Route path="lots" element={<Lots />} />
              <Route path="eggs" element={<Lots />} />
              <Route path="genetics" element={<Genetics />} />
              <Route path="meat" element={<Meat />} />
              <Route path="health" element={<Health />} />
              <Route path="losses" element={<Losses />} />
              <Route path="settings" element={<div className="text-white p-10">Configurações...</div>} />
            </Route>
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
