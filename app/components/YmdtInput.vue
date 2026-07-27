<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { toHalfWidth } from '~/utils/normalize'
import { numericInputmodeForTouch } from '~/utils/ime'

const props = defineProps<{
  modelValue: string | undefined
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | undefined): void
}>()

const year = ref('')
const month = ref('')
const day = ref('')
const hour = ref('')
const minute = ref('')

const yearRef = ref<HTMLInputElement | null>(null)
const monthRef = ref<HTMLInputElement | null>(null)
const dayRef = ref<HTMLInputElement | null>(null)
const hourRef = ref<HTMLInputElement | null>(null)
const minuteRef = ref<HTMLInputElement | null>(null)

const popoverOpen = ref(false)

// タッチ端末のみテンキー (inputmode=numeric)。物理キーボードでは付けない —
// MS-IME が Tab 移動だけで半角英数へ自動切替し以降の欄でモードが戻らないため
// (Refs #225 ②)。SSR では判定できないので mounted 後に確定する。
const cellInputmode = ref<'numeric' | undefined>(undefined)
onMounted(() => {
  cellInputmode.value = numericInputmodeForTouch()
})

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
      hour.value = ''
      minute.value = ''
      return
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(v)
    if (m) {
      year.value = m[1]!
      month.value = m[2]!
      day.value = m[3]!
      hour.value = m[4]!
      minute.value = m[5]!
    }
  },
  { immediate: true },
)

function emitModel() {
  selfUpdate = true
  const yOk = year.value.length === 4
  const mOk = month.value.length >= 1
  const dOk = day.value.length >= 1
  // 時・分は未入力なら 00 として扱う。以前は全 5 欄が埋まらないと日時全体を
  // undefined にしていたため、時刻を入れずに保存すると「入力した日付が反映
  // されない」不具合になっていた (Refs #225 ⑦)。
  if (yOk && mOk && dOk) {
    const mm = month.value.padStart(2, '0')
    const dd = day.value.padStart(2, '0')
    const hh = (hour.value || '0').padStart(2, '0')
    const mi = (minute.value || '0').padStart(2, '0')
    emit('update:modelValue', `${year.value}-${mm}-${dd}T${hh}:${mi}`)
  }
  else {
    emit('update:modelValue', undefined)
  }
}

function clearAll() {
  year.value = ''
  month.value = ''
  day.value = ''
  hour.value = ''
  minute.value = ''
  emitModel()
  nextTick(() => yearRef.value?.focus())
}

// 全角数字も受け付けて半角化する。全角を捨てると IME をかなのまま日付が
// 打てず、ユーザーが IME を英数へ手動で切り替える → 次のかな欄で戻らない、
// という IME モード汚染の引き金になる (Refs #225 ②)。
function sanitize(s: string): string {
  return toHalfWidth(s).replace(/\D/g, '')
}

/**
 * input / compositionend 共通のセル読み取り。IME 変換中 (isComposing) は
 * state を触らない — かなモードの全角数字は composition として入力され、
 * 確定時の compositionend で半角化して取り込む。半角化した値は DOM にも
 * 強制反映する (state が同値だと Vue が patch せず全角が残るため)。
 */
function readCell(e: Event, max: number): string | null {
  if ((e as InputEvent).isComposing) return null
  const el = e.target as HTMLInputElement
  const v = sanitize(el.value).slice(0, max)
  if (el.value !== v) el.value = v
  return v
}

function onYearInput(e: Event) {
  const v = readCell(e, 4)
  if (v === null) return
  year.value = v
  if (v.length === 4) nextTick(() => monthRef.value?.focus())
  emitModel()
}

function onMonthInput(e: Event) {
  const v = readCell(e, 2)
  if (v === null) return
  month.value = v
  const advance = v.length === 2 || (v.length === 1 && Number(v) > 1)
  if (advance) nextTick(() => dayRef.value?.focus())
  emitModel()
}

function onDayInput(e: Event) {
  const v = readCell(e, 2)
  if (v === null) return
  day.value = v
  const advance = v.length === 2 || (v.length === 1 && Number(v) > 3)
  if (advance) nextTick(() => hourRef.value?.focus())
  emitModel()
}

function onHourInput(e: Event) {
  const v = readCell(e, 2)
  if (v === null) return
  hour.value = v
  const advance = v.length === 2 || (v.length === 1 && Number(v) > 2)
  if (advance) nextTick(() => minuteRef.value?.focus())
  emitModel()
}

function onMinuteInput(e: Event) {
  const v = readCell(e, 2)
  if (v === null) return
  minute.value = v
  emitModel()
}

function fillNow() {
  const d = new Date()
  year.value = String(d.getFullYear())
  month.value = String(d.getMonth() + 1).padStart(2, '0')
  day.value = String(d.getDate()).padStart(2, '0')
  hour.value = String(d.getHours()).padStart(2, '0')
  minute.value = String(d.getMinutes()).padStart(2, '0')
  emitModel()
}

type RefStr = typeof year

function bump(
  r: RefStr,
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
  bump(year, delta, new Date().getFullYear(), 1900, 2100, false, 4)
}
function bumpMonth(delta: number) {
  bump(month, delta, new Date().getMonth() + 1, 1, 12, true, 2)
}
function bumpDay(delta: number) {
  bump(day, delta, new Date().getDate(), 1, 31, true, 2)
}
function bumpHour(delta: number) {
  bump(hour, delta, new Date().getHours(), 0, 23, true, 2)
}
function bumpMinute(delta: number) {
  bump(minute, delta, new Date().getMinutes(), 0, 59, true, 2)
}

