function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDatetimeLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
