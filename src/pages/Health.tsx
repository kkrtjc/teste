import { useState } from 'react';
import { Syringe, Plus, Calendar, Activity, CheckCircle, Clock } from 'lucide-react';

const VACCINES: any[] = [];

export function Health() {
  const [activeTab, setActiveTab] = useState<'vacinas' | 'prontuario'>('vacinas');

  return (
    <div className="space-y-6 animate-fade-in flex flex-col pb-24">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Saúde e Vacinação</h2>
          <p className="text-sm text-theme-text-muted mt-1">Controle de calendário vacinal e prontuário médico do plantel.</p>
        </div>
        
        <button className="btn-primary flex items-center gap-2">
          <Syringe size={18} /> Nova Aplicação
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-theme-border">
        <button 
          onClick={() => setActiveTab('vacinas')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'vacinas' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Calendário Vacinal
        </button>
        <button 
          onClick={() => setActiveTab('prontuario')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'prontuario' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Prontuário e Tratamentos
        </button>
      </div>

      {/* Conteúdo: Vacinas */}
      {activeTab === 'vacinas' && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 flex flex-col gap-4">
            <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2">
              <Calendar size={20} className="text-theme-primary" />
              Próximas Tarefas e Alertas
            </h3>

            {VACCINES.map(vac => (
              <div key={vac.id} className="premium-card p-5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    vac.status === 'Concluído' ? 'bg-theme-accent/20 text-theme-accent' :
                    vac.status === 'Hoje' ? 'bg-theme-primary/20 text-theme-primary ring-2 ring-theme-primary/50' :
                    vac.status === 'Atrasado' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                    'bg-theme-surface-hover text-theme-text-muted'
                  }`}>
                    {vac.status === 'Concluído' ? <CheckCircle size={24} /> :
                     vac.status === 'Hoje' ? <Syringe size={24} /> :
                     vac.status === 'Atrasado' ? <Activity size={24} /> :
                     <Clock size={24} />}
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg ${vac.status === 'Atrasado' ? 'text-red-400' : 'text-white'}`}>{vac.nome}</h4>
                    <p className="text-sm text-theme-text-muted mt-1">Alvo: <span className="font-bold text-white">{vac.lote}</span></p>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    vac.status === 'Concluído' ? 'bg-theme-accent/10 text-theme-accent' :
                    vac.status === 'Hoje' ? 'bg-theme-primary text-black' :
                    vac.status === 'Atrasado' ? 'bg-red-500 text-white' :
                    'bg-theme-base border border-theme-border text-theme-text-muted'
                  }`}>
                    {vac.status}
                  </span>
                  <p className="text-xs font-bold text-theme-text-muted">{vac.data}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-4">
            <div className="premium-card p-6 h-full bg-gradient-to-br from-theme-surface to-theme-base/80">
              <div className="w-16 h-16 bg-theme-primary/10 rounded-2xl flex items-center justify-center text-theme-primary mb-6">
                <Plus size={32} />
              </div>
              <h3 className="font-bold text-xl text-white mb-2">Criar Protocolo</h3>
              <p className="text-sm text-theme-text-muted leading-relaxed mb-8">
                Ao registrar o nascimento de um lote, crie um protocolo automático e o sistema avisará pelo celular os dias exatos das vacinações.
              </p>
              
              <button className="w-full py-3 bg-theme-surface-hover border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary hover:text-theme-primary transition-colors">
                Configurar Protocolo Padrão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo: Prontuario (Placeholder) */}
      {activeTab === 'prontuario' && (
        <div className="flex-1 premium-card p-8 flex items-center justify-center flex-col text-center">
          <Activity size={48} className="text-theme-primary mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-white mb-2">Prontuário Médico</h3>
          <p className="text-sm text-theme-text-muted max-w-md">
            Registre o histórico de tratamentos, antibióticos e sintomas de cada ave individualmente ou do lote inteiro.
          </p>
          <button onClick={() => setActiveTab('vacinas')} className="mt-6 px-6 py-2 bg-theme-surface border border-theme-primary/30 rounded-full text-theme-primary font-bold text-sm hover:bg-theme-primary hover:text-black transition-all">
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
