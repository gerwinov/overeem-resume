<script setup lang="ts">
const props = defineProps<{ tone: 'ok' | 'err' | 'warn', text: string, retryLabel?: string }>()
defineEmits<{ retry: [] }>()

const toneClass = computed(() => ({
  ok: 'bg-ok-soft text-ok font-semibold',
  err: 'bg-err-soft text-err',
  warn: 'bg-warn-soft text-ink',
}[props.tone]))
</script>

<template>
  <div
    class="flex max-w-[62ch] flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] px-3.5 py-2.5 text-[15.5px]"
    :class="toneClass"
  >
    <svg v-if="tone === 'ok'" class="flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    <svg v-else-if="tone === 'err'" class="flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
    <svg v-else class="flex-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    <span>{{ text }}</span>
    <button
      v-if="retryLabel"
      type="button"
      class="cursor-pointer rounded-lg border border-current bg-surface px-2.5 py-0.5 text-[14.5px] font-semibold text-inherit"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>
