import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Dashboard() {
  const { birds } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);

  // Mocked photo and farm name, could be moved to AppContext later if needed
  const farmName = "Criatório Mura";
  const farmPhoto = "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=600&auto=format&fit=crop"; 

  const totalAves = birds.length;

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col items-center p-4">
      
      {/* Farm Name & Photo */}
      <div className="flex flex-col items-center mt-6">
        <div className="w-32 h-32 rounded-full border-4 border-theme-primary overflow-hidden shadow-lg mb-4">
          <img src={farmPhoto} alt="Foto do Criatório" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-3xl font-black text-white">{farmName}</h2>
      </div>

      {/* Quantity of Birds */}
      <div className="flex flex-col items-center mt-2 mb-8">
        <div className="bg-theme-surface border border-theme-border/50 px-6 py-3 rounded-2xl shadow-inner text-center">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Plantel Atual</p>
          <h3 className="text-4xl font-black text-theme-primary">{totalAves} <span className="text-lg text-theme-text-muted font-bold">aves</span></h3>
        </div>
      </div>

      {/* Performance Dropdown Menu */}
      <div className="w-full max-w-sm mt-4">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-lg py-4 px-6 rounded-xl flex justify-between items-center transition-colors shadow-lg"
        >
          <span>Performance</span>
          {menuOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>

        {menuOpen && (
          <div className="mt-2 bg-theme-surface border border-theme-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
            <ul className="flex flex-col divide-y divide-theme-border/50">
              <li className="p-4 hover:bg-white/5 cursor-pointer transition-colors font-bold text-white text-center">
                Engorda
              </li>
              <li className="p-4 hover:bg-white/5 cursor-pointer transition-colors font-bold text-white text-center">
                Postura
              </li>
              <li className="p-4 hover:bg-white/5 cursor-pointer transition-colors font-bold text-white text-center">
                Competição
              </li>
              <li className="p-4 hover:bg-white/5 cursor-pointer transition-colors font-bold text-white text-center">
                Cruza
              </li>
              <li className="p-4 hover:bg-white/5 cursor-pointer transition-colors font-bold text-white text-center">
                Pintinhos
              </li>
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
