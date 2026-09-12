<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="flex flex-wrap">
    <div class="flex h-96 w-full flex-col justify-between gap-4 bg-brand px-8 py-10 text-on-brand sm:w-1/2 sm:px-6 md:px-10 lg:h-[32rem]">
      <div>
        <h1 class="m-0 font-display text-[1.875rem] leading-tight font-bold sm:text-2xl md:text-4xl lg:text-5xl xl:text-[4rem]">
          Gerwin Overeem
        </h1>
        <p class="m-0 text-2xl leading-[1.3] font-light sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl">
          {{ t('subtitle') }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="my-4 inline-flex items-center gap-6 text-xl sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">
          <IconsIconPlace class="h-8 w-auto sm:h-6 md:h-8 lg:h-10" />
          {{ t('place') }}
        </span>
      </div>
    </div>
    <img
      class="block h-96 w-full max-w-full object-cover object-center sm:w-1/2 lg:h-[32rem]"
      src="/banner.jpg"
      :alt="t('photoAlt')"
    >
  </header>
</template>
