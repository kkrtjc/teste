import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './lib/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Genetics } from './pages/Genetics';
import { Meat } from './pages/Meat';
import { Eggs } from './pages/Eggs';
import { Health } from './pages/Health';
import { Losses } from './pages/Losses';
import { Birds } from './pages/Birds';

function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  );
}

export default App;
