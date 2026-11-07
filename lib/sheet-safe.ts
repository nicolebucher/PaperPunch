// Werte, die ins Google Sheet gehen (Apps-Script-Webhook), dürfen nicht als Formel starten: Ein Text wie
// "=IMPORTXML(…)" würde sonst beim Einfügen ausgeführt (Formel-Injection, Security-Review M4). Wie in Excel/Sheets
// üblich bekommt so ein Text ein Apostroph davor: Er wird dann als Text angezeigt, das Apostroph selbst nicht.

const FORMULA_START = /^[=+\-@\t\r]/;

export function sheetSafeText(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value;
}

/** Alle Text-Werte (auch in Listen) sheet-sicher machen; Zahlen, Booleans usw. bleiben unverändert. */
export function sheetSafeRow<T extends Record<string, unknown>>(row: T): T {
  const fix = (v: unknown): unknown => (typeof v === "string" ? sheetSafeText(v) : Array.isArray(v) ? v.map(fix) : v);
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, fix(v)])) as T;
}
