import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { type Bird } from '../lib/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type TreeNode = {
  bird: Bird | null;
  isExternal: boolean;
  isEmpty: boolean;
  label: string;
  pai: TreeNode | null;
  mae: TreeNode | null;
  depth: number;
};

type NodePos = {
  node: TreeNode;
  x: number;
  y: number;
  col: number;
  row: number;
};

type MiniCardState = {
  visible: boolean;
  node: TreeNode | null;
  anchorX: number;
  anchorY: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 80;
const NODE_H = 96;
const COL_GAP = 48;  // horizontal gap between nodes in same generation
const ROW_GAP = 72;  // vertical gap between generations
const MAX_DEPTH = 3; // 0=self, 1=parents, 2=grandparents, 3=great-grandparents

// Generation labels
const GEN_LABELS = ['Ave Atual', 'Pais', 'Avós', 'Bisavós'];

// ─── Build tree algorithm ─────────────────────────────────────────────────────
function buildTree(
  birdId: string | undefined,
  isExternal: boolean | undefined,
  externalLabel: string | undefined,
  birds: Bird[],
  depth: number,
  maxDepth: number,
  emptyLabel: string
): TreeNode {
  // Beyond max depth → null subtrees
  if (depth > maxDepth) {
    return { bird: null, isExternal: false, isEmpty: true, label: '', pai: null, mae: null, depth };
  }

  // External progenitor (not in the system)
  if (isExternal || (!birdId && externalLabel)) {
    return {
      bird: null,
      isExternal: true,
      isEmpty: false,
      label: externalLabel || 'Externo',
      pai: null,
      mae: null,
      depth,
    };
  }

  // Empty slot (no parent registered)
  if (!birdId) {
    return {
      bird: null,
      isExternal: false,
      isEmpty: true,
      label: emptyLabel,
      pai: null,
      mae: null,
      depth,
    };
  }

  const bird = birds.find(b => b.id === birdId) || null;

  if (!bird) {
    return {
      bird: null,
      isExternal: false,
      isEmpty: true,
      label: emptyLabel,
      pai: null,
      mae: null,
      depth,
    };
  }

  return {
    bird,
    isExternal: false,
    isEmpty: false,
    label: bird.anilha,
    // When isPaiExterno, paiId holds the external name — pass it as externalLabel
    pai: buildTree(
      bird.isPaiExterno ? undefined : bird.paiId,
      bird.isPaiExterno,
      bird.isPaiExterno ? bird.paiId : undefined,
      birds, depth + 1, maxDepth, 'Pai não vinculado'
    ),
    mae: buildTree(
      bird.isMaeExterno ? undefined : bird.maeId,
      bird.isMaeExterno,
      bird.isMaeExterno ? bird.maeId : undefined,
      birds, depth + 1, maxDepth, 'Mãe não vinculada'
    ),
    depth,
  };
}

// ─── Layout algorithm (position each node) ──────────────────────────────────
// Returns a flat list of {node, x, y} using a binary-tree column layout
function layoutTree(root: TreeNode): { positions: NodePos[]; totalW: number; totalH: number } {
  const positions: NodePos[] = [];
  const maxDepth = MAX_DEPTH;
  // Generation i has 2^i slots, laid out left-to-right
  // We render rows bottom-up: row 0 = root (bottom), row maxDepth = great-grandparents (top)

  function place(node: TreeNode, depth: number, col: number, maxCols: number) {
    if (depth > maxDepth) return;
    // x centers the node within its column slot
    const slotW = (NODE_W + COL_GAP);
    const x = col * slotW + slotW / 2 - NODE_W / 2;
    // y: root is at bottom (row 0), ancestors go up
    const y = (maxDepth - depth) * (NODE_H + ROW_GAP);
    const row = maxDepth - depth;
    positions.push({ node, x, y, col, row });

    if (node.pai) {
      place(node.pai, depth + 1, col * 2, maxCols * 2);
    } else if (depth < maxDepth) {
      place({ bird: null, isExternal: false, isEmpty: true, label: 'Não vinculado', pai: null, mae: null, depth: depth + 1 },
        depth + 1, col * 2, maxCols * 2);
    }
    if (node.mae) {
      place(node.mae, depth + 1, col * 2 + 1, maxCols * 2);
    } else if (depth < maxDepth) {
      place({ bird: null, isExternal: false, isEmpty: true, label: 'Não vinculado', pai: null, mae: null, depth: depth + 1 },
        depth + 1, col * 2 + 1, maxCols * 2);
    }
  }

  place(root, 0, 0, 1);

  // Compute bounding box
  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);
  const minX = Math.min(...xs);
  // Normalize x so left edge is 0
  const normalized = positions.map(p => ({ ...p, x: p.x - minX }));
  const totalW = Math.max(...normalized.map(p => p.x + NODE_W)) + 16;
  const totalH = Math.max(...ys) + NODE_H + 16;

  return { positions: normalized, totalW, totalH };
}

