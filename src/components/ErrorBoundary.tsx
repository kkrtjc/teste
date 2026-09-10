import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * GlobalErrorBoundary — Blindagem completa para a raiz da aplicação.
 * Se algum erro fatal ocorrer na renderização, substitui a tela branca por
 * uma tela de recuperação com visual escuro profissional e botão de recarga.
 */
export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary] Erro fatal capturado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-theme-base flex items-center justify-center p-6 select-none">
          <div className="bg-theme-surface border border-theme-border rounded-3xl shadow-2xl p-8 max-w-md w-full text-center backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>

            <h1 className="text-white text-xl font-black mb-2 tracking-tight">Ops! Algo deu errado</h1>
            <p className="text-theme-text-muted text-xs mb-6 leading-relaxed">
              Ocorreu uma falha inesperada na interface. Seus dados continuam salvos com segurança.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 rounded-xl bg-black/40 border border-white/5 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-red-400 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-sm tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * CardErrorBoundary — Blindagem modular para isolar componentes/cards.
 * Se um card ou componente filho quebrar, apenas ele mostra o aviso com botão de retentativa,
 * impedindo que o resto da tela ou da navegação trave.
 */
export class CardErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; label?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CardErrorBoundary] Falha modular isolada:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-theme-surface border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold truncate">
                {this.props.label || 'Erro ao carregar componente'}
              </p>
              <p className="text-theme-text-muted text-[10px] truncate">
                {this.state.error?.message || 'Falha temporária'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-amber-400 hover:text-amber-300 text-xs font-bold shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
          >
            Tentar de novo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
