<script setup lang="ts">
const { t, locale } = useI18n()

useHead({ htmlAttrs: { lang: locale } })
useSeoMeta({
  title: () => t('metaTitle'),
  description: () => t('metaDescription'),
})
</script>

<template>
  <NuxtPage />
</template>
