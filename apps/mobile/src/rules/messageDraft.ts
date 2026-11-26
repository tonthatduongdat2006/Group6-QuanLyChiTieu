export function isValidParsedAmount(amountMinor: string): boolean {
  if (!/^\d+$/.test(amountMinor)) return false;
  return BigInt(amountMinor) > 0n;
}
