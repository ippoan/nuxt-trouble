<script setup lang="ts">
const props = defineProps<{
  category: string
}>()

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

const colorMap: Record<string, BadgeColor> = {
  '苦情・トラブル': 'warning',
  '貨物事故': 'error',
  '被害事故': 'error',
  '対物事故(他損)': 'warning',
  '対物事故(自損)': 'warning',
  '人身事故': 'error',
  'その他': 'neutral',
}

const color = computed<BadgeColor>(() => colorMap[props.category] || 'neutral')
</script>

<template>
  <UBadge :color="color" variant="subtle">
    {{ category }}
  </UBadge>
</template>
