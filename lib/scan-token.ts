/** Keep the scan code as a string. Never parse it as a number (leading zeros). */
export function normalizeScanToken(raw: string) {
  return raw.replace(/[\r\n\t ]/g, "");
}
