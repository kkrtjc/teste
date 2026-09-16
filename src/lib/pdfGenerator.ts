import type { jsPDF } from 'jspdf';
import { type Bird, type FarmSettings } from './AppContext';
import { calculateExactAge } from './utils';

// Converte URL remota ou blob para Base64 para ser incorporada no jsPDF
async function getImageBase64(urlOrBase64?: string): Promise<string | null> {
  if (!urlOrBase64) return null;
  if (urlOrBase64.startsWith('data:image/')) return urlOrBase64;
  try {
    const res = await fetch(urlOrBase64);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Erro ao converter foto para o PDF:', err);
    return null;
  }
}

interface BirdPdfOptions {
  bird: Bird;
  farmSettings: FarmSettings;
  pai?: Bird | null;
  mae?: Bird | null;
  inbreeding?: number | null;
}

export async function generateBirdPdf({
  bird,
  farmSettings,
  pai,
  mae,
  inbreeding,
}: BirdPdfOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  // A4 = 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Paleta de Cores
  const darkBg = [18, 18, 24] as const;
  const gold = [245, 158, 11] as const;
  const mutedText = [120, 120, 140] as const;
  const borderGrey = [225, 228, 234] as const;
  const cardBg = [248, 249, 251] as const;
  const isMale = bird.sexo === 'Macho';

  // 1. HEADER (Faixa Superior Escura Sofisticada)
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Linha dourada de destaque
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Título do Criatório
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFontSize(16);
  const farmName = (farmSettings.name || 'CRIATÓRIO ELITE').toUpperCase();
  doc.text(farmName, margin, 14);

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 205, 215);
  doc.setFontSize(8.5);
  doc.text('FICHA TÉCNICA ZOOTÉCNICA & REGISTRO GENÉTICO', margin, 20);

  // Informações de Contato do Criador (à direita no cabeçalho)
  doc.setFontSize(8);
  doc.setTextColor(180, 185, 195);
  const phoneText = farmSettings.phone ? `Contato: ${farmSettings.phone}` : '';
  const emailText = farmSettings.email ? `E-mail: ${farmSettings.email}` : '';

  let contactY = 14;
  if (phoneText) {
    doc.text(phoneText, pageWidth - margin, contactY, { align: 'right' });
    contactY += 4.5;
  }
  if (emailText) {
    doc.text(emailText, pageWidth - margin, contactY, { align: 'right' });
  }

  // 2. IDENTIFICAÇÃO PRINCIPAL DA AVE
  let currentY = 44;

  // Box principal da Ave
  const photoWidth = 58;
  const photoHeight = 58;
  const infoX = margin + photoWidth + 8;
  const infoWidth = contentWidth - photoWidth - 8;

  // Fundo cinza suave para a área da ave
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, currentY, contentWidth, photoHeight + 6, 3, 3, 'F');
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(margin, currentY, contentWidth, photoHeight + 6, 3, 3, 'S');

  // Foto da Ave
  const mainPhotoUrl = bird.imagem || bird.imagens?.[0];
  const photoBase64 = await getImageBase64(mainPhotoUrl);

  const photoBoxX = margin + 3;
  const photoBoxY = currentY + 3;

  if (photoBase64) {
    try {
      doc.addImage(photoBase64, 'JPEG', photoBoxX, photoBoxY, photoWidth, photoHeight, undefined, 'FAST');
      doc.setDrawColor(gold[0], gold[1], gold[2]);
      doc.setLineWidth(0.6);
      doc.rect(photoBoxX, photoBoxY, photoWidth, photoHeight, 'S');
    } catch {
      drawPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoWidth, photoHeight, isMale);
    }
  } else {
    drawPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoWidth, photoHeight, isMale);
  }

  // Dados da Ave ao Lado da Foto
  let textY = currentY + 9;

  // Anilha em Destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 32);
  doc.text(bird.anilha || 'SEM ANILHA', infoX, textY);

  // Badge de Sexo ao lado da anilha
  const anilhaTextWidth = doc.getTextWidth(bird.anilha || 'SEM ANILHA');
  const badgeX = infoX + anilhaTextWidth + 4;
  const badgeColor = isMale ? [37, 99, 235] : [219, 39, 119];
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(badgeX, textY - 5.5, 20, 6.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isMale ? 'MACHO' : 'FÊMEA', badgeX + 10, textY - 1.2, { align: 'center' });

  // Nome da Ave
  textY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(70, 75, 85);
  doc.text(bird.nome ? `"${bird.nome}"` : '(Nome não informado)', infoX, textY);

  // Grade de Detalhes
  textY += 7;
  doc.setFontSize(8.5);

  const col1X = infoX;
  const col2X = infoX + infoWidth / 2;

  // Linha 1: Raça | Baia
  drawField(doc, 'RAÇA / LINHAGEM', bird.raca || 'Não definida', col1X, textY);
  drawField(doc, 'BAIA / LOCALIZAÇÃO', bird.baia ? `Baia ${bird.baia}` : 'Não informada', col2X, textY);

  // Linha 2: Nascimento & Idade | Status
  textY += 9;
  const exactAge = bird.dataNascimento ? calculateExactAge(bird.dataNascimento) : 'Não informada';
  const nascFormatted = bird.dataNascimento ? new Date(bird.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  const nascText = nascFormatted ? `${nascFormatted} (${exactAge})` : exactAge;

  drawField(doc, 'DATA DE NASCIMENTO / IDADE', nascText, col1X, textY);
  drawField(doc, 'STATUS NO PLANTEL', bird.status || 'Ativo', col2X, textY);

  // Linha 3: Peso | Origem
  textY += 9;
  drawField(doc, 'PESO REGISTRADO', bird.peso ? `${bird.peso} kg` : 'Não registrado', col1X, textY);
  drawField(doc, 'ORIGEM DA AVE', bird.origem || 'Criatório', col2X, textY);

  currentY += photoHeight + 12;

  // 3. GENEALOGIA E PEDIGREE
  const inbreedingStr = inbreeding !== undefined && inbreeding !== null && inbreeding > 0 
    ? ` • Consanguinidade F: ${(inbreeding * 100).toFixed(1)}%` 
    : '';
  drawSectionHeader(doc, `GENEALOGIA & PEDIGREE (PAIS)${inbreedingStr}`, margin, currentY, contentWidth);
  currentY += 8;

  const pedBoxWidth = (contentWidth - 6) / 2;
  const pedBoxHeight = 32;

  // Box do PAI (Macho)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, currentY, pedBoxWidth, pedBoxHeight, 2.5, 2.5, 'F');
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, pedBoxWidth, pedBoxHeight, 2.5, 2.5, 'S');

  // Faixa do Pai
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin, currentY, pedBoxWidth, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('🐓 PAI (REPRODUTOR)', margin + 4, currentY + 4.2);

  // Conteúdo do Pai
  doc.setFontSize(8.5);
  if (bird.isPaiExterno && bird.paiId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 32);
    doc.text(`Ave Externa: ${bird.paiId}`, margin + 4, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Genética introduzida externamente', margin + 4, currentY + 18);
  } else if (pai) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 32);
    doc.text(`Anilha: ${pai.anilha}`, margin + 4, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`Nome: ${pai.nome || 'Sem nome'}`, margin + 4, currentY + 17);
    doc.text(`Raça: ${pai.raca || 'Não informada'}`, margin + 4, currentY + 22);
    if (pai.baia) doc.text(`Baia: ${pai.baia}`, margin + 4, currentY + 27);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Não vinculado ou não informado', margin + 4, currentY + 16);
  }

  // Box da MÃE (Fêmea)
  const maeBoxX = margin + pedBoxWidth + 6;
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(maeBoxX, currentY, pedBoxWidth, pedBoxHeight, 2.5, 2.5, 'F');
  doc.setDrawColor(219, 39, 119);
  doc.setLineWidth(0.4);
  doc.roundedRect(maeBoxX, currentY, pedBoxWidth, pedBoxHeight, 2.5, 2.5, 'S');

  // Faixa da Mãe
  doc.setFillColor(219, 39, 119);
  doc.roundedRect(maeBoxX, currentY, pedBoxWidth, 6, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('🐔 MÃE (MATRIZ)', maeBoxX + 4, currentY + 4.2);

  // Conteúdo da Mãe
  doc.setFontSize(8.5);
  if (bird.isMaeExterno && bird.maeId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 32);
    doc.text(`Ave Externa: ${bird.maeId}`, maeBoxX + 4, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Genética introduzida externamente', maeBoxX + 4, currentY + 18);
  } else if (mae) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 32);
    doc.text(`Anilha: ${mae.anilha}`, maeBoxX + 4, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(`Nome: ${mae.nome || 'Sem nome'}`, maeBoxX + 4, currentY + 17);
    doc.text(`Raça: ${mae.raca || 'Não informada'}`, maeBoxX + 4, currentY + 22);
    if (mae.baia) doc.text(`Baia: ${mae.baia}`, maeBoxX + 4, currentY + 27);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Não vinculada ou não informada', maeBoxX + 4, currentY + 16);
  }

  currentY += pedBoxHeight + 8;

  // 4. CONTROLE SANITÁRIO (VACINAS) & MANEJO
  drawSectionHeader(doc, 'CONTROLE SANITÁRIO & VACINAÇÃO', margin, currentY, contentWidth);
  currentY += 8;

  const vacinasText = bird.vacinas?.trim() || 'Nenhuma vacina registrada até o momento.';
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2.5, 2.5, 'F');
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2.5, 2.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 55, 65);
  const vacinasLines = doc.splitTextToSize(vacinasText, contentWidth - 8);
  doc.text(vacinasLines, margin + 4, currentY + 6);

  currentY += 28;

  // 5. OBSERVAÇÕES ZOOTÉCNICAS / CARACTERÍSTICAS
  if (bird.observacoes?.trim()) {
    drawSectionHeader(doc, 'ANOTAÇÕES GENÉTICAS & OBSERVAÇÕES ZOOTÉCNICAS', margin, currentY, contentWidth);
    currentY += 8;

    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'F');
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 55, 65);
    const obsLines = doc.splitTextToSize(bird.observacoes.trim(), contentWidth - 8);
    doc.text(obsLines, margin + 4, currentY + 6);

    currentY += 32;
  }

  // 6. RODAPÉ DE AUTENTICIDADE
  const footerY = pageHeight - 16;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  const emitDate = new Date().toLocaleString('pt-BR');
  doc.text(`Documento emitido em ${emitDate} via Mura Manager - Sistema Especializado de Gestão de Plantel`, margin, footerY);
  doc.text(`Ficha Técnica Oficial • Anilha: ${bird.anilha}`, pageWidth - margin, footerY, { align: 'right' });

  return doc.output('blob');
}

