-- ==============================================================================
-- Mura Manager - Migration: Bird Movements Ledger
-- Módulo financeiro e rastreabilidade forense de vendas, saídas e perdas de aves.
-- Suporte a modo offline-first, RLS, idempotência e integridade referencial.
-- ==============================================================================

create table if not exists public.bird_movements (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('venda', 'morte', 'abate', 'descarte', 'doacao', 'entrada', 'estorno')),
  data text not null, -- ISO yyyy-mm-dd
  ave_id text not null, -- ID da ave (preservado mesmo se ave for arquivada)
  ave_snapshot jsonb not null default '{}'::jsonb, -- snapshot no momento da transação (nome, anilha, sexo, raca, etc)
  valor_centavos bigint not null default 0, -- Inteiro em centavos (sem ponto flutuante)
  custo_aquisicao_centavos bigint,
  comprador_nome text,
  comprador_contato text,
  forma_pagamento text check (forma_pagamento in ('pix', 'dinheiro', 'cartao', 'a_prazo', 'outros')),
  status_pagamento text check (status_pagamento in ('pago', 'pendente')),
  data_pagamento text,
  motivo_perda text,
  observacoes text,
  origem text,
  idempotency_key text,
  estornado boolean not null default false,
  estorno_movimento_id text references public.bird_movements(id),
  motivo_estorno text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version bigint not null default 1,
  deleted_at timestamptz
);

-- Habilitar Row Level Security (RLS)
alter table public.bird_movements enable row level security;

-- Políticas de RLS restritas ao próprio usuário autenticado
drop policy if exists "Users can view their own bird movements" on public.bird_movements;
create policy "Users can view their own bird movements"
  on public.bird_movements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own bird movements" on public.bird_movements;
create policy "Users can insert their own bird movements"
  on public.bird_movements for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own bird movements" on public.bird_movements;
create policy "Users can update their own bird movements"
  on public.bird_movements for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own bird movements" on public.bird_movements;
create policy "Users can delete their own bird movements"
  on public.bird_movements for delete
  using (auth.uid() = user_id);

-- Índices de alta performance para filtros e paginação
create index if not exists idx_bird_movements_user_data
  on public.bird_movements (user_id, data desc);

create index if not exists idx_bird_movements_ave
  on public.bird_movements (user_id, ave_id);

create index if not exists idx_bird_movements_tipo
  on public.bird_movements (user_id, tipo);

-- Proteção estrita anti-duplicação:
-- 1. Chave de idempotência única por usuário (evita duplo clique ou retry duplicado de rede)
create unique index if not exists uq_bird_movements_idempotency
  on public.bird_movements (user_id, idempotency_key)
  where idempotency_key is not null;

-- 2. Integridade contábil de negócio: uma ave não pode ter dois movimentos terminais simultâneos ativos sem estorno prévio
create unique index if not exists uq_bird_movements_single_terminal
  on public.bird_movements (user_id, ave_id)
  where tipo in ('venda', 'morte', 'abate', 'descarte', 'doacao')
    and estornado = false
    and deleted_at is null;
