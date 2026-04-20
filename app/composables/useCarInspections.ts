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
    validPeriodExpirdate: (raw.ValidPeriodExpirdate as string | undefined) || '',
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