// ─── Connection lines (SVG bezier) ───────────────────────────────────────────
function ConnectionLines({ positions }: { positions: NodePos[] }) {
  // Build a map: depth+col → position
  const posMap = new Map<string, NodePos>();
  for (const p of positions) posMap.set(`${p.node.depth}-${p.col}`, p);

  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];

  for (const pos of positions) {
    if (pos.node.depth >= MAX_DEPTH) continue;
    const d = pos.node.depth;
    const c = pos.col;

    // Find children (depth+1, col*2 and col*2+1)
    const leftChild = posMap.get(`${d + 1}-${c * 2}`);
    const rightChild = posMap.get(`${d + 1}-${c * 2 + 1}`);

    const parentCX = pos.x + NODE_W / 2;
    const parentCY = pos.y; // top of parent node

    if (leftChild) {
      const childCX = leftChild.x + NODE_W / 2;
      const childCY = leftChild.y + NODE_H; // bottom of child node
      lines.push({ x1: parentCX, y1: parentCY, x2: childCX, y2: childCY, key: `${d}-${c}-L` });
    }
    if (rightChild) {
      const childCX = rightChild.x + NODE_W / 2;
      const childCY = rightChild.y + NODE_H;
      lines.push({ x1: parentCX, y1: parentCY, x2: childCX, y2: childCY, key: `${d}-${c}-R` });
    }
  }

  return (
    <>
      {lines.map(l => {
        const midY = (l.y1 + l.y2) / 2;
        const d = `M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`;
        return (
          <path key={l.key} d={d} fill="none"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"
            strokeDasharray={undefined}/>
        );
      })}
    </>
  );
}

