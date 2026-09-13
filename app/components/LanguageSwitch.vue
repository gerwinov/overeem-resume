<script setup lang="ts">
const { t, locale, setLocale } = useI18n()

// Each language is named in its own language, so it is recognizable whatever the UI language is, and
// the name includes the visible code, so speech input can say "click NL".
const options: SwitchOption<Locale>[] = [
  { value: 'nl', label: 'Nederlands (NL)', lang: 'nl' },
  { value: 'en', label: 'English (EN)', lang: 'en' },
]

let wanted: Locale | null = null
async function choose(value: Locale) {
  wanted = value
  await setLocale(value)
  // A switch that still had to load its messages can finish after a later one; the last choice wins.
  if (wanted && wanted !== locale.value) await setLocale(wanted)
}
</script>

<template>
  <SegmentedSwitch
    :label="t('langGroup')"
    :options="options"
    :model-value="(locale as Locale)"
    @update:model-value="choose"
  >
    <template #default="{ option }">{{ option.value.toUpperCase() }}</template>
  </SegmentedSwitch>
</template>
