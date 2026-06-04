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

const rootRef = ref<HTMLElement | null>(null)
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

// 入力中は内部状態のみ更新する。保存 (emit) は blur / Enter / カレンダー選択
// など「確定」操作でのみ行い、手入力の途中で API を撃たない。自動フォーカス
// 移動も廃止 (4 桁打って勝手に次へ飛ぶのが手入力では不快)。セル間移動は
// Tab / `/` / 矢印キーで行える (keydown ハンドラ参照)。
function onYearInput(e: Event) {
  year.value = sanitize((e.target as HTMLInputElement).value).slice(0, 4)
}

function onMonthInput(e: Event) {
  month.value = sanitize((e.target as HTMLInputElement).value).slice(0, 2)
}

function onDayInput(e: Event) {
  day.value = sanitize((e.target as HTMLInputElement).value).slice(0, 2)
}

/** root の外へフォーカスが抜けたときだけ確定 (セル間移動では確定しない)。 */
function commitOnBlur(e: FocusEvent) {
  // カレンダーアイコンを押すと UPopover が開き、reka-ui が teleport 先の
  // UCalendar にフォーカスを移すため input root から focusout が発火する。
  // これを「確定」と誤判定して emit すると、TicketTaskList のように
  // @update:model-value で即 saveEdit() → editingId=null → v-if 解除する親では
  // 入力欄ごと消え、カレンダーを押した瞬間に消滅する (= 「クリックで消える」)。
  // popover 操作中は確定しない。日付選択は onCalendarSelect が、popover を閉じて
  // 他要素へ移ったときは下の relatedTarget 判定が確定を担う。
  if (popoverOpen.value) return
  const next = e.relatedTarget as Node | null
  if (next && rootRef.value?.contains(next)) return
  emitModel()
}

/**
 * フォーカス時に既存値を全選択する。これをしないと既存値 (例 "06") の入った
 * セルに数字を打っても sanitize().slice() で先頭が残り、入力が置換されず
 * 編集できない (= 「編集で入力しづらい」原因)。全選択しておけば打った数字で
 * そのまま上書きできる。
 */
function selectOnFocus(e: FocusEvent) {
  (e.target as HTMLInputElement).select()
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
  // ↑↓ で値を動かしても即保存しない。確定 (emit) は blur / Enter で行う。
  r.value = String(next).padStart(pad, '0')
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
    ref="rootRef"
    class="inline-flex items-center gap-0.5 h-8 px-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm"
    @focusout="commitOnBlur"
    @keydown.enter="emitModel"
  >
    <input
      ref="yearRef"
      :value="year"
      type="text"
      inputmode="numeric"
      maxlength="4"
      placeholder="YYYY"
      class="w-12 text-center outline-none bg-transparent"
      @focus="selectOnFocus"
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
      @focus="selectOnFocus"
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
      @focus="selectOnFocus"
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
