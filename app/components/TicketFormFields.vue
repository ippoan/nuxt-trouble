<script setup lang="ts">
import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee, TroubleFieldLayout } from '~/types'
import { toHalfWidth } from '~/utils/normalize'
import { buildCategoryOptions, buildOfficeOptions, buildProgressOptions, buildEmployeeOptions } from '~/utils/ticketFieldOptions'
import { resolveFieldLayout, groupFieldsBySection, widthColSpanClass } from '~/utils/ticketFieldLayout'

const model = defineModel<Record<string, unknown>>({ required: true })

const props = defineProps<{
  mode: 'create' | 'edit'
  categories?: TroubleCategory[]
  offices?: TroubleOffice[]
  progressStatuses?: TroubleProgressStatus[]
  employees?: Employee[]
  fieldLayout?: TroubleFieldLayout | null
}>()

// mode === 'edit' で親が listen すると、各フィールド確定時 (select/checkbox/日付は
// 即時、text/textarea は blur 時) に対象キーを通知する。親はこれを使って
// フィールド単位で自動保存できる (new.vue のような一括作成フローでは無視すればよい)。
const commitEmit = defineEmits<{
  (e: 'field-committed', keys: string[]): void
}>()

function commit(...keys: string[]) {
  commitEmit('field-committed', keys)
}

const {
  load: loadCarInspections,
  lookupByRegistration: lookupCarInspection,
  registrationOptions: carInspectionRegistrations,
} = useCarInspections()

onMounted(() => {
  loadCarInspections()
})

const carInspectionMatch = computed(() => {
  const reg = model.value.registration_number as string | undefined
  return reg ? lookupCarInspection(reg) : undefined
})

function formatExpiry(v: string): string {
  if (!v) return '-'
  return v.length > 10 ? v.substring(0, 10) : v
}

const categoryOptions = computed(() => buildCategoryOptions(props.categories))
const officeOptions = computed(() => buildOfficeOptions(props.offices))
const progressOptions = computed(() => buildProgressOptions(props.progressStatuses))
const employeeOptions = computed(() => buildEmployeeOptions(props.employees))

function selectOptionsFor(key: string) {
  if (key === 'category') return categoryOptions.value
  if (key === 'office_name') return officeOptions.value
  if (key === 'progress_notes') return progressOptions.value
  return []
}

const groupedFields = computed(() => groupFieldsBySection(resolveFieldLayout(props.fieldLayout)))

function fieldValue(key: string): unknown {
  return (model.value as Record<string, unknown>)[key]
}

function update(key: string, value: unknown) {
  model.value = { ...model.value, [key]: value }
}

function updateNumber(key: string, value: string | number) {
  update(key, value === '' || value == null ? null : Number(value))
}

function updateDatetime(key: string, value: string | undefined) {
  update(key, value ?? '')
  commit(key)
}

function updateDate(key: string, value: string | undefined) {
  update(key, value ? new Date(value).toISOString() : null)
  commit(key)
}

function updateEmployee(employeeId: string) {
  const emp = props.employees?.find(e => e.id === employeeId)
  if (emp) {
    model.value = { ...model.value, person_name: emp.name, person_id: emp.id }
    commit('person_name', 'person_id')
  }
}

// Back-fill person_id from person_name for legacy tickets (person_id=null).
// Skips when person_is_external=true — external parties are never in employee master.
watch(
  () => [props.employees, model.value.person_name, model.value.person_id, model.value.person_is_external] as const,
  () => {
    if (model.value.person_is_external) return
    if (model.value.person_id || !model.value.person_name) return
    const match = props.employees?.find(e => e.name === model.value.person_name)
    if (match) {
      model.value = { ...model.value, person_id: match.id }
    }
  },
  { immediate: true },
)

function toggleExternal(checked: boolean) {
  // Switching to external: drop person_id, keep person_name as free text.
  // Switching to internal: clear both and let user select from dropdown.
  if (checked) {
    model.value = { ...model.value, person_is_external: true, person_id: null }
  } else {
    model.value = { ...model.value, person_is_external: false, person_id: null, person_name: '' }
  }
  commit('person_is_external', 'person_id', 'person_name')
}
</script>

