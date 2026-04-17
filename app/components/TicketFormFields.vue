<script setup lang="ts">
import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee } from '~/types'
import { TICKET_CATEGORIES } from '~/types'
import { toHalfWidth } from '~/utils/normalize'

const model = defineModel<Record<string, unknown>>({ required: true })

const props = defineProps<{
  mode: 'create' | 'edit'
  categories?: TroubleCategory[]
  offices?: TroubleOffice[]
  progressStatuses?: TroubleProgressStatus[]
  employees?: Employee[]
}>()

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

const categoryOptions = computed(() => {
  if (props.categories && props.categories.length > 0) {
    const dbNames = new Set(props.categories.map(c => c.name))
    const hardcoded = ([...TICKET_CATEGORIES] as string[]).filter(c => !dbNames.has(c))
    return [...props.categories.map(c => c.name), ...hardcoded].map(c => ({ label: c, value: c }))
  }
  return TICKET_CATEGORIES.map(c => ({ label: c, value: c as string }))
})

const officeOptions = computed(() => {
  if (!props.offices || props.offices.length === 0) return []
  return props.offices.map(o => ({ label: o.name, value: o.name }))
})

const progressOptions = computed(() => {
  if (!props.progressStatuses || props.progressStatuses.length === 0) return []
  return props.progressStatuses.map(p => ({ label: p.name, value: p.name }))
})

const employeeOptions = computed(() => {
  if (!props.employees || props.employees.length === 0) return []
  return props.employees.map(e => ({
    label: e.code ? `${e.name} (${e.code})` : e.name,
    value: e.id,
  }))
})

function update(key: string, value: unknown) {
  model.value = { ...model.value, [key]: value }
}

