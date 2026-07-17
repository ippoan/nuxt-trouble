<script setup lang="ts">
import type { Employee } from '~/types'

// 従業員名のオートコンプリート入力 (Refs #215 レビュー指摘)。
// native の <datalist> は日本語 IME 入力中に候補が出ない/出ても選べないことが
// あるため、フィルタとドロップダウンを自前で描画する。
// - 値 (v-model) は名前の自由テキスト。マスタ照合 (一致しない名前の扱い) は親の責務
// - 候補クリック / Enter で名前を確定し select を emit する
// - ドロップダウンは overflow コンテナに clip されないよう body へ Teleport + fixed 配置
const model = defineModel<string>({ required: true })

const props = defineProps<{
  employees: Employee[]
}>()

const emit = defineEmits<{
  select: [employee: Employee]
  blur: []
}>()

defineOptions({ inheritAttrs: false })

const open = ref(false)
const highlighted = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const candidates = computed(() => {
  const q = model.value.trim()
  const list = q
    ? props.employees.filter(e => e.name.includes(q) || (e.code ?? '').includes(q))
    : props.employees
  return list.slice(0, 50)
})

function positionMenu() {
  /* v8 ignore next */
  const rect = inputRef.value?.getBoundingClientRect()
  /* v8 ignore next */
  if (!rect) return
  menuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 2}px`,
    left: `${rect.left}px`,
    minWidth: `${Math.max(rect.width, 160)}px`,
  }
}

function openMenu() {
  if (props.employees.length === 0) return
  positionMenu()
  open.value = true
}

function closeMenu() {
  open.value = false
  highlighted.value = -1
}

function onInput() {
  openMenu()
  highlighted.value = -1
}

function selectEmployee(e: Employee) {
  model.value = e.name
  closeMenu()
  emit('select', e)
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'ArrowDown') {
    ev.preventDefault()
    if (!open.value) openMenu()
    else highlighted.value = Math.min(highlighted.value + 1, candidates.value.length - 1)
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault()
    highlighted.value = Math.max(highlighted.value - 1, 0)
  } else if (ev.key === 'Enter') {
    const picked = open.value && highlighted.value >= 0 ? candidates.value[highlighted.value] : undefined
    if (picked) {
      ev.preventDefault()
      selectEmployee(picked)
    } else {
      closeMenu()
      ;(ev.target as HTMLInputElement).blur()
    }
  } else if (ev.key === 'Escape') {
    closeMenu()
  }
}

function onBlur() {
  closeMenu()
  emit('blur')
}

// fixed 配置なのでスクロールで入力欄とズレる前に閉じる
function onWindowScroll() {
  /* v8 ignore next */
  if (open.value) closeMenu()
}

onMounted(() => {
  window.addEventListener('scroll', onWindowScroll, { capture: true, passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll, { capture: true })
})
</script>

<template>
  <div class="relative w-full min-w-0">
    <input
      ref="inputRef"
      v-model="model"
      v-bind="$attrs"
      autocomplete="off"
      @input="onInput"
      @focus="openMenu"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <Teleport to="body">
      <div
        v-if="open && candidates.length > 0"
        data-testid="employee-name-menu"
        :style="menuStyle"
        class="z-[60] max-h-48 overflow-y-auto rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg py-0.5"
      >
        <!-- mousedown.prevent: 選択クリックで input の blur を発火させない -->
        <button
          v-for="(e, i) in candidates"
          :key="e.id"
          type="button"
          data-testid="employee-name-option"
          class="block w-full text-left text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950"
          :class="i === highlighted ? 'bg-blue-50 dark:bg-blue-950' : ''"
          @mousedown.prevent
          @click="selectEmployee(e)"
        >
          {{ e.name }}<span v-if="e.code" class="ml-1 text-gray-400">({{ e.code }})</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>
