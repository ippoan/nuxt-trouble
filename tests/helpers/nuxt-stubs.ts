/* v8 ignore start */
export const UApp = { template: '<div><slot /></div>' }
export const UCard = { template: '<div><slot /><slot name="content" /></div>' }
export const UButton = {
  template: '<button @click="$emit(\'click\')"><slot /></button>',
  props: ['label', 'icon', 'variant', 'color', 'size', 'block', 'to', 'loading', 'disabled'],
}
export const UIcon = { template: '<span />', props: ['name'] }
export const UBadge = { template: '<span><slot /></span>', props: ['variant', 'color'] }
export const UInput = { template: '<input />', props: ['modelValue', 'placeholder', 'type', 'size'] }
export const USelect = { template: '<select />', props: ['modelValue', 'items', 'placeholder', 'size'] }
export const UFormField = { template: '<div><slot /></div>', props: ['label', 'required'] }
export const UTextarea = { template: '<textarea />', props: ['modelValue', 'placeholder', 'rows'] }
export const UModal = { template: '<div v-if="open"><slot name="content" /></div>', props: ['open'] }
export const UPagination = { template: '<div />', props: ['modelValue', 'total', 'itemsPerPage'] }
export const USwitch = { template: '<input type="checkbox" />', props: ['modelValue', 'size'] }
export const UTooltip = { template: '<div :data-tooltip="text"><slot /></div>', props: ['text', 'content', 'delayDuration'] }
export const NuxtLink = { template: '<a><slot /></a>', props: ['to'] }
export const NuxtLayout = { template: '<div><slot /></div>' }
export const NuxtPage = { template: '<div />' }
export const StagingFooter = { template: '<div />', props: ['apiBase', 'tenantId'] }
export const AuthToolbar = {
  template: '<div data-testid="auth-toolbar"><button data-testid="apps-btn">Apps</button></div>',
  props: ['showCopyUrl', 'showQr', 'showApps', 'showSettings', 'showLogout', 'showUserInfo', 'showOrgSlug'],
}
export const TicketCategoryBadgeStub = { template: '<span />', props: ['category'] }
export const TicketFormFieldsStub = { template: '<div />', props: ['modelValue', 'mode'] }
export const MasterDataManagerStub = { template: '<div />', props: ['title', 'items', 'builtinItems', 'loading'] }
export const WorkflowManagerStub = { template: '<div />' }
export const TicketCommentsStub = { template: '<div />', props: ['ticketId'] }
export const TicketStatusHistoryStub = { template: '<div />', props: ['ticketId', 'workflowStates'] }
export const TicketStatusTransitionStub = { template: '<div />', props: ['ticketId', 'currentStatusId', 'workflowStates'] }
export const TicketFilesStub = { template: '<div />', props: ['ticketId'] }
export const YmdInputStub = {
  template: '<input data-ymd-input :value="modelValue || \'\'" @input="$emit(\'update:modelValue\', $event.target.value || undefined)" />',
  props: ['modelValue'],
  emits: ['update:modelValue'],
}
export const YmdtInputStub = {
  template: '<input data-ymdt-input :value="modelValue || \'\'" @input="$emit(\'update:modelValue\', $event.target.value || undefined)" />',
  props: ['modelValue'],
  emits: ['update:modelValue'],
}

export const allStubs = {
  UApp, UCard, UButton, UIcon, UBadge, UInput, USelect, UFormField,
  UTextarea, UModal, UPagination, USwitch, UTooltip, NuxtLink, NuxtLayout, NuxtPage,
  StagingFooter,
  AuthToolbar,
  TicketCategoryBadge: TicketCategoryBadgeStub,
  TicketFormFields: TicketFormFieldsStub,
  MasterDataManager: MasterDataManagerStub,
  WorkflowManager: WorkflowManagerStub,
  TicketComments: TicketCommentsStub,
  TicketStatusHistory: TicketStatusHistoryStub,
  TicketStatusTransition: TicketStatusTransitionStub,
  TicketFiles: TicketFilesStub,
  YmdInput: YmdInputStub,
  YmdtInput: YmdtInputStub,
}
