<script setup lang="ts">
defineProps<{ chatId: string }>()

const { t, tm } = useI18n()
const email = useRuntimeConfig().public.contactEmail

const heading = 'm-0 -mb-1 mt-1.5 text-[13px] font-semibold tracking-[.06em] text-ink-soft uppercase'

const rows = computed(() => (tm('privacyRows') as unknown[]).map((_, i) => ({
  service: t(`privacyRows[${i}].service`),
  what: t(`privacyRows[${i}].what`),
  howLong: t(`privacyRows[${i}].howLong`),
  where: t(`privacyRows[${i}].where`),
})))

const dialog = ref<HTMLDialogElement | null>(null)
let opener: HTMLElement | null = null

// A native modal: the page behind it is inert and Esc closes it. Focus returns to what opened it.
function open(from: HTMLElement | null) {
  opener = from
  dialog.value?.showModal()
}
const close = () => dialog.value?.close()
const onClose = () => opener?.focus()
// A click on the dialog element itself, not its content, is a click on the backdrop.
const onClick = (event: MouseEvent) => { if (event.target === dialog.value) close() }

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copy(id: string) {
  try {
    await navigator.clipboard.writeText(id)
  }
  catch {
    return
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false }, 1600)
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="privacy-title"
    class="m-auto max-h-[calc(100dvh-32px)] w-[min(640px,calc(100%-32px))] overflow-auto overscroll-contain rounded-2xl border-0 bg-surface p-0 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,.4)] backdrop:bg-[rgba(24,22,20,.45)]"
    @click="onClick"
    @close="onClose"
  >
    <div class="flex items-center justify-between gap-3 bg-brand px-5 py-4 text-on-brand">
      <h2 id="privacy-title" class="m-0 font-display text-[21px]">{{ t('privacyTitle') }}</h2>
      <button type="button" class="grid cursor-pointer rounded-md p-1 focus-visible:outline-[#22303a]" :aria-label="t('close')" @click="close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <div class="flex flex-col gap-3 px-5 pt-[18px] pb-[22px] text-base">
      <i18n-t keypath="privacyWho" tag="p" scope="global" class="m-0">
        <template #email>
          <a :href="`mailto:${email}`" class="text-ink underline decoration-taupe underline-offset-2">{{ email }}</a>
        </template>
      </i18n-t>

      <h3 id="privacy-conversation" :class="heading">{{ t('privacyConvTitle') }}</h3>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[34rem] border-collapse text-[15px]" aria-labelledby="privacy-conversation">
          <thead>
            <tr>
              <th v-for="key in ['privacyColService', 'privacyColWhat', 'privacyColHowLong', 'privacyColWhere']" :key="key" scope="col" class="border-b border-line py-2 pr-2.5 text-left align-top text-[12.5px] font-semibold tracking-[.06em] text-ink-soft uppercase">
                {{ t(key) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.service">
              <th scope="row" class="border-b border-line py-2 pr-2.5 text-left align-top font-semibold">{{ row.service }}</th>
              <td class="border-b border-line py-2 pr-2.5 align-top">{{ row.what }}</td>
              <td class="border-b border-line py-2 pr-2.5 align-top">{{ row.howLong }}</td>
              <td class="border-b border-line py-2 pr-2.5 align-top">{{ row.where }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="m-0">{{ t('privacyTransfers') }}</p>

      <h3 :class="heading">{{ t('privacyMeetTitle') }}</h3>
      <p class="m-0">{{ t('privacyMeet') }}</p>

      <h3 :class="heading">{{ t('privacyCookiesTitle') }}</h3>
      <p class="m-0">{{ t('privacyCookies') }}</p>

      <h3 :class="heading">{{ t('privacyRightsTitle') }}</h3>
      <p class="m-0">{{ t('privacyRights') }}</p>
      <p class="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[15px]">
        <span>{{ t('convIdLabel') }}</span>
        <code class="rounded-md bg-chip px-2 py-0.5 text-sm tabular-nums">{{ chatId }}</code>
        <button type="button" class="cursor-pointer rounded-full border border-line bg-surface px-2.5 py-0.5 text-[13.5px] font-semibold text-ink hover:border-taupe" @click="copy(chatId)">
          {{ copied ? t('copied') : t('copy') }}
        </button>
        <span class="sr-only" aria-live="polite">{{ copied ? t('copied') : '' }}</span>
      </p>
      <p class="m-0 text-sm text-ink-soft">{{ t('privacyUpdated') }}</p>
    </div>
  </dialog>
</template>

