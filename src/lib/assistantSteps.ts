export interface AssistantStep {
  id: string;
  targetId: string;
  title: string;
  badge: string;
  speechText: string;
  description: string;
}

export interface TabGuide {
  tabId: string;
  tabTitle: string;
  totalSteps: number;
  steps: AssistantStep[];
}

export const ASSISTANT_GUIDES: Record<string, TabGuide> = {
  dashboard: {
    tabId: 'dashboard',
    tabTitle: 'Início & Visão Geral',
    totalSteps: 3,
    steps: [
      {
        id: 'dashboard-stats',
        targetId: 'dashboard-stats-grid',
        title: 'Métricas do Plantel',
        badge: 'Passo 1 de 3',
        speechText: 'Olá! Bem-vindo ao Mura Manager! Aqui no seu Painel Geral, você acompanha em tempo real o total de aves ativas, machos, fêmeas, pintinhos e raças cadastradas.',
        description: 'Aqui no seu **Painel Geral**, você acompanha em tempo real o **total de aves ativas**, machos, fêmeas, pintinhos e raças cadastradas no seu criatório.'
      },
      {
        id: 'dashboard-eggs',
        targetId: 'dashboard-egg-card, dashboard-stats-grid',
        title: 'Produção Semanal de Ovos',
        badge: 'Passo 2 de 3',
        speechText: 'Neste gráfico, você visualiza a contagem dos ovos coletados nos últimos sete dias e o acumulado do mês, com alertas automáticos se algum lote ficar sem registro.',
        description: 'Acompanhe a contagem de **ovos coletados nos últimos 7 dias** e o acumulado do mês, com avisos inteligentes se algum lote estiver sem coleta.'
      },
      {
        id: 'dashboard-navigation',
        targetId: 'nav-main-menu, mobile-nav-main-menu',
        title: 'Navegação por Abas',
        badge: 'Passo 3 de 3',
        speechText: 'Use o menu de navegação para explorar as ferramentas do app. Conforme você entrar em uma nova aba pela primeira vez, eu vou te ensinar como ela funciona!',
        description: 'Navegue entre **Aves, Lotes, Ovos e Vitrine**. Conforme você acessar cada aba pela primeira vez, eu vou te ensinar o funcionamento passo a passo!'
      }
    ]
  },

  birds: {
    tabId: 'birds',
    tabTitle: 'Gestão de Aves & Linhagens',
    totalSteps: 3,
    steps: [
      {
        id: 'birds-add',
        targetId: 'birds-add-button',
        title: 'Cadastrar Nova Ave',
        badge: 'Passo 1 de 3',
        speechText: 'Para adicionar uma ave, toque no botão Cadastrar Ave. Você pode registrar anilha, foto, baia, data de nascimento e vincular os pais para montar a árvore genealógica.',
        description: 'Toque em **Cadastrar Ave** para registrar anilha, foto, baia, sexo, status e vincular os pais para gerar a **árvore genealógica completa**.'
      },
      {
        id: 'birds-search',
        targetId: 'birds-search-bar',
        title: 'Busca e Filtros Rápidos',
        badge: 'Passo 2 de 3',
        speechText: 'Encontre qualquer ave em segundos digitando a anilha, nome ou baia. Use os filtros rápidos para separar reprodutores, matrizes ou aves vendidas.',
        description: 'Encontre qualquer ave instantaneamente por **anilha, nome ou baia**. Use os botões rápidos para filtrar por machos, fêmeas, matrizes ou reprodutores.'
      },
      {
        id: 'birds-tabs',
        targetId: 'birds-tabs-bar',
        title: 'Plantel, Raças e Histórico',
        badge: 'Passo 3 de 3',
        speechText: 'Alterne entre o Plantel Ativo, o catálogo de Raças e Linhagens, e a aba de Histórico e Vendas para acompanhar o balanço financeiro e as baixas.',
        description: 'Alterne entre o **Plantel Ativo**, catálogo de **Raças & Linhagens** e a aba de **Histórico & Vendas** para acompanhar o balanço de movimentações do criatório.'
      }
    ]
  },

  lots: {
    tabId: 'lots',
    tabTitle: 'Gestão de Lotes de Aves',
    totalSteps: 3,
    steps: [
      {
        id: 'lots-categories',
        targetId: 'lots-tabs-bar',
        title: 'Categorias de Manejo',
        badge: 'Passo 1 de 3',
        speechText: 'Aqui você organiza suas aves em três categorias de manejo: lotes de postura para produção de ovos, lotes de engorda para corte, e lotes de pintinhos para recria.',
        description: 'Gerencie seu criatório em 3 categorias: **Lotes de Postura**, **Lotes de Engorda** para corte e **Lotes de Pintinhos** para recria.'
      },
      {
        id: 'lots-create',
        targetId: 'lots-create-button',
        title: 'Criar Novo Lote',
        badge: 'Passo 2 de 3',
        speechText: 'Toque aqui para abrir um novo lote. Você define a baia, a raça predominante e pode vincular as galinhas já cadastradas ou informar aves avulsas.',
        description: 'Abra um novo lote informando a **baia e raça**, vinculando galinhas cadastradas no plantel ou fêmeas avulsas.'
      },
      {
        id: 'lots-filters',
        targetId: 'lots-status-filter',
        title: 'Acompanhamento & Pesagens',
        badge: 'Passo 3 de 3',
        speechText: 'Acompanhe os lotes ativos, encerre lotes quando necessário, e receba lembretes automáticos a cada quinze dias para realizar a pesagem das aves.',
        description: 'Filtre entre **lotes ativos e encerrados**, e receba avisos automáticos de **pesagem periódica a cada 15 dias** para calibrar o ganho de peso.'
      }
    ]
  },

  eggs: {
    tabId: 'eggs',
    tabTitle: 'Controle de Postura & Ovos',
    totalSteps: 3,
    steps: [
      {
        id: 'eggs-header',
        targetId: 'eggs-header-controls',
        title: 'Lotes de Postura & Período',
        badge: 'Passo 1 de 3',
        speechText: 'Na aba de ovos, você cria lotes de postura vinculados a cada baia e pode filtrar os resultados por sete dias, trinta dias ou histórico geral.',
        description: 'Crie seus **lotes de postura** por baia e filtre a produtividade por **7 dias, 30 dias ou todo o histórico**.'
      },
      {
        id: 'eggs-kpis',
        targetId: 'eggs-kpi-summary',
        title: 'Coletados, Estoque e Vendas',
        badge: 'Passo 2 de 3',
        speechText: 'Aqui você acompanha o volume de ovos coletados, ovos disponíveis no estoque, total vendido com receita gerada e eventuais quebras ou perdas.',
        description: 'Monitore o **total coletado, estoque atual, ovos vendidos com faturamento** e perdas registradas no período.'
      },
      {
        id: 'eggs-daily',
        targetId: 'eggs-lots-list, eggs-empty-lot-card, eggs-header-controls',
        title: 'Lançamento Diário de Coleta',
        badge: 'Passo 3 de 3',
        speechText: 'Toque em Lançar Dia no card da baia para registrar a contagem de hoje. O calendário calcula automaticamente a taxa de postura e identifica variações de produção.',
        description: 'Toque em **Lançar Dia** para registrar os ovos coletados, vendidos e perdidos. O calendário calcula a **taxa diária de postura** automaticamente.'
      }
    ]
  },

  vitrine: {
    tabId: 'vitrine',
    tabTitle: 'Vitrine Digital do Criatório',
    totalSteps: 3,
    steps: [
      {
        id: 'vitrine-link',
        targetId: 'vitrine-header-card, vitrine-locked-card',
        title: 'Catálogo Público Exclusivo',
        badge: 'Passo 1 de 3',
        speechText: 'A Vitrine Digital é a página pública oficial do seu criatório. Aqui você tem um link exclusivo pronto para divulgar suas aves para clientes em todo o Brasil.',
        description: 'A **Vitrine Digital** é a página pública do seu criatório. Compartilhe o link exclusivo com clientes para exibir aves disponíveis para negociação.'
      },
      {
        id: 'vitrine-share',
        targetId: 'vitrine-share-buttons, vitrine-locked-card, vitrine-header-card',
        title: 'Compartilhar no WhatsApp',
        badge: 'Passo 2 de 3',
        speechText: 'Com um único toque, você pode copiar o link ou enviar diretamente uma mensagem personalizada no WhatsApp com fotos, preços e procedência selecionada.',
        description: 'Toque em **WhatsApp** ou **Copiar Link** para enviar a apresentação do seu criatório diretamente para clientes e grupos.'
      },
      {
        id: 'vitrine-toggles',
        targetId: 'vitrine-bird-list, vitrine-locked-card, vitrine-header-card',
        title: 'Exibir ou Ocultar Aves',
        badge: 'Passo 3 de 3',
        speechText: 'Basta tocar no botão Na Vitrine em cada ave que você deseja exibir. Somente as aves que você ativar ficarão visíveis para seus clientes.',
        description: 'Ative o botão **Na Vitrine** em cada ave que deseja expor. Apenas as aves selecionadas ficam visíveis publicamente no seu catálogo.'
      }
    ]
  },

  settings: {
    tabId: 'settings',
    tabTitle: 'Configurações do Criatório',
    totalSteps: 3,
    steps: [
      {
        id: 'settings-farm',
        targetId: 'settings-farm-info',
        title: 'Identidade do seu Criatório',
        badge: 'Passo 1 de 3',
        speechText: 'Aqui você personaliza o nome da sua granja, insere o logotipo ou foto oficial, e define sua cidade e estado para impressão em certificados e relatórios.',
        description: 'Defina o **nome do criatório, logotipo/foto oficial**, e-mail, telefone e cidade. Essas informações saem nas fichas genealógicas e na sua vitrine.'
      },
      {
        id: 'settings-pwa',
        targetId: 'install-pwa-card, settings-farm-info',
        title: 'Salvar no Celular (iPhone & Android)',
        badge: 'Passo 2 de 3',
        speechText: 'Dica de ouro: adicione o ícone do Mura Manager na tela inicial do seu celular. Ele funciona como um aplicativo instalado, abre em tela cheia e mantém seu login sempre salvo.',
        description: 'Instale o app na **tela inicial do seu iPhone ou Android** para abrir em tela cheia com acesso instantâneo e login sempre salvo!'
      },
      {
        id: 'settings-backup',
        targetId: 'settings-backup-card',
        title: 'Cópia de Segurança & Backup',
        badge: 'Passo 3 de 3',
        speechText: 'Mantenha seus dados sempre protegidos: você pode baixar um arquivo de backup completo com todas as suas aves e raças e restaurar quando desejar.',
        description: 'Faça o **download de backup completo** dos seus registros e restaure quando quiser para ter total segurança e controle dos seus dados.'
      }
    ]
  }
};

/**
 * Converte rota URL para o ID da aba correspondente
 */
export function getTabIdFromPath(pathname: string): string | null {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean || clean === 'dashboard') return 'dashboard';
  if (clean.startsWith('bird')) return 'birds';
  if (clean.startsWith('lot')) return 'lots';
  if (clean.startsWith('egg')) return 'eggs';
  if (clean.startsWith('vitrine')) return 'vitrine';
  if (clean.startsWith('setting')) return 'settings';
  return null;
}
