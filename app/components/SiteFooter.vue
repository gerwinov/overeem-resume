<script setup lang="ts">
const { t } = useI18n()
const { contactEmail, linkedinUrl } = useRuntimeConfig().public
</script>

<template>
  <footer class="bg-taupe px-gutter py-6 text-on-taupe pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <nav :aria-label="t('contactLabel')">
      <ul class="m-0 flex list-none flex-wrap items-center gap-x-9 gap-y-2.5 p-0">
        <li v-if="contactEmail">
          <a :href="`mailto:${contactEmail}`" class="inline-flex items-center gap-[9px] text-base text-inherit no-underline hover:underline hover:underline-offset-[3px] focus-visible:outline-on-taupe">
            <IconsIconMail class="size-[22px] flex-none" />
            <span>{{ contactEmail }}</span>
          </a>
        </li>
        <li v-if="linkedinUrl">
          <a :href="linkedinUrl" rel="noreferrer nofollow" target="_blank" class="inline-flex items-center gap-[9px] text-base text-inherit no-underline hover:underline hover:underline-offset-[3px] focus-visible:outline-on-taupe">
            <IconsIconLinkedin class="size-6 flex-none" />
            <span>LinkedIn</span>
          </a>
        </li>
      </ul>
    </nav>
  </footer>
</template>
