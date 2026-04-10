/* v8 ignore start */
/**
 * Nuxt UI + Nuxt コンポーネントのスタブ集約
 */

export const UApp = { template: '<div><slot /></div>' }
export const UCard = { template: '<div><slot /><slot name="content" /></div>' }
export const UButton = {
  template: '<button @click="$emit(\'click\')"><slot /></button>',
  props: ['label', 'icon', 'variant', 'color', 'size', 'block', 'to', 'loading'],
}
export const UIcon = { template: '<span />', props: ['name'] }
export const UBadge = { template: '<span><slot /></span>', props: ['variant', 'color'] }
export const UInput = {
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target?.value)" />',
  props: ['modelValue', 'placeholder', 'type'],
  emits: ['update:modelValue'],
}
export const USelect = {
  template: '<select @change="$emit(\'update:modelValue\', $event.target?.value)"><option v-for="i in items" :key="i.value" :value="i.value">{{ i.label }}</option></select>',
  props: ['modelValue', 'items', 'placeholder'],
  emits: ['update:modelValue'],
}
export const UFormField = { template: '<div><slot /></div>', props: ['label', 'required'] }
export const UTextarea = { template: '<textarea />', props: ['modelValue', 'placeholder', 'rows'] }
export const UModal = { template: '<div v-if="open"><slot name="content" /></div>', props: ['open'] }
export const UPagination = { template: '<div />', props: ['modelValue', 'total', 'itemsPerPage'] }
export const NuxtLink = { template: '<a><slot /></a>', props: ['to'] }
export const NuxtLayout = { template: '<div><slot /></div>' }
export const NuxtPage = { template: '<div />' }
export const StagingFooter = { template: '<div />', props: ['apiBase', 'tenantId'] }
export const TicketCategoryBadgeStub = { template: '<span />', props: ['category'] }
export const TicketFormFieldsStub = { template: '<div />', props: ['modelValue', 'mode'] }

/** 全スタブをまとめたオブジェクト (mount の global.stubs に渡す) */
export const allStubs = {
  UApp,
  UCard,
  UButton,
  UIcon,
  UBadge,
  UInput,
  USelect,
  UFormField,
  UTextarea,
  UModal,
  UPagination,
  NuxtLink,
  NuxtLayout,
  NuxtPage,
  StagingFooter,
  TicketCategoryBadge: TicketCategoryBadgeStub,
  TicketFormFields: TicketFormFieldsStub,
}