function updateEmployee(employeeId: string) {
  const emp = props.employees?.find(e => e.id === employeeId)
  if (emp) {
    model.value = { ...model.value, person_name: emp.name, person_id: emp.id }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 基本情報 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">基本情報</legend>

      <UFormField label="カテゴリ" required>
        <USelect
          :model-value="(model.category as string) || ''"
          :items="categoryOptions"
          placeholder="カテゴリを選択"
          @update:model-value="update('category', $event)"
        />
      </UFormField>

      <UFormField label="タイトル">
        <UInput
          :model-value="(model.title as string) || ''"
          placeholder="タイトル"
          @update:model-value="update('title', $event)"
        />
      </UFormField>

      <UFormField label="説明">
        <UTextarea
          :model-value="(model.description as string) || ''"
          placeholder="詳細な説明"
          :rows="4"
          @update:model-value="update('description', $event)"
        />
      </UFormField>

      <UFormField label="発生日">
        <UInput
          type="date"
          :model-value="(model.occurred_date as string) || ''"
          @update:model-value="update('occurred_date', $event)"
        />
      </UFormField>
    </fieldset>

    <!-- 関係者情報 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">関係者情報</legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="会社名">
          <UInput
            :model-value="(model.company_name as string) || ''"
            placeholder="会社名"
            @update:model-value="update('company_name', $event)"
          />
        </UFormField>

        <UFormField label="営業所名">
          <USelect
            :model-value="(model.office_name as string) || ''"
            :items="officeOptions"
            placeholder="営業所を選択"
            :disabled="officeOptions.length === 0"
            @update:model-value="update('office_name', $event)"
          />
        </UFormField>

        <UFormField label="部署名">
          <UInput
            :model-value="(model.department as string) || ''"
            placeholder="部署名"
            @update:model-value="update('department', $event)"
          />
        </UFormField>

        <UFormField label="氏名">
          <USelect
            :model-value="(model.person_id as string) || ''"
            :items="employeeOptions"
            placeholder="従業員を選択"
            :disabled="employeeOptions.length === 0"
            @update:model-value="updateEmployee($event as string)"
          />
        </UFormField>
      </div>
    </fieldset>

    <!-- 車両・場所 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">車両・場所</legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="車両番号">
          <UInput
            :model-value="(model.vehicle_number as string) || ''"
            placeholder="車両番号"
            @update:model-value="(v: string | number) => update('vehicle_number', toHalfWidth(String(v ?? '')))"
          />
        </UFormField>

        <UFormField label="登録番号">
          <UInput
            :model-value="(model.registration_number as string) || ''"
            placeholder="登録番号 (車検証と照合)"
            list="ticket-form-registrations"
            @update:model-value="(v: string | number) => update('registration_number', toHalfWidth(String(v ?? '')))"
          />
          <datalist id="ticket-form-registrations">
            <option
              v-for="reg in carInspectionRegistrations"
              :key="reg"
              :value="reg"
            />
          </datalist>
        </UFormField>

        <UFormField label="場所">
          <UInput
            :model-value="(model.location as string) || ''"
            placeholder="発生場所"
            @update:model-value="update('location', $event)"
          />
        </UFormField>
      </div>

      <!-- 車検証マスタ一致情報 -->
      <div
        v-if="model.registration_number"
        class="rounded-md border p-3 text-xs"
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
    </fieldset>

    <!-- 進捗・手当 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">進捗・手当</legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="進捗状況">
          <USelect
            :model-value="(model.progress_notes as string) || ''"
            :items="progressOptions"
            placeholder="進捗状況を選択"
            :disabled="progressOptions.length === 0"
            @update:model-value="update('progress_notes', $event)"
          />
        </UFormField>

        <UFormField label="手当等">
          <UInput
            :model-value="(model.allowance as string) || ''"
            placeholder="手当等"
            @update:model-value="update('allowance', $event)"
          />
        </UFormField>
      </div>
    </fieldset>

    <!-- 金額 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">金額</legend>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormField label="損害額">
          <UInput
            type="number"
            :model-value="String(model.damage_amount ?? '')"
            placeholder="0"
            @update:model-value="update('damage_amount', $event ? Number($event) : null)"
          />
        </UFormField>

        <UFormField label="補償額">
          <UInput
            type="number"
            :model-value="String(model.compensation_amount ?? '')"
            placeholder="0"
            @update:model-value="update('compensation_amount', $event ? Number($event) : null)"
          />
        </UFormField>

        <UFormField label="ロードサービス費用">
          <UInput
            type="number"
            :model-value="String(model.road_service_cost ?? '')"
            placeholder="0"
            @update:model-value="update('road_service_cost', $event ? Number($event) : null)"
          />
        </UFormField>
      </div>
    </fieldset>

    <!-- 相手方 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">相手方</legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="相手方">
          <UInput
            :model-value="(model.counterparty as string) || ''"
            placeholder="相手方"
            @update:model-value="update('counterparty', $event)"
          />
        </UFormField>

        <UFormField label="相手方保険">
          <UInput
            :model-value="(model.counterparty_insurance as string) || ''"
            placeholder="相手方保険"
            @update:model-value="update('counterparty_insurance', $event)"
          />
        </UFormField>
      </div>
    </fieldset>

    <!-- 管理 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">管理</legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField label="処分検討内容">
          <UTextarea
            :model-value="(model.disciplinary_content as string) || ''"
            placeholder="処分検討内容"
            :rows="2"
            @update:model-value="update('disciplinary_content', $event)"
          />
        </UFormField>

        <UFormField label="処分内容">
          <UTextarea
            :model-value="(model.disciplinary_action as string) || ''"
            placeholder="処分内容"
            :rows="2"
            @update:model-value="update('disciplinary_action', $event)"
          />
        </UFormField>
      </div>

      <UFormField label="対応期限">
        <UInput
          type="date"
          :model-value="(model.due_date as string) || ''"
          @update:model-value="update('due_date', $event ? new Date($event).toISOString() : null)"
        />
      </UFormField>
    </fieldset>
  </div>
</template>