export async function generateLotPdf({
  lot,
  lotType,
  farmSettings,
  birdsList = [],
}: {
  lot: any;
  lotType: 'cruzador' | 'incubacao' | 'engorda' | 'postura' | 'pintinhos' | 'crescimento';
  farmSettings: FarmSettings;
  birdsList?: Bird[];
}): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const darkBg = [18, 18, 24] as const;
  const gold = [245, 158, 11] as const;
  const borderGrey = [225, 228, 234] as const;
  const cardBg = [248, 249, 251] as const;

  // Header
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, 36, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFontSize(16);
  doc.text((farmSettings.name || 'CRIATÓRIO ELITE').toUpperCase(), margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 205, 215);
  doc.setFontSize(8.5);
  const typeLabels = {
    cruzador: 'RELATÓRIO DE LOTE - CRUZADOR & REPRODUÇÃO',
    incubacao: 'RELATÓRIO DE LOTE - INCUBAÇÃO & ECLOSÃO',
    engorda: 'RELATÓRIO DE LOTE - RECRIA & ENGORDA',
    postura: 'RELATÓRIO DE LOTE - PRODUÇÃO DE OVOS & POSTURA',
    pintinhos: 'RELATÓRIO DE LOTE - PINTINHOS & MATERNIDADE',
    crescimento: 'RELATÓRIO DE LOTE - FASE DE CRESCIMENTO',
  };
  doc.text(typeLabels[lotType] || 'RELATÓRIO DE LOTE', margin, 20);

  // Info lote
  let currentY = 46;
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, 'F');
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 32);
  const lotTitle = lot.cageName || lot.numeroLote || (lot.baia ? `Lote Baia ${lot.baia}` : 'Lote sem nome');
  doc.text(lotTitle, margin + 5, currentY + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let fieldY = currentY + 18;

  const col1X = margin + 5;
  const col2X = margin + contentWidth / 2;

  drawField(doc, 'BAIA / LOCALIZAÇÃO', lot.baia ? `Baia ${lot.baia}` : 'Não informada', col1X, fieldY);
  drawField(doc, 'DATA DE INÍCIO', lot.dataInicio ? new Date(lot.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada', col2X, fieldY);

  fieldY += 9;
  drawField(doc, 'RAÇA / LINHAGEM', lot.raca || 'Mista / Cruzamento', col1X, fieldY);
  drawField(doc, 'STATUS', lot.status || 'Ativo', col2X, fieldY);

  currentY += 46;

  // Detalhes conforme o tipo de lote
  if (lotType === 'cruzador') {
    drawSectionHeader(doc, 'COMPOSIÇÃO DO CRUZADOR (REPRODUTORES & MATRIZES)', margin, currentY, contentWidth);
    currentY += 8;

    const macho = birdsList.find(b => b.id === lot.machoId);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, currentY, contentWidth, 30, 2.5, 2.5, 'F');
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(margin, currentY, contentWidth, 30, 2.5, 2.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text(`🐓 MACHO REPRODUTOR: ${macho ? `${macho.anilha} (${macho.nome || macho.raca || 'Sem nome'})` : 'Não definido'}`, margin + 4, currentY + 8);

    doc.setTextColor(219, 39, 119);
    const femeaIds: string[] = lot.femeaIds || (lot.femeaId ? [lot.femeaId] : []);
    const femeas = birdsList.filter(b => femeaIds.includes(b.id));
    const femeasStr = femeas.length > 0 
      ? femeas.map(f => `${f.anilha}${f.nome ? ` (${f.nome})` : ''}`).join(', ')
      : 'Nenhuma matriz vinculada';
    
    doc.text(`🐔 MATRIZES (${femeaIds.length}):`, margin + 4, currentY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 55, 65);
    const femeaLines = doc.splitTextToSize(femeasStr, contentWidth - 8);
    doc.text(femeaLines, margin + 4, currentY + 22);

    currentY += 38;
  } else if (lotType === 'incubacao') {
    drawSectionHeader(doc, 'MÉTRICAS DE INCUBAÇÃO & OVOSCOPIA', margin, currentY, contentWidth);
    currentY += 8;

    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'F');
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'S');

    drawField(doc, 'QUANTIDADE DE OVOS INICIAL', String(lot.quantidadeOvos || 0), margin + 4, currentY + 8);
    drawField(doc, 'OVOSCOPIA 1 (7 DIAS)', lot.ovoscopia1Realizada ? `Realizada (${lot.ovosDescartados1 || 0} descartados)` : 'Pendente', margin + contentWidth / 2, currentY + 8);
    drawField(doc, 'OVOSCOPIA 2 (14 DIAS)', lot.ovoscopia2Realizada ? `Realizada (${lot.ovosDescartados2 || 0} descartados)` : 'Pendente', margin + 4, currentY + 18);
    drawField(doc, 'STATUS DE ECLOSÃO', lot.eclodido ? 'Eclodido' : 'Em processo', margin + contentWidth / 2, currentY + 18);

    currentY += 34;
  } else if (lotType === 'postura') {
    drawSectionHeader(doc, 'PRODUÇÃO & RENDIMENTO DO LOTE DE POSTURA', margin, currentY, contentWidth);
    currentY += 8;

    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'F');
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'S');

    const totalF = Math.max(lot.qtdFemeas || 0, lot.femeasIds?.length || 0);
    const cadastradasF = lot.femeasIds?.length || 0;
    const avulsasF = Math.max(0, totalF - cadastradasF);

    drawField(doc, 'TOTAL DE POEDEIRAS', `${totalF} fêmeas (${cadastradasF} id. + ${avulsasF} av.)`, margin + 4, currentY + 8);
    drawField(doc, 'META DIÁRIA DE OVOS', lot.expectativaDiaria ? `${lot.expectativaDiaria} ovos/dia` : 'Não informada', margin + contentWidth / 2, currentY + 8);
    drawField(doc, 'PREÇO VENDA DÚZIA', lot.precoDuzia ? `R$ ${Number(lot.precoDuzia).toFixed(2)}` : 'Não informado', margin + 4, currentY + 18);
    drawField(doc, 'CUSTO ESTIMADO DÚZIA', lot.custoDuzia ? `R$ ${Number(lot.custoDuzia).toFixed(2)}` : 'Não informado', margin + contentWidth / 2, currentY + 18);

    currentY += 34;
  } else {
    // engorda, pintinhos, crescimento
    const labelHeader = lotType === 'pintinhos' 
      ? 'DESEMPENHO DO LOTE DE PINTINHOS' 
      : lotType === 'crescimento' 
      ? 'DESEMPENHO DO LOTE DE CRESCIMENTO' 
      : 'DESEMPENHO ZOOTÉCNICO & PESAGENS';
    drawSectionHeader(doc, labelHeader, margin, currentY, contentWidth);
    currentY += 8;

    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'F');
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2.5, 2.5, 'S');

    const totalAves = lot.avesIds?.length || lot.qtdAves || 0;
    drawField(doc, 'QUANTIDADE DE AVES', `${totalAves} aves`, margin + 4, currentY + 8);
    drawField(doc, 'PESO MÉDIO INICIAL', lot.pesoMedioInicial || 'Não informado', margin + contentWidth / 2, currentY + 8);
    drawField(doc, 'PESO META DE ABATE', lot.pesoMeta || 'Não informado', margin + 4, currentY + 18);
    drawField(doc, 'STATUS DO LOTE', lot.status || 'Em andamento', margin + contentWidth / 2, currentY + 18);

    currentY += 34;
  }

  // Observações se houver
  if (lot.observacao || lot.observacoes) {
    drawSectionHeader(doc, 'OBSERVAÇÕES DO LOTE', margin, currentY, contentWidth);
    currentY += 8;
    const obsText = (lot.observacao || lot.observacoes || '').trim();
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(margin, currentY, contentWidth, 20, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 55, 65);
    const obsLines = doc.splitTextToSize(obsText, contentWidth - 8);
    doc.text(obsLines, margin + 4, currentY + 6);
  }

  // Rodapé
  const footerY = pageHeight - 16;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 140);
  const emitDate = new Date().toLocaleString('pt-BR');
  doc.text(`Documento emitido em ${emitDate} via Mura Manager`, margin, footerY);
  doc.text(`Ficha do Lote: ${lotTitle}`, pageWidth - margin, footerY, { align: 'right' });

  return doc.output('blob');
}

