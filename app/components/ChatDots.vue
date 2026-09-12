<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span class="inline-flex gap-[5px] py-2" role="img" :aria-label="t('thinking')">
    <span v-for="delay in ['0s', '.15s', '.3s']" :key="delay" class="size-[7px] animate-dot rounded-full bg-taupe motion-reduce:animate-none" :style="{ animationDelay: delay }" />
  </span>
</template>
