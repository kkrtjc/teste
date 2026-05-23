import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Egg, Beef } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Dashboard() {
  const { birds, eggLots, meatLots, openBirdProfile } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mocked photo and farm name, could be moved to AppContext later if needed
  const farmName = "Criatório Mura";
  const farmPhoto = "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=600&auto=format&fit=crop"; 

  const totalAves = birds.length;

  const searchResultsBirds = birds.filter(b => 
    b.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.anilha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.baia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchResultsEggLots = eggLots.filter(l => l.baia.toLowerCase().includes(searchTerm.toLowerCase()));
  const searchResultsMeatLots = meatLots.filter(l => l.baia.toLowerCase().includes(searchTerm.toLowerCase()));

  const showResults = searchTerm.length > 0;

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
      <div className="flex flex-col items-center mt-2">
        <div className="bg-theme-surface border border-theme-border/50 px-6 py-3 rounded-2xl shadow-inner text-center">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Plantel Atual</p>
          <h3 className="text-4xl font-black text-theme-primary">{totalAves} <span className="text-lg text-theme-text-muted font-bold">aves</span></h3>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-sm mt-4 relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar Ave, Anilha ou Lote..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-theme-surface border border-theme-border/50 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-theme-primary shadow-lg transition-colors"
          />
        </div>

        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border border-theme-primary/30 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto p-2 space-y-4">
            
            {searchResultsBirds.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-theme-text-muted uppercase px-2 mb-2">Aves Encontradas</p>
                <div className="space-y-1">
                  {searchResultsBirds.map(bird => (
                    <div key={bird.id} onClick={() => openBirdProfile(bird.id)} className="flex flex-col p-3 bg-theme-base/50 hover:bg-theme-primary/10 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-theme-primary/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-theme-surface flex items-center justify-center overflow-hidden shrink-0">
                            {bird.imagem ? <img src={bird.imagem} className="w-full h-full object-cover" /> : (bird.sexo === 'Macho' ? '🐓' : '🐔')}
                          </div>
                          {bird.anilha}
                        </span>
                        <span className="text-[10px] bg-theme-surface px-2 py-1 rounded text-theme-text-muted font-bold">Baia {bird.baia}</span>
                      </div>
                      <span className="text-xs text-theme-text-muted">{bird.nome || 'Sem nome'} • {bird.raca}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResultsEggLots.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-theme-text-muted uppercase px-2 mb-2">Lotes de Postura</p>
                <div className="space-y-1">
                  {searchResultsEggLots.map(lot => (
                    <div key={lot.id} className="flex flex-col p-3 bg-theme-base/50 rounded-lg border border-transparent hover:border-theme-border/50">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-theme-primary flex items-center gap-1"><Egg size={14}/> Baia {lot.baia}</span>
                        <span className="text-[10px] bg-theme-surface px-2 py-1 rounded text-theme-text-muted font-bold">{lot.status}</span>
                      </div>
                      <span className="text-xs text-theme-text-muted">{lot.femeasIds.length} aves vinculadas</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResultsMeatLots.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-theme-text-muted uppercase px-2 mb-2">Lotes de Engorda</p>
                <div className="space-y-1">
                  {searchResultsMeatLots.map(lot => (
                    <div key={lot.id} className="flex flex-col p-3 bg-theme-base/50 rounded-lg border border-transparent hover:border-theme-border/50">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-orange-400 flex items-center gap-1"><Beef size={14}/> Baia {lot.baia}</span>
                        <span className="text-[10px] bg-theme-surface px-2 py-1 rounded text-theme-text-muted font-bold">{lot.status}</span>
                      </div>
                      <span className="text-xs text-theme-text-muted">{lot.avesIds.length} aves vinculadas</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResultsBirds.length === 0 && searchResultsEggLots.length === 0 && searchResultsMeatLots.length === 0 && (
              <div className="p-4 text-center text-theme-text-muted text-sm">
                Nenhum resultado encontrado para "{searchTerm}"
              </div>
            )}
          </div>
        )}
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
