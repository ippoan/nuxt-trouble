import { TICKET_CATEGORIES } from '~/types'

/** API field options for header mapping dropdown */
export const API_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: '__skip__', label: 'スキップ' },
  { value: 'category', label: 'カテゴリ (category)' },
  { value: 'occurred_date', label: '発生日 (occurred_date)' },
  { value: 'company_name', label: '会社名 (company_name)' },
  { value: 'office_name', label: '営業所名 (office_name)' },
  { value: 'department', label: '部署 (department)' },
  { value: 'person_name', label: '氏名 (person_name)' },
  { value: 'registration_number', label: '登録番号 (registration_number)' },
  { value: 'vehicle_number', label: '車両番号 (vehicle_number)' },
  { value: 'location', label: '場所 (location)' },
  { value: 'description', label: '内容 (description)' },
  { value: 'progress_notes', label: '進捗状況 (progress_notes)' },
  { value: 'title', label: 'タイトル (title)' },
  { value: 'allowance', label: '手当等 (allowance)' },
  { value: 'damage_amount', label: '損害額 (damage_amount)' },
  { value: 'compensation_amount', label: '補償額 (compensation_amount)' },
  { value: 'confirmation_notice', label: '確認書 (confirmation_notice)' },
  { value: 'disciplinary_content', label: '処分検討内容 (disciplinary_content)' },
  { value: 'disciplinary_action', label: '処分内容 (disciplinary_action)' },
  { value: 'road_service_cost', label: 'ロードサービス費 (road_service_cost)' },
  { value: 'counterparty', label: '相手方 (counterparty)' },
  { value: 'counterparty_insurance', label: '相手方保険 (counterparty_insurance)' },
  { value: 'due_date', label: '対応期限 (due_date)' },
] as const

/** Known Excel header → API field mapping */
const HEADER_MAP: Record<string, string> = {
  '発生日': 'occurred_date',
  '所属会社名': 'company_name',
  '営業所名': 'office_name',
  '運行課': 'department',
  '当事者名': 'person_name',
  '登録番号': 'registration_number',
  '事故等分類': 'category',
  '発生場所': 'location',
  '内容': 'description',
  '進捗状況': 'progress_notes',
  '手当等': 'allowance',
  '損害額': 'damage_amount',
  '賠償額': 'compensation_amount',
  '確認書': 'confirmation_notice',
  '処分検討内容': 'disciplinary_content',
  '処分内容': 'disciplinary_action',
  'ロードサービス費用': 'road_service_cost',
  '相手': 'counterparty',
  '相手保険会社': 'counterparty_insurance',
  // skip
  'リンク': '__skip__',
  'No.': '__skip__',
  'No': '__skip__',
  '№': '__skip__',
  '発生時間': '__skip__',
  '賞罰委員会内容': 'disciplinary_content',
  '決定通知書': '__skip__',
}

const NUMERIC_FIELDS = new Set(['damage_amount', 'compensation_amount', 'road_service_cost'])
const DATE_FIELDS = new Set(['occurred_date', 'due_date'])

export interface ColumnMapping {
  excelHeader: string
  apiField: string
  sampleValue: string
}

/**
 * Parse TSV text from Excel clipboard.
 * Handles quoted fields with embedded newlines (RFC 4180 style).
 * Excel wraps cells containing newlines in double quotes.
 */
export function parseTsv(text: string): { headers: string[]; rows: string[][] } {
  const allRows = parseTsvQuoted(text.trim())
  if (allRows.length === 0) return { headers: [], rows: [] }

  const firstRow = allRows[0]
  if (!firstRow) return { headers: [], rows: [] }

  // Detect header row: check if first row contains known header keywords
  const knownHeaders = Object.keys(HEADER_MAP)
  const matchCount = firstRow.filter(cell =>
    knownHeaders.some(h => cell.trim().includes(h)),
  ).length

  if (matchCount >= 3) {
    return {
      headers: firstRow.map(c => c.trim()),
      rows: allRows.slice(1).filter(r => r.some(c => c.trim() !== '')),
    }
  }

  // No header row detected — generate generic column names
  const headers = firstRow.map((_, i) => `列${i + 1}`)
  return {
    headers,
    rows: allRows.filter(r => r.some(c => c.trim() !== '')),
  }
}

