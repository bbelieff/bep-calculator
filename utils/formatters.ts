export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number, unit?: string): string => {
  const formatted = new Intl.NumberFormat('ko-KR').format(value);
  return unit ? `${formatted}${unit}` : formatted;
};

export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
}; 