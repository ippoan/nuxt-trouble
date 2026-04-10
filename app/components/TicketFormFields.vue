<script setup lang="ts">
import { TICKET_CATEGORIES } from '~/types'

const model = defineModel<Record<string, unknown>>({ required: true })

defineProps<{
  mode: 'create' | 'edit'
}>()

const categoryOptions = TICKET_CATEGORIES.map(c => ({ label: c, value: c as string }))

function update(key: string, value: unknown) {
  model.value = { ...model.value, [key]: value }
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
          <UInput
            :model-value="(model.office_name as string) || ''"
            placeholder="営業所名"
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
          <UInput
            :model-value="(model.person_name as string) || ''"
            placeholder="氏名"
            @update:model-value="update('person_name', $event)"
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
            @update:model-value="update('vehicle_number', $event)"
          />
        </UFormField>

        <UFormField label="場所">
          <UInput
            :model-value="(model.location as string) || ''"
            placeholder="発生場所"
            @update:model-value="update('location', $event)"
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

        <UFormField label="ロードサービス費">
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

    <!-- 期限 -->
    <fieldset class="space-y-4">
      <legend class="text-sm font-semibold text-gray-700 dark:text-gray-300">管理</legend>

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