/** Parse TSV handling double-quoted fields with embedded newlines */
function parseTsvQuoted(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        currentField += ch
        i++
      }
    } else {
      if (ch === '"' && currentField === '') {
        inQuotes = true
        i++
      } else if (ch === '\t') {
        currentRow.push(currentField)
        currentField = ''
        i++
      } else if (ch === '\n' || (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n')) {
        currentRow.push(currentField)
        currentField = ''
        if (currentRow.some(c => c.trim() !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        i += ch === '\r' ? 2 : 1
      } else if (ch === '\r') {
        currentRow.push(currentField)
        currentField = ''
        if (currentRow.some(c => c.trim() !== '')) {
          rows.push(currentRow)
        }
        currentRow = []
        i++
      } else {
        currentField += ch
        i++
      }
    }
  }

  currentRow.push(currentField)
  if (currentRow.some(c => c.trim() !== '')) {
    rows.push(currentRow)
  }

  return rows
}

/** Auto-guess API field for a given Excel header */
export function guessApiField(header: string): string {
  const trimmed = header.trim()
  if (HEADER_MAP[trimmed]) return HEADER_MAP[trimmed]

  // Partial match
  for (const [key, value] of Object.entries(HEADER_MAP)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return value
  }

  return '__skip__'
}

/** Build initial column mappings from parsed headers */
export function buildColumnMappings(headers: string[], firstRow: string[]): ColumnMapping[] {
  return headers.map((h, i) => ({
    excelHeader: h,
    apiField: guessApiField(h),
    sampleValue: firstRow[i]?.trim() ?? '',
  }))
}

/** Convert date string: YYYY/MM/DD or YYYY年MM月DD日 → YYYY-MM-DD */
function convertDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  // YYYY/MM/DD
  const slash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (slash && slash[1] && slash[2] && slash[3]) {
    return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`
  }

  // YYYY年MM月DD日
  const jp = trimmed.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (jp && jp[1] && jp[2] && jp[3]) {
    return `${jp[1]}-${jp[2].padStart(2, '0')}-${jp[3].padStart(2, '0')}`
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  return null
}

/** Convert parsed rows to ticket payloads using column mappings */
export function rowsToTickets(
  rows: string[][],
  columns: ColumnMapping[],
): { ticket: Record<string, unknown>; warnings: string[] }[] {
  const categories = TICKET_CATEGORIES as readonly string[]

  return rows.map((row, rowIdx) => {
    const ticket: Record<string, unknown> = {}
    const warnings: string[] = []

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const mapping = columns[colIdx]!
      const value = row[colIdx]?.trim() ?? ''
      if (!value) continue

      const field = mapping.apiField
      if (field === '__skip__') continue

      if (DATE_FIELDS.has(field)) {
        const converted = convertDate(value)
        if (!converted) {
          warnings.push(`行${rowIdx + 1}: 日付変換失敗 "${value}"`)
        }
        ticket[field] = converted
      } else if (NUMERIC_FIELDS.has(field)) {
        const num = parseFloat(value.replace(/,/g, ''))
        ticket[field] = isNaN(num) ? null : num
      } else if (field === 'category') {
        ticket[field] = value
        if (!categories.includes(value)) {
          warnings.push(`行${rowIdx + 1}: カテゴリ "${value}" は定義済みカテゴリに一致しません`)
        }
      } else {
        ticket[field] = value
      }
    }

    // Ensure category exists (required field)
    if (!ticket.category) {
      ticket.category = 'その他'
      warnings.push(`行${rowIdx + 1}: カテゴリ未指定のため「その他」を設定`)
    }

    return { ticket, warnings }
  })
}
