export function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integerPart, ...decimalParts] = cleaned.split('.');
  if (decimalParts.length === 0) return integerPart;
  return `${integerPart}.${decimalParts.join('')}`;
}

export function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, '');
}
