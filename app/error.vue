<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()

const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (notFound.value ? t('errorNotFoundTitle') : t('errorTitle')))

useHead({ htmlAttrs: { lang: locale } })
useSeoMeta({ title: () => `${title.value} · Gerwin Overeem`, robots: 'noindex' })
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="bg-brand px-gutter py-10 text-on-brand">
      <p class="m-0 font-display text-3xl leading-tight font-bold">Gerwin Overeem</p>
    </header>
    <main class="flex flex-1 flex-col items-start gap-4 px-gutter py-10">
      <h1 class="m-0 font-display text-2xl">{{ title }}</h1>
      <p class="m-0 max-w-[62ch]">{{ notFound ? t('errorNotFoundText') : t('errorText') }}</p>
      <!-- A full page load rather than router navigation: it also recovers from an error in the app itself. -->
      <a href="/" class="font-semibold text-ink underline decoration-taupe underline-offset-2">{{ t('errorBack') }}</a>
    </main>
    <SiteFooter />
  </div>
</template>
