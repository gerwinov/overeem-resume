<script setup lang="ts">
const { t } = useI18n()
const { chatId, thread, busy, full, messages, send, retry, newConversation } = useCvChat()

// Outside the Vue tree: with scripting on, a browser reads <noscript> content as text, which Vue would
// find does not match what the server rendered.
useHead({
  noscript: [{ tagPosition: 'bodyOpen', innerHTML: () => `<p class="m-0 bg-err-soft px-gutter py-3 text-err">${t('noScript')}</p>` }],
})

const pageEnd = ref<HTMLElement | null>(null)
const composer = ref<{ focus: () => void } | null>(null)
const privacy = ref<{ open: (opener: HTMLElement | null) => void } | null>(null)
const { jumpToEnd, follow } = useStickToBottom(pageEnd)

watch(thread, () => follow(), { flush: 'post' })

const announcement = ref('')
watch(busy, async (isBusy, wasBusy) => {
  if (!wasBusy || isBusy) return
  announcement.value = ''
  await nextTick()
  announcement.value = turnAnnouncement(thread.value, key => t(key))
})

// The suggestion and retry buttons disappear once used, so focus goes back to the input.
function onSend(text: string) {
  void send(text)
  void jumpToEnd()
  composer.value?.focus()
}

function onRetry() {
  void retry()
  void jumpToEnd()
  composer.value?.focus()
}

async function onNewConversation() {
  await newConversation()
  void jumpToEnd()
  composer.value?.focus()
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#main"
      class="sr-only rounded-full bg-[rgba(20,18,16,.85)] font-semibold text-white focus:not-sr-only focus:absolute focus:px-4 focus:py-2 focus:top-3.5 focus:left-3.5 focus:z-50 focus-visible:outline-white"
    >{{ t('skipToChat') }}</a>
    <SiteHeader />
    <main id="main" tabindex="-1" class="flex flex-1 flex-col focus:outline-none">
      <ChatThread class="flex-1" :items="thread" :busy="busy" @ask="onSend" @retry="onRetry" />
      <ChatComposer
        ref="composer"
        :busy="busy"
        :full="full"
        :has-conversation="messages.length > 0"
        @send="onSend"
        @new-conversation="onNewConversation"
        @open-privacy="privacy?.open($event)"
      />
    </main>
    <div ref="pageEnd">
      <SiteFooter with-privacy @open-privacy="privacy?.open($event)" />
    </div>
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</div>
    <PrivacyDialog ref="privacy" :chat-id="chatId" />
  </div>
</template>
