<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string | undefined
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | undefined): void
}>()

const year = ref('')
const month = ref('')
const day = ref('')

const yearRef = ref<HTMLInputElement | null>(null)
const monthRef = ref<HTMLInputElement | null>(null)
const dayRef = ref<HTMLInputElement | null>(null)

const popoverOpen = ref(false)

let selfUpdate = false

watch(
  () => props.modelValue,
  (v) => {
    if (selfUpdate) {
      selfUpdate = false
      return
    }
    if (!v) {
      year.value = ''
      month.value = ''
      day.value = ''
      return
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
    if (m) {
      year.value = m[1]!
      month.value = m[2]!
      day.value = m[3]!
    }
  },
  { immediate: true },
)

function emitModel() {
  selfUpdate = true
  if (year.value.length === 4 && month.value.length >= 1 && day.value.length >= 1) {
    const mm = month.value.padStart(2, '0')
    const dd = day.value.padStart(2, '0')
    emit('update:modelValue', `${year.value}-${mm}-${dd}`)
  }
  else {
    emit('update:modelValue', undefined)
  }
}

function clearAll() {
  year.value = ''
  month.value = ''
  day.value = ''
  emitModel()
  nextTick(() => yearRef.value?.focus())
}

function sanitize(s: string): string {
  return s.replace(/\D/g, '')
}

function onYearInput(e: Event) {
  const v = sanitize((e.target as HTMLInputElement).value).slice(0, 4)
  year.value = v
  if (v.length === 4) nextTick(() => monthRef.value?.focus())
  emitModel()
}

function onMonthInput(e: Event) {
  const v = sanitize((e.target as HTMLInputElement).value).slice(0, 2)
  month.value = v
  const advance = v.length === 2 || (v.length === 1 && Number(v) > 1)
  if (advance) nextTick(() => dayRef.value?.focus())
  emitModel()
}

function onDayInput(e: Event) {
  const v = sanitize((e.target as HTMLInputElement).value).slice(0, 2)
  day.value = v
  emitModel()
}

type Ref = typeof year

function bump(
  r: Ref,
  delta: number,
  emptyDefault: number,
  min: number,
  max: number,
  wrap: boolean,
  pad: number,
) {
  let next: number
  if (r.value === '') {
    next = emptyDefault
  }
  else {
    next = Number(r.value) + delta
    if (wrap) {
      if (next > max) next = min
      else if (next < min) next = max
    }
    else {
      if (next > max) next = max
      else if (next < min) next = min
    }
  }
  r.value = String(next).padStart(pad, '0')
  emitModel()
}

function bumpYear(delta: number) {
  const now = new Date().getFullYear()
  bump(year, delta, now, 1900, 2100, false, 4)
}
function bumpMonth(delta: number) {
  const now = new Date().getMonth() + 1
  bump(month, delta, now, 1, 12, true, 2)
}
function bumpDay(delta: number) {
  const now = new Date().getDate()
  bump(day, delta, now, 1, 31, true, 2)
}

function onYearKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') { e.preventDefault(); bumpYear(1); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); bumpYear(-1); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); monthRef.value?.focus(); return }
  if (e.key === '/' || e.key === '-' || e.key === '.') {
    e.preventDefault()
    monthRef.value?.focus()
  }
}

function onMonthKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') { e.preventDefault(); bumpMonth(1); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); bumpMonth(-1); return }
  if (e.key === 'ArrowLeft') { e.preventDefault(); yearRef.value?.focus(); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); dayRef.value?.focus(); return }
  if (e.key === 'Backspace' && month.value === '') {
    e.preventDefault()
    yearRef.value?.focus()
    return
  }
  if (e.key === '/' || e.key === '-' || e.key === '.') {
    e.preventDefault()
    dayRef.value?.focus()
  }
}

function onDayKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') { e.preventDefault(); bumpDay(1); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); bumpDay(-1); return }
  if (e.key === 'ArrowLeft') { e.preventDefault(); monthRef.value?.focus(); return }
  if (e.key === 'Backspace' && day.value === '') {
    e.preventDefault()
    monthRef.value?.focus()
  }
}

const calendarValue = computed<CalendarDate | undefined>(() => {
  if (!props.modelValue) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(props.modelValue)
  if (!m) return undefined
  return new CalendarDate(Number(m[1]), Number(m[2]), Number(m[3]))
})

function onCalendarSelect(v: unknown) {
  if (!v || Array.isArray(v) || (typeof v === 'object' && v !== null && 'start' in v)) {
    emit('update:modelValue', undefined)
    popoverOpen.value = false
    return
  }
  const d = v as CalendarDate
  const y = String(d.year)
  const mm = String(d.month).padStart(2, '0')
  const dd = String(d.day).padStart(2, '0')
  emit('update:modelValue', `${y}-${mm}-${dd}`)
  popoverOpen.value = false
}
</script>

<template>
  <div
    class="inline-flex items-center gap-0.5 h-8 px-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm"
  >
    <input
      ref="yearRef"
      :value="year"
      type="text"
      inputmode="numeric"
      maxlength="4"
      placeholder="YYYY"
      class="w-12 text-center outline-none bg-transparent"
      @input="onYearInput"
      @keydown="onYearKeydown"
    >
    <span class="text-gray-400">/</span>
    <input
      ref="monthRef"
      :value="month"
      type="text"
      inputmode="numeric"
      maxlength="2"
      placeholder="MM"
      class="w-6 text-center outline-none bg-transparent"
      @input="onMonthInput"
      @keydown="onMonthKeydown"
    >
    <span class="text-gray-400">/</span>
    <input
      ref="dayRef"
      :value="day"
      type="text"
      inputmode="numeric"
      maxlength="2"
      placeholder="DD"
      class="w-6 text-center outline-none bg-transparent"
      @input="onDayInput"
      @keydown="onDayKeydown"
    >
    <button
      v-if="year || month || day"
      type="button"
      class="ml-1 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
      title="クリア"
      @click="clearAll"
    >
      <UIcon name="i-lucide-x" class="size-3.5" />
    </button>
    <UPopover v-model:open="popoverOpen">
      <button
        type="button"
        class="ml-1 p-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
      >
        <UIcon name="i-lucide-calendar" class="size-4" />
      </button>
      <template #content>
        <UCalendar :model-value="calendarValue" class="p-2" @update:model-value="onCalendarSelect" />
      </template>
    </UPopover>
  </div>
</template>