// ─── Single Node ──────────────────────────────────────────────────────────────
function TreeNodeCard({
  pos, isRoot, onClick,
}: {
  pos: NodePos;
  isRoot: boolean;
  onClick: (pos: NodePos, el: HTMLDivElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { node } = pos;

  const handleClick = () => {
    if (node.isEmpty) return;
    if (ref.current) onClick(pos, ref.current);
  };

  // ── Visual variants ──
  if (node.isEmpty) {
    return (
      <div
        ref={ref}
        style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
        className="absolute flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] select-none"
      >
        <span className="text-[10px] text-white/20 text-center px-1 leading-tight">{node.label}</span>
      </div>
    );
  }

  if (node.isExternal) {
    // Use col parity for stable emoji (no Math.random in render)
    const extEmoji = pos.col % 2 === 0 ? '🐓' : '🐔';
    return (
      <div
        ref={ref}
        onClick={handleClick}
        style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
        className="absolute flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.04] select-none cursor-pointer hover:border-white/30 transition-all"
      >
        <div className="text-2xl mb-1 opacity-40">{extEmoji}</div>
        <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider text-center px-1">Externo</span>
        <span className="text-[9px] text-white/20 text-center px-1 leading-tight mt-0.5 truncate w-full text-center">{node.label}</span>
      </div>
    );
  }

  const b = node.bird!;
  const isMacho = b.sexo === 'Macho';

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
      className={`absolute flex flex-col items-center justify-between rounded-2xl border transition-all duration-200 select-none overflow-hidden
        ${isRoot
          ? 'border-amber-400/60 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.15)] cursor-default'
          : 'border-white/15 bg-white/[0.06] hover:border-theme-primary/60 hover:bg-white/10 hover:shadow-[0_0_16px_rgba(251,191,36,0.1)] cursor-pointer active:scale-95'
        }`}
    >
      {/* Photo */}
      <div className={`w-full flex-1 flex items-center justify-center overflow-hidden rounded-t-2xl ${isRoot ? 'bg-amber-400/5' : 'bg-white/[0.03]'}`}>
        {b.imagem ? (
          <img src={b.imagem} alt={b.anilha} loading="lazy"
            className="w-full h-full object-cover"/>
        ) : (
          <span className="text-3xl">{isMacho ? '🐓' : '🐔'}</span>
        )}
      </div>

      {/* Info */}
      <div className="w-full px-1.5 py-1.5 bg-black/40 backdrop-blur-sm">
        <p className={`text-[10px] font-black truncate text-center leading-tight ${isRoot ? 'text-amber-300' : 'text-white'}`}>
          {b.anilha}
        </p>
        {b.nome && (
          <p className="text-[8px] text-white/40 truncate text-center">{b.nome}</p>
        )}
        <div className={`mt-0.5 mx-auto w-fit px-1 py-px rounded text-[7px] font-bold uppercase
          ${isMacho ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'}`}>
          {b.sexo === 'Macho' ? 'M' : 'F'}
        </div>
      </div>

      {/* Root badge */}
      {isRoot && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[7px] font-black px-1.5 py-px rounded-full uppercase tracking-wider whitespace-nowrap shadow-lg">
          Ave Atual
        </div>
      )}
    </div>
  );
}

