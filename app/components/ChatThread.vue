<script setup lang="ts">
defineProps<{ items: ThreadItem[] }>()
defineEmits<{ ask: [question: string], retry: [] }>()

const { t } = useI18n()
const suggestions = computed(() => [t('suggestion1'), t('suggestion2'), t('suggestion3'), t('suggestion4')])

const noticeText = (notice: 'error' | 'error-after-send' | 'rate-limited') =>
  ({ 'error': t('error'), 'error-after-send': t('errorAfterSend'), 'rate-limited': t('rateLimit') }[notice])

/** The index of the text block that gets the "AI assistant" label: the first one, if the item shows it. */
const labelledText = (item: Extract<ThreadItem, { kind: 'assistant' }>) =>
  item.showWho ? item.blocks.findIndex(block => block.kind === 'text') : -1

/** While streaming, the caret follows the last text; without text at the end (yet), dots show instead. */
const waitingForText = (item: Extract<ThreadItem, { kind: 'assistant' }>) =>
  item.streaming && item.blocks.at(-1)?.kind !== 'text'
</script>

<template>
  <section class="flex flex-col gap-[18px] px-gutter pt-9 pb-2" :aria-label="t('threadLabel')">
    <div v-if="items.length === 0" class="flex max-w-[62ch] flex-col gap-[18px]">
      <ChatWho />
      <p class="m-0">{{ t('intro') }}</p>
      <p class="-mb-2 text-[15px] text-ink-soft">{{ t('suggestLabel') }}</p>
      <div class="grid grid-cols-1 gap-2.5 min-[561px]:grid-cols-2">
        <button
          v-for="question in suggestions"
          :key="question"
          type="button"
          class="flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-taupe bg-surface px-3.5 py-3 text-left text-base leading-[1.35] transition-colors hover:bg-chip"
          @click="$emit('ask', question)"
        >
          <span>{{ question }}</span>
          <span class="flex-none text-taupe" aria-hidden="true">→</span>
        </button>
      </div>
    </div>

    <template v-for="(item, index) in items" :key="item.kind === 'user' || item.kind === 'assistant' ? item.id : `${item.kind}-${index}`">
      <div
        v-if="item.kind === 'user'"
        class="max-w-[min(80%,52ch)] self-end rounded-[18px_18px_4px_18px] bg-bubble px-[15px] py-[9px] break-words whitespace-pre-wrap text-on-bubble"
      >{{ item.text }}</div>

      <div v-else-if="item.kind === 'assistant'" class="flex max-w-[62ch] flex-col gap-1">
        <template v-for="(block, blockIndex) in item.blocks" :key="blockIndex">
          <ChatNotice v-if="block.kind === 'meeting-sent'" tone="ok" :text="t('meetingSent')" class="my-1.5" />
          <template v-else>
            <ChatWho v-if="blockIndex === labelledText(item)" />
            <div class="break-words whitespace-pre-wrap">{{ block.text }}<span
              v-if="item.streaming && blockIndex === item.blocks.length - 1"
              class="ml-0.5 inline-block h-[1.05em] w-[.5em] animate-caret bg-brand align-[-0.15em] motion-reduce:animate-none"
              aria-hidden="true"
            /></div>
          </template>
        </template>
        <template v-if="waitingForText(item)">
          <ChatWho v-if="item.showWho && labelledText(item) === -1" />
          <ChatDots />
        </template>
        <span v-if="item.cutOff" class="text-[14.5px] text-ink-soft italic">{{ t('cutoff') }}</span>
      </div>

      <div v-else-if="item.kind === 'pending'" class="flex max-w-[62ch] flex-col gap-1">
        <ChatWho v-if="item.showWho" />
        <ChatDots />
      </div>

      <ChatNotice
        v-else-if="item.kind === 'notice'"
        :tone="item.notice === 'rate-limited' ? 'warn' : 'err'"
        :text="noticeText(item.notice)"
        :retry-label="item.retry ? t('retry') : undefined"
        @retry="$emit('retry')"
      />
    </template>
  </section>
</template>
