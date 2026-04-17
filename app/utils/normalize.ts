export function toHalfWidth(s: string): string {
  if (!s) return s
  return s
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[－ー]/g, '-')
}
