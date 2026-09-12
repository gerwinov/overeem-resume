<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-[.06em] text-ink-soft uppercase before:size-2 before:bg-brand before:content-['']">
    {{ t('who') }}
  </span>
</template>
