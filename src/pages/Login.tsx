import { useState, useEffect } from 'react';
import { Activity, LogIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

type AnimPhase = 'walking' | 'flapping' | 'idle';

// ─────────────────────────────────────────────
// Articulated SVG Malay Gamecock Silhouette
// Each body part is a separate group with its
// own CSS animation for realistic movement.
// ─────────────────────────────────────────────
function GamecockSilhouette({ phase }: { phase: AnimPhase }) {
  const w = phase === 'walking';
  const f = phase === 'flapping';
  const i = phase === 'idle';

  return (
    <svg
      viewBox="0 0 240 370"
      xmlns="http://www.w3.org/2000/svg"
      fill="black"
      width="220"
      height="310"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        /* ── Body bounce (synced to steps) ── */
        @keyframes gcBounce {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%      { transform: translateY(-7px) rotate(-2deg); }
          75%      { transform: translateY(-7px) rotate(2deg); }
        }
        /* ── Idle breathing ── */
        @keyframes gcBreathe {
          0%,100% { transform: scaleY(1) translateY(0px); }
          50%      { transform: scaleY(1.018) translateY(-3px); }
        }
        /* ── Head bob forward with each step ── */
        @keyframes gcHeadBob {
          0%,100% { transform: rotate(-5deg) translate(-2px, 1px); }
          50%      { transform: rotate(6deg) translate(4px, -1px); }
        }
        /* ── Right leg: starts forward, swings back ── */
        @keyframes gcLegR {
          0%,100% { transform: rotate(-28deg); }
          50%      { transform: rotate(32deg);  }
        }
        /* ── Left leg: starts back, swings forward (opposite) ── */
        @keyframes gcLegL {
          0%,100% { transform: rotate(32deg);  }
          50%      { transform: rotate(-28deg); }
        }
        /* ── Wing flap: dramatic sweep up and down ── */
        @keyframes gcWingFlap {
          0%   { transform: rotate(0deg)   scaleX(1);    }
          18%  { transform: rotate(-85deg) scaleX(1.35); }
          42%  { transform: rotate(28deg)  scaleX(0.9);  }
          62%  { transform: rotate(-90deg) scaleX(1.38); }
          84%  { transform: rotate(22deg)  scaleX(0.92); }
          100% { transform: rotate(-14deg) scaleX(1.1);  }
        }
        /* ── Wing subtle idle sway ── */
        @keyframes gcWingIdle {
          0%,100% { transform: rotate(0deg); }
          50%      { transform: rotate(4deg); }
        }
        /* ── Tail feathers sway when walking ── */
        @keyframes gcTailSway {
          0%,100% { transform: rotate(0deg); }
          33%      { transform: rotate(-3deg) translateX(-2px); }
          66%      { transform: rotate(3deg)  translateX(2px); }
        }

        /* Apply animations based on phase */
        .gc-body-grp {
          transform-origin: 118px 228px;
          animation: ${w ? 'gcBounce 0.48s ease-in-out infinite'
                     : i ? 'gcBreathe 4s ease-in-out infinite'
                     : 'none'};
        }
        .gc-head-grp {
          transform-origin: 150px 130px;
          animation: ${w ? 'gcHeadBob 0.48s ease-in-out infinite' : 'none'};
        }
        .gc-leg-r {
          transform-origin: 123px 248px;
          animation: ${w ? 'gcLegR 0.48s ease-in-out infinite' : 'none'};
        }
        .gc-leg-l {
          transform-origin: 110px 252px;
          animation: ${w ? 'gcLegL 0.48s ease-in-out infinite' : 'none'};
        }
        .gc-wing {
          transform-origin: 94px 206px;
          animation: ${f ? 'gcWingFlap 0.65s ease-in-out 3'
                     : i ? 'gcWingIdle 4.5s ease-in-out infinite'
                     : 'none'};
        }
        .gc-tail {
          transform-origin: 78px 228px;
          animation: ${w ? 'gcTailSway 0.72s ease-in-out infinite' : 'none'};
        }
      `}</style>

      {/* ══════════════════════════════════
          BACKGROUND LEG (left, faded)
      ══════════════════════════════════ */}
      <g className="gc-leg-l" opacity="0.55">
        {/* Thigh */}
        <path d="M107 252 C105 268 103 286 102 300 L113 300 C114 286 115 268 116 254Z" />
        {/* Lower leg (tarsus) */}
        <path d="M102 300 C100 316 99 330 99 342 L109 342 C110 330 111 316 113 300Z" />
        {/* Front toe */}
        <path d="M99 342 C89 346 77 350 66 352 C67 358 73 359 79 357 C90 353 99 348 102 343Z" />
        {/* Middle toe */}
        <path d="M102 344 C104 351 108 358 110 365 C114 364 116 358 113 352 C110 347 106 343 103 341Z" />
        {/* Outer toe */}
        <path d="M105 343 C114 347 124 350 131 349 C131 355 127 357 122 355 C114 351 107 346 105 343Z" />
      </g>

      {/* ══════════════════════════════════
          MAIN BODY GROUP (bounces)
      ══════════════════════════════════ */}
      <g className="gc-body-grp">

        {/* TAIL FEATHERS (sway separately) */}
        <g className="gc-tail">
          {/* Upper tail feather */}
          <path d="M80 208 C61 213 41 222 22 237 C11 249 5 265 9 278
                   C18 267 32 255 49 246 C67 236 79 222 81 213Z" />
          {/* Middle tail feather */}
          <path d="M77 220 C57 233 36 254 18 278 C8 292 5 310 11 323
                   C21 310 35 292 52 278 C70 263 78 245 78 228Z" />
          {/* Lower tail feather */}
          <path d="M73 234 C52 258 33 285 18 316 C10 333 7 352 13 362
                   C24 345 38 324 55 306 C73 285 79 260 75 242Z" />
        </g>

        {/* BODY (ellipse) */}
        <ellipse cx="126" cy="232" rx="60" ry="40" transform="rotate(-10 126 232)" />

        {/* WING FEATHERS (animated separately) */}
        <g className="gc-wing">
          {/* Wing main surface */}
          <path d="M88 212 C92 197 108 188 126 187
                   C147 186 164 197 166 214
                   C157 223 142 228 125 229
                   C107 229 92 224 88 212Z" />
          {/* Primary feathers */}
          <path d="M88 214 C79 227 72 247 70 267
                   C77 270 83 264 87 254
                   C90 240 90 226 88 214Z" />
          <path d="M83 222 C72 238 63 263 59 286
                   C66 289 73 283 77 270
                   C80 253 82 236 83 222Z" />
          <path d="M77 234 C64 258 55 287 51 314
                   C58 318 66 311 70 296
                   C74 276 77 254 77 236Z" />
        </g>

        {/* NECK */}
        <path d="M149 196 C152 178 156 157 160 136
                 C163 119 165 102 163 90
                 C159 87 154 88 150 92
                 C148 105 146 122 143 141
                 C140 162 138 181 138 198Z" />
      </g>

      {/* ══════════════════════════════════
          HEAD + COMB (nods when walking)
      ══════════════════════════════════ */}
      <g className="gc-head-grp">
        {/* Comb (3 bumps) */}
        <path d="M148 90 C149 76 152 65 156 57
                 C159 67 161 61 165 52
                 C168 63 171 57 175 49
                 C177 61 176 77 174 91Z" />
        {/* Head shape */}
        <ellipse cx="161" cy="106" rx="23" ry="21" />
        {/* Wattles */}
        <path d="M174 118 C179 130 178 146 172 155
                 C166 163 157 164 153 157
                 C155 146 161 133 167 124Z" />
        {/* Upper beak */}
        <path d="M182 102 L202 109 C198 115 189 117 182 114
                 C179 109 179 104 182 102Z" />
        {/* Lower beak */}
        <path d="M182 114 C189 117 198 116 202 113
                 L182 121 C180 118 180 115 182 114Z" />
        {/* Eye socket (dark circle, slightly lighter center) */}
        <circle cx="169" cy="101" r="6" fill="black" />
        <circle cx="170" cy="100" r="2.5" fill="rgba(255,255,255,0.15)" />
      </g>

      {/* ══════════════════════════════════
          FOREGROUND LEG (right, full opacity)
      ══════════════════════════════════ */}
      <g className="gc-leg-r">
        {/* Thigh */}
        <path d="M120 248 C118 266 116 284 115 298 L127 298 C128 284 129 266 129 250Z" />
        {/* Lower leg (tarsus) – slightly angled */}
        <path d="M115 298 C114 314 113 330 113 342 L124 342 C124 330 125 314 127 298Z" />
        {/* Front toe */}
        <path d="M113 342 C103 346 90 350 79 352 C80 357 86 359 92 357
                 C103 353 112 348 115 343Z" />
        {/* Middle toe */}
        <path d="M115 344 C117 351 121 359 124 366 C128 365 130 359 127 353
                 C124 347 120 343 116 342Z" />
        {/* Outer toe */}
        <path d="M118 343 C127 347 138 350 145 350 C145 355 141 357 136 356
                 C128 352 120 347 118 343Z" />
        {/* Back spur */}
        <path d="M112 340 C106 333 104 323 107 316 C110 322 113 332 114 340Z" />
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────────
export function Login() {
  const { signIn, isLocalMode } = useAuth();

  const [cpfInput, setCpfInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [animPhase, setAnimPhase] = useState<AnimPhase>('walking');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Phase 1: walking (0 → 2600ms)
    // Phase 2: flapping (2600 → 4600ms  —  3 flap cycles × 650ms ≈ 1950ms)
    // Phase 3: idle + show form (4600ms+)
    const toFlap = setTimeout(() => setAnimPhase('flapping'), 2600);
    const toIdle = setTimeout(() => {
      setAnimPhase('idle');
      setShowForm(true);
    }, 4600);
    return () => { clearTimeout(toFlap); clearTimeout(toIdle); };
  }, []);

  const formatCPF = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCPF(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpfInput.replace(/\D/g, '');
    if (!clean) { setErrorMsg('Por favor, preencha o CPF.'); return; }
    if (clean.length !== 11) { setErrorMsg('O CPF deve ter 11 dígitos.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signIn(cpfInput);
      if (error) setErrorMsg(error.message || 'CPF não cadastrado ou acesso negado.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <style>{`
        @keyframes rooserSlide {
          from { transform: translateX(-350px); opacity: 0; }
          to   { transform: translateX(0);       opacity: 1; }
        }
        @keyframes formAppear {
          from { opacity: 0; transform: translateY(28px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
        }
        .rooster-slide { animation: rooserSlide 1.15s cubic-bezier(0.34, 1.35, 0.64, 1) forwards; }
        .form-appear   { animation: formAppear  0.9s  cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Ambient glow behind rooster */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[480px] h-[480px] bg-theme-primary/8 rounded-full blur-[140px]
                      pointer-events-none" />

      <div className="w-full max-w-xs z-10 flex flex-col items-center gap-6">

        {/* ── Rooster ── */}
        <div
          className="rooster-slide select-none pointer-events-none"
          style={{
            filter: animPhase === 'flapping'
              ? 'brightness(0) drop-shadow(0 0 36px rgba(245,158,11,0.75))'
              : 'brightness(0) drop-shadow(0 14px 28px rgba(0,0,0,0.65))',
            transition: 'filter 0.5s ease',
          }}
        >
          <GamecockSilhouette phase={animPhase} />
        </div>

        {/* ── CPF Form ── */}
        {showForm && (
          <div className="form-appear w-full space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400
                              text-xs rounded-xl font-bold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                required
                autoFocus
                value={cpfInput}
                onChange={handleCpfChange}
                className="w-full bg-transparent border-b-2 border-theme-border/60
                           focus:border-theme-primary outline-none transition-colors
                           tracking-widest text-center font-bold text-2xl py-3 text-white
                           placeholder-theme-text-muted/30"
                placeholder="000.000.000-00"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 rounded-xl flex items-center
                           justify-center gap-2 font-black text-base shadow-lg
                           transition-all active:scale-95 disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                {loading
                  ? <Activity size={18} className="animate-spin text-black" />
                  : <><LogIn size={18} /> Entrar no Criatório</>
                }
              </button>
            </form>

            {isLocalMode && (
              <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg
                              text-orange-300/50 text-[10px] text-center">
                Modo Local · Admin: 14477751630
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
