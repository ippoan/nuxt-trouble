<script setup lang="ts">
const props = defineProps<{
  category: string
}>()

const colorMap: Record<string, string> = {
  '苦情・トラブル': 'yellow',
  '貨物事故': 'red',
  '被害事故': 'red',
  '対物事故(他損)': 'orange',
  '対物事故(自損)': 'orange',
  '人身事故': 'red',
  'その他': 'neutral',
}

const color = computed(() => colorMap[props.category] || 'neutral')
</script>

<template>
  <UBadge :color="color" variant="subtle">
    {{ category }}
  </UBadge>
</template>
