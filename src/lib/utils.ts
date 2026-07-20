/**
 * Calcula a idade exata de uma ave com base na data de nascimento
 * @param birthDateStr data de nascimento em formato ISO YYYY-MM-DD
 * @returns string formatada descrevendo a idade em dias, meses ou anos
 */
export function calculateExactAge(birthDateStr: string): string {
  if (!birthDateStr) return 'Não informada';
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  
  birthDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  
  const diffTime = today.getTime() - birthDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Data futura';
  if (diffDays < 30) return `${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
  
  const diffMonths = Math.floor(diffDays / 30.43);
  if (diffMonths < 12) {
    const remainingDays = Math.floor(diffDays % 30.43);
    return `${diffMonths} mês${diffMonths !== 1 ? 'es' : ''} ${remainingDays > 0 ? `e ${remainingDays} d` : ''}`;
  }
  
  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  return `${diffYears} ano${diffYears !== 1 ? 's' : ''} ${remainingMonths > 0 ? `e ${remainingMonths} m` : ''}`;
}
