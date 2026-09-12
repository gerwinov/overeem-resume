<script setup lang="ts">
const { thread, busy, full, messages, send, retry, newConversation } = useCvChat()

const pageEnd = ref<HTMLElement | null>(null)
const composer = ref<{ focus: () => void } | null>(null)
const { jumpToEnd, follow } = useStickToBottom(pageEnd)

watch(thread, () => follow(), { flush: 'post' })

function onSend(text: string) {
  void send(text)
  void jumpToEnd()
}

function onRetry() {
  void retry()
  void jumpToEnd()
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
    <ChatThread class="flex-1" :items="thread" @ask="onSend" @retry="onRetry" />
    <ChatComposer
      ref="composer"
      :busy="busy"
      :full="full"
      :has-conversation="messages.length > 0"
      @send="onSend"
      @new-conversation="onNewConversation"
    />
    <div ref="pageEnd">
      <SiteFooter />
    </div>
  </div>
</template>
