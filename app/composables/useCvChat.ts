import { useChat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'

class RateLimitedError extends Error {
  constructor() {
    super('rate_limited')
    this.name = 'RateLimitedError'
  }
}

export function useCvChat() {
  const { locale } = useI18n()
  const erroredIds = ref(new Set<string>())
  const errorKind = ref<ChatErrorKind | null>(null)
  // Every change starts a new conversation: useChat recreates the chat with a new random chat ID and
  // replaces its messages with the init's `messages`.
  const conversation = ref(0)

  const transport = new DefaultChatTransport<CvChatMessage>({
    api: '/api/chat',
    body: () => ({ locale: locale.value }),
    // A 429 comes from Vercel's firewall, before the function runs, and its body is not ours.
    fetch: async (input, init) => {
      const response = await fetch(input, init)
      if (response.status === 429) throw new RateLimitedError()
      return response
    },
  })

  const chat = useChat<CvChatMessage>(() => {
    const current = conversation.value
    // The error state belongs to the current conversation; a replaced chat's late callbacks are ignored.
    const isCurrent = () => current === conversation.value
    return {
      transport,
      messages: [],
      onError: (error) => {
        if (isCurrent()) errorKind.value = error instanceof RateLimitedError ? 'rate_limited' : 'error'
      },
      onFinish: ({ message, isError, isDisconnect }) => {
        if (isCurrent() && (isError || isDisconnect) && message.role === 'assistant') {
          erroredIds.value = new Set(erroredIds.value).add(message.id)
        }
      },
    }
  })

  const { messages, status } = chat
  // Set before the first await of a request or reset; the chat's own status only changes after one.
  const requesting = ref(false)
  const busy = computed(() => requesting.value || status.value === 'submitted' || status.value === 'streaming')
  const thread = computed(() => buildThread({
    messages: messages.value,
    status: status.value,
    erroredIds: erroredIds.value,
    errorKind: errorKind.value,
  }))
  // A failed turn stays out of the next request's history, unless it holds a successful send.
  const history = computed(() => {
    const errored = erroredTurnIds(messages.value, status.value, erroredIds.value)
    return messages.value.filter(m => !isFailedTurn(m, errored) || hasSuccessfulSend(m))
  })
  // Sending adds one message and the answer another; the server rejects a history over the cap.
  const full = computed(() => history.value.length + 1 > MAX_MESSAGES)

  function forgetRemovedMarks() {
    const present = new Set(messages.value.map(m => m.id))
    const kept = [...erroredIds.value].filter(id => present.has(id))
    if (kept.length !== erroredIds.value.size) erroredIds.value = new Set(kept)
  }

  /**
   * Sending and retrying both start from the pruned history, so a retry resends exactly the request
   * that failed: a failed last answer without a send is pruned, which leaves the visitor's message
   * last for regenerate() to resend. No new conversation can start while `busy`, so the chat stays the same.
   */
  async function startRequest(start: () => Promise<void>) {
    if (busy.value) return
    requesting.value = true
    try {
      const kept = history.value
      if (kept.length !== messages.value.length) messages.value = kept
      forgetRemovedMarks()
      errorKind.value = null
      if (status.value === 'error') chat.clearError()
      await start()
    }
    finally {
      requesting.value = false
      forgetRemovedMarks()
    }
  }

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_VISITOR_MESSAGE_CHARS || full.value) return Promise.resolve()
    return startRequest(() => chat.sendMessage({ text: trimmed }))
  }

  const retry = () => (canRetry(history.value) ? startRequest(() => chat.regenerate()) : Promise.resolve())

  /**
   * useChat hands the same message state to every chat it creates, and creates the new one in a
   * watcher: so this never runs during a request, and stays busy until the new chat exists.
   */
  async function newConversation() {
    if (busy.value) return
    requesting.value = true
    try {
      conversation.value++
      erroredIds.value = new Set()
      errorKind.value = null
      await nextTick()
    }
    finally {
      requesting.value = false
    }
  }

  return {
    chatId: chat.id,
    messages,
    thread,
    busy,
    full,
    send,
    retry,
    newConversation,
  }
}
