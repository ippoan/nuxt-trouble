function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDatetimeLocalInput(
  iso: string | null | undefined,
  fallbackDate?: string | null | undefined,
): string {
  if (iso) {
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
  if (fallbackDate) {
    const ymd = String(fallbackDate).substring(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return `${ymd}T00:00`
  }
  return ''
}

export function fromDatetimeLocalInput(
  v: string | null | undefined,
): { occurred_at: string; occurred_date: string } | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return {
    occurred_at: d.toISOString(),
    occurred_date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  }
}

export function formatOccurredAt(
  occurredAt: string | null | undefined,
  occurredDate?: string | null | undefined,
): string {
  if (occurredAt) {
    const d = new Date(occurredAt)
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
  if (occurredDate) return String(occurredDate).substring(0, 10)
  return '-'
}
