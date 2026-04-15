/**
 * Strips protocol, www., trailing slashes, ports, and paths
 * to return a bare lowercase domain.
 *
 * e.g. "https://www.austinmotors.com/inventory/" → "austinmotors.com"
 */
export function normalizeDomain(raw: string): string {
  let d = raw.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.replace(/[:/].*$/, '') // strip port, path, query
  return d
}