function handleArrow(e: KeyboardEvent, bumpFn: (d: number) => void): boolean {
  if (e.key === 'ArrowUp') { e.preventDefault(); bumpFn(1); return true }
  if (e.key === 'ArrowDown') { e.preventDefault(); bumpFn(-1); return true }
  return false
}

function onYearKeydown(e: KeyboardEvent) {
  if (handleArrow(e, bumpYear)) return
  if (e.key === 'ArrowRight') { e.preventDefault(); monthRef.value?.focus(); return }
  if (e.key === '/' || e.key === '-' || e.key === '.') {
    e.preventDefault()
    monthRef.value?.focus()
  }
}

function onMonthKeydown(e: KeyboardEvent) {
  if (handleArrow(e, bumpMonth)) return
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
  if (handleArrow(e, bumpDay)) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); monthRef.value?.focus(); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); hourRef.value?.focus(); return }
  if (e.key === 'Backspace' && day.value === '') {
    e.preventDefault()
    monthRef.value?.focus()
    return
  }
  if ([' ', 'T', 't', '/', '-', '.'].includes(e.key)) {
    e.preventDefault()
    hourRef.value?.focus()
  }
}

function onHourKeydown(e: KeyboardEvent) {
  if (handleArrow(e, bumpHour)) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); dayRef.value?.focus(); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); minuteRef.value?.focus(); return }
  if (e.key === 'Backspace' && hour.value === '') {
    e.preventDefault()
    dayRef.value?.focus()
    return
  }
  if (e.key === ':') {
    e.preventDefault()
    minuteRef.value?.focus()
  }
}

function onMinuteKeydown(e: KeyboardEvent) {
  if (handleArrow(e, bumpMinute)) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); hourRef.value?.focus(); return }
  if (e.key === 'Backspace' && minute.value === '') {
    e.preventDefault()
    hourRef.value?.focus()
  }
}

const calendarValue = computed<CalendarDate | undefined>(() => {
  if (!props.modelValue) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(props.modelValue)
  if (!m) return undefined
  return new CalendarDate(Number(m[1]), Number(m[2]), Number(m[3]))
})

function onCalendarSelect(v: unknown) {
  if (!v || Array.isArray(v) || (typeof v === 'object' && v !== null && 'start' in v)) {
    year.value = ''
    month.value = ''
    day.value = ''
    emitModel()
    return
  }
  const d = v as CalendarDate
  year.value = String(d.year)
  month.value = String(d.month).padStart(2, '0')
  day.value = String(d.day).padStart(2, '0')
  if (!hour.value) hour.value = '00'
  if (!minute.value) minute.value = '00'
  emitModel()
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function onHourPick(e: Event) {
  hour.value = (e.target as HTMLSelectElement).value
  if (!minute.value) minute.value = '00'
  emitModel()
}

function onMinutePick(e: Event) {
  minute.value = (e.target as HTMLSelectElement).value
  if (!hour.value) hour.value = '00'
  emitModel()
}

function setNowAndClose() {
  fillNow()
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
      :inputmode="cellInputmode"
      maxlength="4"
      placeholder="YYYY"
      class="w-12 text-center outline-none bg-transparent"
      @input="onYearInput"
      @compositionend="onYearInput"
      @keydown="onYearKeydown"
    >
    <span class="text-gray-400">/</span>
    <input
      ref="monthRef"
      :value="month"
      type="text"
      :inputmode="cellInputmode"
      maxlength="2"
      placeholder="MM"
      class="w-6 text-center outline-none bg-transparent"
      @input="onMonthInput"
      @compositionend="onMonthInput"
      @keydown="onMonthKeydown"
    >
    <span class="text-gray-400">/</span>
    <input
      ref="dayRef"
      :value="day"
      type="text"
      :inputmode="cellInputmode"
      maxlength="2"
      placeholder="DD"
      class="w-6 text-center outline-none bg-transparent"
      @input="onDayInput"
      @compositionend="onDayInput"
      @keydown="onDayKeydown"
    >
    <span class="mx-1 text-gray-300">|</span>
    <input
      ref="hourRef"
      :value="hour"
      type="text"
      :inputmode="cellInputmode"
      maxlength="2"
      placeholder="HH"
      class="w-6 text-center outline-none bg-transparent"
      @input="onHourInput"
      @compositionend="onHourInput"
      @keydown="onHourKeydown"
    >
    <span class="text-gray-400">:</span>
    <input
      ref="minuteRef"
      :value="minute"
      type="text"
      :inputmode="cellInputmode"
      maxlength="2"
      placeholder="MM"
      class="w-6 text-center outline-none bg-transparent"
      @input="onMinuteInput"
      @compositionend="onMinuteInput"
      @keydown="onMinuteKeydown"
    >
    <button
      v-if="year || month || day || hour || minute"
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
        <div class="flex flex-col">
          <UCalendar :model-value="calendarValue" class="p-2" @update:model-value="onCalendarSelect" />
          <div class="flex items-center gap-2 p-2 border-t border-gray-200 dark:border-gray-700 text-sm">
            <select
              :value="hour || '00'"
              class="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm outline-none [color-scheme:light] dark:[color-scheme:dark]"
              @change="onHourPick"
            >
              <option v-for="h in HOURS" :key="h" :value="h">{{ h }}</option>
            </select>
            <span class="text-gray-400">:</span>
            <select
              :value="minute || '00'"
              class="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm outline-none [color-scheme:light] dark:[color-scheme:dark]"
              @change="onMinutePick"
            >
              <option v-for="m in MINUTES" :key="m" :value="m">{{ m }}</option>
            </select>
            <div class="flex-1" />
            <UButton size="xs" variant="outline" label="今" @click="setNowAndClose" />
            <UButton size="xs" variant="ghost" label="閉じる" @click="popoverOpen = false" />
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
