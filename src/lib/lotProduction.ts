import type { EggDailyRecord } from './AppContext';

export interface LotProductionStats {
  hasRecords: boolean;
  totalOvos: number;
  diasProducao: number;
  diasComRegistro: number;
  mediaOvosDia: number;
  mediaFormatada: string;
  taxaPostura: number;
  primeiraData: string;
  ultimaData: string;
}

/**
 * Calcula estatísticas profissionais de produção de ovos para um lote de postura.
 * Calcula a diferença real de dias entre a primeira e a última data de produção registradas,
 * gerando a média precisa de ovos por dia do lote e a taxa de postura zootécnica com base no número de fêmeas.
 */
export function calculateLotProduction(registros?: EggDailyRecord[], totalFemeas: number = 0): LotProductionStats {
  if (!registros || !Array.isArray(registros) || registros.length === 0) {
    return {
      hasRecords: false,
      totalOvos: 0,
      diasProducao: 0,
      diasComRegistro: 0,
      mediaOvosDia: 0,
      mediaFormatada: '0',
      taxaPostura: 0,
      primeiraData: '',
      ultimaData: ''
    };
  }

  // Filtra registros válidos com data preenchida
  const valid = registros.filter(r => r && r.data && Number(r.coletados) >= 0);
  if (valid.length === 0) {
    return {
      hasRecords: false,
      totalOvos: 0,
      diasProducao: 0,
      diasComRegistro: 0,
      mediaOvosDia: 0,
      mediaFormatada: '0',
      taxaPostura: 0,
      primeiraData: '',
      ultimaData: ''
    };
  }

  const totalOvos = valid.reduce((sum, r) => sum + (Number(r.coletados) || 0), 0);
  const sortedDates = Array.from(new Set(valid.map(r => r.data))).sort();
  const primeiraData = sortedDates[0];
  const ultimaData = sortedDates[sortedDates.length - 1];

  // Cálculo da diferença de dias corridos entre a primeira e a última data de produção registrada
  const dInicio = new Date(primeiraData + 'T12:00:00');
  const dFim = new Date(ultimaData + 'T12:00:00');
  const diffTime = Math.max(0, dFim.getTime() - dInicio.getTime());
  
  // +1 dia para incluir ambos os dias extremos do intervalo
  const diasPeriodo = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const mediaOvosDia = diasPeriodo > 0 ? (totalOvos / diasPeriodo) : 0;
  const mediaFormatada = mediaOvosDia.toFixed(1).replace('.', ',');

  // Taxa de postura zootécnica real (% média de fêmeas do lote botando por dia)
  const taxaPostura = totalFemeas > 0 ? Math.min(100, Math.round((mediaOvosDia / totalFemeas) * 100)) : 0;

  return {
    hasRecords: true,
    totalOvos,
    diasProducao: diasPeriodo,
    diasComRegistro: sortedDates.length,
    mediaOvosDia,
    mediaFormatada,
    taxaPostura,
    primeiraData,
    ultimaData
  };
}