// ─── Mini Card (floating detail popup) ───────────────────────────────────────
function MiniCard({
  state, onClose, onOpenProfile,
  containerRef,
}: {
  state: MiniCardState;
  onClose: () => void;
  onOpenProfile: (birdId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!state.visible || !state.node) return null;

  const b = state.node.bird;
  const isMacho = b?.sexo === 'Macho';

  // Position: prefer showing to the right, clamp to container
  const containerW = containerRef.current?.clientWidth || 320;
  const cardW = 180;
  let left = state.anchorX + NODE_W / 2 + 8;
  if (left + cardW > containerW - 8) left = state.anchorX - cardW - 8;
  if (left < 8) left = 8;

  const top = Math.max(8, state.anchorY - 20);

  return createPortal(
    <div
      className="fixed inset-0 z-[200]"
      onClick={onClose}
    >
      <div
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <div
          style={{
            position: 'absolute',
            left: `clamp(8px, ${left}px, calc(100vw - ${cardW + 8}px))`,
            top: `clamp(8px, ${top}px, calc(100dvh - 200px))`,
            width: cardW,
            pointerEvents: 'all',
          }}
          onClick={e => e.stopPropagation()}
          className="bg-[#0F172A]/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        >
          {/* Header photo */}
          <div className="h-20 bg-theme-base relative flex items-center justify-center overflow-hidden">
            {b?.imagem ? (
              <img src={b.imagem} alt={b.anilha} className="w-full h-full object-cover opacity-80"/>
            ) : (
              <span className="text-4xl">{isMacho ? '🐓' : '🐔'}</span>
            )}
            <button onClick={onClose}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white">
              <X size={10}/>
            </button>
          </div>

          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-white truncate">{b?.anilha}</p>
              <span className={`text-[9px] font-bold px-1.5 py-px rounded-full shrink-0
                ${isMacho ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'}`}>
                {b?.sexo}
              </span>
            </div>
            {b?.nome && <p className="text-[11px] text-amber-300 font-bold truncate">{b.nome}</p>}
            <p className="text-[10px] text-white/40">{b?.raca}</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${b?.status === 'Ativo' ? 'bg-green-400' : 'bg-white/30'}`}/>
              <p className="text-[10px] text-white/50">{b?.status}</p>
            </div>
            <p className="text-[10px] text-white/30">Baia: {b?.baia}</p>

            {b && (
              <button
                onClick={() => { onOpenProfile(b.id); onClose(); }}
                className="w-full mt-1 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-300 text-[11px] font-black rounded-xl transition-all flex items-center justify-center gap-1"
              >
                <ExternalLink size={11}/> Ver perfil completo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────

export function GenealogyTree({
  bird,
  birds,
  onOpenProfile,
}: {
  bird: Bird;
  birds: Bird[];
  onOpenProfile: (birdId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [miniCard, setMiniCard] = useState<MiniCardState>({
    visible: false, node: null, anchorX: 0, anchorY: 0,
  });
  const [scrollHint, setScrollHint] = useState(true);

  // Build the tree
  const root = useMemo(() => buildTree(
    bird.id, false, undefined, birds, 0, MAX_DEPTH, ''
  ), [bird.id, birds]);

  // Compute layout
  const { positions, totalW, totalH } = useMemo(() => layoutTree(root), [root]);

  // Check if tree has any real ancestors (registered OR external)
  const hasAncestors = useMemo(() =>
    positions.some(p => !p.node.isEmpty && p.node.depth > 0),
    [positions]);

  const handleNodeClick = useCallback((pos: NodePos, el: HTMLDivElement) => {
    if (pos.node.isEmpty) return;
    const rect = el.getBoundingClientRect();
    setMiniCard({
      visible: true,
      node: pos.node,
      anchorX: rect.left,
      anchorY: rect.top,
    });
  }, []);

  const closeMiniCard = useCallback(() => {
    setMiniCard(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setScrollHint(false), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!hasAncestors) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <GitBranch size={24} className="text-white/20"/>
        </div>
        <p className="text-sm font-bold text-white/40">Nenhum ancestral vinculado</p>
        <p className="text-xs text-white/20 max-w-xs">
          Vincule o pai e a mãe desta ave nos campos de edição para visualizar a árvore genealógica.
        </p>
      </div>
    );
  }

  // Extra width for legend labels
  const legendW = 80;
  const canvasW = totalW + legendW + 8;

  return (
    <div className="relative w-full">
      {/* Scroll hint for mobile */}
      {scrollHint && totalW > 300 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none animate-fade-in">
          <ChevronLeft size={12} className="text-white/60 animate-bounce-x"/>
          <span className="text-[10px] text-white/50">Deslize para navegar</span>
          <ChevronRight size={12} className="text-white/60 animate-bounce-x"/>
        </div>
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-visible pb-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Canvas */}
        <div
          className="relative mx-auto"
          style={{ width: canvasW, height: totalH }}
        >
          {/* SVG lines layer */}
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible"
            style={{ width: totalW, height: totalH }}
          >
            <ConnectionLines positions={positions}/>
          </svg>

          {/* Nodes */}
          {positions.map((pos, i) => (
            <TreeNodeCard
              key={i}
              pos={pos}
              isRoot={pos.node.depth === 0}
              onClick={handleNodeClick}
            />
          ))}

          {/* Generation labels on the right */}
          <div style={{ position: 'absolute', left: totalW + 8, top: 0, height: totalH }}>
            {[...Array(MAX_DEPTH + 1)].map((_, i) => {
              const rowDepth = i; // 0=self(bottom), 1=parents, etc
              const y = (MAX_DEPTH - rowDepth) * (NODE_H + ROW_GAP) + NODE_H / 2 - 8;
              return (
                <p key={i}
                  style={{ position: 'absolute', top: y }}
                  className="text-[9px] text-white/20 font-bold uppercase tracking-wider whitespace-nowrap">
                  {GEN_LABELS[rowDepth]}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mini card popup */}
      <MiniCard
        state={miniCard}
        onClose={closeMiniCard}
        onOpenProfile={onOpenProfile}
        containerRef={containerRef}
      />
    </div>
  );
}
