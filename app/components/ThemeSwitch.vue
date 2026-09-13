<script setup lang="ts">
type Theme = 'light' | 'dark' | 'system'

const { t } = useI18n()
const colorMode = useColorMode()

const options = computed<SwitchOption<Theme>[]>(() => [
  { value: 'light', label: t('themeLight') },
  { value: 'dark', label: t('themeDark') },
  { value: 'system', label: t('themeSystem') },
])
</script>

<template>
  <SegmentedSwitch
    :label="t('themeGroup')"
    :options="options"
    :model-value="(colorMode.preference as Theme)"
    @update:model-value="colorMode.preference = $event"
  >
    <template #default="{ option }">
      <svg v-if="option.value === 'light'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg v-else-if="option.value === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
    </template>
  </SegmentedSwitch>
</template>