// Helpers de desenho
function drawField(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(130, 135, 145);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 32);
  doc.text(value, x, y + 4);
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number) {
  doc.setFillColor(245, 158, 11);
  doc.rect(x, y - 1, 3, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 32);
  doc.text(title, x + 5, y + 3);

  doc.setDrawColor(230, 233, 240);
  doc.setLineWidth(0.3);
  doc.line(x + 5 + doc.getTextWidth(title) + 3, y + 2, x + width, y + 2);
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number, isMale: boolean) {
  doc.setFillColor(235, 238, 245);
  doc.rect(x, y, w, h, 'F');
  doc.setDrawColor(200, 205, 215);
  doc.rect(x, y, w, h, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(160, 165, 175);
  doc.text(isMale ? '🐓' : '🐔', x + w / 2, y + h / 2 + 2, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text('SEM FOTO REGISTRADA', x + w / 2, y + h - 5, { align: 'center' });
}

// Função de Compartilhamento Nativo com Fallback para Download
export async function sharePdfFile(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'application/pdf' });

  // Tenta compartilhamento nativo móvel via Web Share API
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title,
        text,
      });
      return 'shared';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Usuário cancelou a janela de compartilhamento
        return 'shared';
      }
      console.warn('Falha no navigator.share, acionando fallback de download:', err);
    }
  }

  // Fallback: Download direto do arquivo PDF
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded';
}
