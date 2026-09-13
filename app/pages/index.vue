<script setup lang="ts">
const { t } = useI18n()
const { chatId, thread, busy, full, messages, send, retry, newConversation } = useCvChat()

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
    <SiteHeader />
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
    <div ref="pageEnd">
      <SiteFooter />
    </div>
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</div>
    <PrivacyDialog ref="privacy" :chat-id="chatId" />
  </div>
</template>