<template>
  <div class="space-y-6">
    <fieldset v-for="group in groupedFields" :key="group.section" class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ group.section }}</legend>

      <div class="grid grid-cols-6 gap-4">
        <div v-for="field in group.fields" :key="field.key" :class="widthColSpanClass(field.width)">
          <UFormField :label="field.label" :required="field.key === 'category'">
            <!-- select (category / office_name / progress_notes) -->
            <USelect
              v-if="field.type === 'select'"
              class="w-full"
              :model-value="(fieldValue(field.key) as string) || ''"
              :items="selectOptionsFor(field.key)"
              :placeholder="`${field.label}を選択`"
              :disabled="selectOptionsFor(field.key).length === 0"
              @update:model-value="update(field.key, $event); commit(field.key)"
            />

            <!-- text: registration_number (datalist 付き、半角変換、車検証マスタ照合) -->
            <template v-else-if="field.key === 'registration_number'">
              <UInput
                class="w-full"
                :model-value="(fieldValue('registration_number') as string) || ''"
                placeholder="登録番号 (車検証と照合)"
                list="ticket-form-registrations"
                @update:model-value="(v: string | number) => update('registration_number', toHalfWidth(String(v ?? '')))"
                @blur="commit('registration_number')"
              />
              <datalist id="ticket-form-registrations">
                <option v-for="reg in carInspectionRegistrations" :key="reg" :value="reg" />
              </datalist>
            </template>

            <!-- text (汎用) -->
            <UInput
              v-else-if="field.type === 'text'"
              class="w-full"
              :model-value="(fieldValue(field.key) as string) || ''"
              :placeholder="field.label"
              @update:model-value="update(field.key, $event)"
              @blur="commit(field.key)"
            />

            <!-- textarea -->
            <UTextarea
              v-else-if="field.type === 'textarea'"
              class="w-full"
              :model-value="(fieldValue(field.key) as string) || ''"
              :placeholder="field.label"
              :rows="field.key === 'description' ? 4 : 2"
              @update:model-value="update(field.key, $event)"
              @blur="commit(field.key)"
            />

            <!-- number -->
            <UInput
              v-else-if="field.type === 'number'"
              class="w-full"
              type="number"
              :model-value="String(fieldValue(field.key) ?? '')"
              placeholder="0"
              @update:model-value="updateNumber(field.key, $event)"
              @blur="commit(field.key)"
            />

            <!-- datetime (occurred_at) -->
            <YmdtInput
              v-else-if="field.type === 'datetime'"
              :model-value="(fieldValue(field.key) as string) || undefined"
              @update:model-value="(v: string | undefined) => updateDatetime(field.key, v)"
            />

            <!-- date (due_date) -->
            <YmdInput
              v-else-if="field.type === 'date'"
              :model-value="((fieldValue(field.key) as string) || '').slice(0, 10) || undefined"
              @update:model-value="(v: string | undefined) => updateDate(field.key, v)"
            />

            <!-- person (氏名: 外部/従業員) -->
            <div v-else-if="field.type === 'person'" class="space-y-1">
              <UInput
                v-if="model.person_is_external"
                class="w-full"
                :model-value="(model.person_name as string) || ''"
                placeholder="外部当事者名（手入力）"
                @update:model-value="update('person_name', $event)"
                @blur="commit('person_name')"
              />
              <USelect
                v-else
                class="w-full"
                :model-value="(model.person_id as string) || ''"
                :items="employeeOptions"
                placeholder="従業員を選択"
                :disabled="employeeOptions.length === 0"
                @update:model-value="updateEmployee($event as string)"
              />
              <label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="!!model.person_is_external"
                  class="rounded"
                  @change="toggleExternal(($event.target as HTMLInputElement).checked)"
                >
                外部/手入力（従業員マスタ外）
              </label>
            </div>
          </UFormField>

          <!-- 車検証マスタ一致情報 (登録番号フィールドの直後) -->
          <div
            v-if="field.key === 'registration_number' && model.registration_number"
            class="mt-2 rounded-md border p-3 text-xs"
            :class="carInspectionMatch
              ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40'
              : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900'"
          >
            <template v-if="carInspectionMatch">
              <div class="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                車検証マスタ: {{ carInspectionMatch.registrationNumber }}
              </div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span class="text-gray-500">所有者: </span>{{ carInspectionMatch.ownerName || '-' }}</div>
                <div><span class="text-gray-500">車種: </span>{{ carInspectionMatch.carName || '-' }}</div>
                <div><span class="text-gray-500">型式: </span>{{ carInspectionMatch.model || '-' }}</div>
                <div><span class="text-gray-500">車検満了日: </span>{{ formatExpiry(carInspectionMatch.validPeriodExpirdate) }}</div>
              </div>
            </template>
            <template v-else>
              車検証マスタに登録なし（入力値はそのまま保存されます）
            </template>
          </div>
        </div>
      </div>
    </fieldset>
  </div>
</template>
