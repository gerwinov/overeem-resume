<script setup lang="ts">
const props = defineProps<{ busy: boolean, full: boolean, hasConversation: boolean }>()
const emit = defineEmits<{ send: [text: string], newConversation: [] }>()

const { t } = useI18n()
const COUNTER_FROM = 900

const text = ref('')
const input = ref<HTMLTextAreaElement | null>(null)

const over = computed(() => text.value.length > MAX_VISITOR_MESSAGE_CHARS)
const canSend = computed(() => !props.busy && !over.value && text.value.trim().length > 0)

function resize() {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
watch(text, () => nextTick(resize))

function submit() {
  if (!canSend.value) return
  emit('send', text.value)
  text.value = ''
  input.value?.focus()
}

// On a physical keyboard Enter sends and Shift+Enter adds a line; on touch keyboards Enter adds a line.
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  if (window.matchMedia('(pointer: coarse)').matches) return
  event.preventDefault()
  submit()
}

defineExpose({ focus: () => input.value?.focus({ preventScroll: true }) })
</script>

<template>
  <div class="px-gutter pt-3 pb-8">
    <div v-if="full" class="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <p class="m-0 flex-1 basis-60">{{ t('conversationFull') }}</p>
      <button
        type="button"
        class="inline-flex flex-none cursor-pointer items-center gap-[5px] rounded-full border border-line bg-surface px-[11px] py-[3px] text-[13.5px] font-semibold whitespace-nowrap text-ink hover:not-disabled:border-taupe hover:not-disabled:bg-chip disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="busy"
        @click="emit('newConversation')"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        {{ t('newChat') }}
      </button>
    </div>

    <template v-else>
      <form
        class="flex items-end gap-2 rounded-2xl border border-line bg-surface py-2 pr-2 pl-4 shadow-[0_1px_2px_rgba(34,48,58,.05),0_6px_20px_-12px_rgba(34,48,58,.25)] transition-colors focus-within:border-taupe"
        @submit.prevent="submit"
      >
        <label for="composer-input" class="sr-only">{{ t('inputLabel') }}</label>
        <textarea
          id="composer-input"
          ref="input"
          v-model="text"
          rows="1"
          class="max-h-[9.5em] flex-1 resize-none border-0 bg-transparent py-[7px] text-[17px] leading-[1.45] outline-0 placeholder:text-ink-soft placeholder:opacity-100"
          :placeholder="t('placeholder')"
          @keydown="onKeydown"
        />
        <span
          v-if="text.length >= COUNTER_FROM"
          class="self-center text-[13px] tabular-nums"
          :class="over ? 'font-semibold text-err' : 'text-ink-soft'"
          :aria-label="t('characterCount', { count: text.length, limit: MAX_VISITOR_MESSAGE_CHARS })"
        >{{ text.length }} / {{ MAX_VISITOR_MESSAGE_CHARS }}</span>
        <button
          type="submit"
          class="grid size-10 flex-none cursor-pointer place-items-center rounded-[11px] bg-brand text-on-brand hover:bg-brand-press disabled:cursor-not-allowed disabled:opacity-45"
          :disabled="!canSend"
          :aria-label="t('send')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>

      <div class="mx-1 mt-2 flex flex-col-reverse items-start justify-between gap-x-5 gap-y-2 min-[561px]:flex-row">
        <p class="m-0 max-w-[72ch] text-[13px] leading-[1.45] text-ink-soft">{{ t('privacyLine') }}</p>
        <button
          v-if="hasConversation"
          type="button"
          class="inline-flex flex-none cursor-pointer items-center gap-[5px] rounded-full border border-line bg-surface px-[11px] py-[3px] text-[13.5px] font-semibold whitespace-nowrap text-ink hover:not-disabled:border-taupe hover:not-disabled:bg-chip disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="busy"
          @click="emit('newConversation')"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          {{ t('newChat') }}
        </button>
      </div>
    </template>
  </div>
</template>
