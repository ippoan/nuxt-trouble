import { getCarInspectionsCurrent } from '~/utils/api'
import { toHalfWidth } from '~/utils/normalize'
import type { CarInspectionSummary } from '~/types'

function normalizeKey(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/[\uFF10-\uFF19]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, '')
    .toLowerCase()
}

// DB は ValidPeriodExpirdate を単一フィールドとしては持たず、
// TwodimensionCodeInfoValidPeriodExpirdate (YYMMDD, 2D barcode 由来) か
// ValidPeriodExpirdate{E,Y,M,D} (和暦) に分かれている。
// ここでは YYMMDD を 20YY-MM-DD に変換、無ければ 和暦フィールドを合成する。
function extractExpiry(raw: Record<string, unknown>): string {
  const yymmdd = (raw.TwodimensionCodeInfoValidPeriodExpirdate as string | undefined) || ''
  const m = /^(\d{2})(\d{2})(\d{2})$/.exec(yymmdd.trim())
  if (m) return `20${m[1]}-${m[2]}-${m[3]}`

  const era = (raw.ValidPeriodExpirdateE as string | undefined) || ''
  const y = (raw.ValidPeriodExpirdateY as string | undefined) || ''
  const mm = (raw.ValidPeriodExpirdateM as string | undefined) || ''
  const dd = (raw.ValidPeriodExpirdateD as string | undefined) || ''
  if (era && y && mm && dd) {
    return `${era}${y}年${mm}月${dd}日`
  }
  return ''
}

function toSummary(raw: Record<string, unknown>): CarInspectionSummary | null {
  const rawReg = (raw.EntryNoCarNo as string | undefined)
    || (raw.CarNo as string | undefined)
    || ''
  const reg = toHalfWidth(rawReg)
  if (!reg) return null
  return {
    registrationNumber: reg,
    ownerName: (raw.OwnerName as string | undefined)
      || (raw.OwnerOfficeName as string | undefined)
      || '',
    carName: (raw.CarName as string | undefined) || '',
    model: (raw.Model as string | undefined) || '',
    validPeriodExpirdate: extractExpiry(raw),
  }
}

// module-level shared state (singleton across all composable calls in the app)
const _data = ref<CarInspectionSummary[] | null>(null)
const _loading = ref(false)
const _loaded = ref(false)

const _lookupMap = computed(() => {
  const map = new Map<string, CarInspectionSummary>()
  for (const s of _data.value || []) {
    const key = normalizeKey(s.registrationNumber)
    if (key) map.set(key, s)
  }
  return map
})

const _registrationOptions = computed(() =>
  (_data.value || []).map(s => s.registrationNumber).filter(Boolean),
)

export function useCarInspections() {
  async function load() {
    if (_loaded.value || _loading.value) return
    _loading.value = true
    try {
      const res = await getCarInspectionsCurrent()
      const list: CarInspectionSummary[] = []
      for (const raw of res.carInspections) {
        const s = toSummary(raw)
        if (s) list.push(s)
      }
      _data.value = list
      _loaded.value = true
    } catch (e) {
      console.error('Failed to load car inspections:', e)
      _data.value = []
      _loaded.value = true
    } finally {
      _loading.value = false
    }
  }

  function lookupByRegistration(reg: string | null | undefined): CarInspectionSummary | undefined {
    const key = normalizeKey(reg)
    if (!key) return undefined
    return _lookupMap.value.get(key)
  }

  return {
    load,
    loading: _loading,
    data: _data,
    lookupByRegistration,
    registrationOptions: _registrationOptions,
  }
}
