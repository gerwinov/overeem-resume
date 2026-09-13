<script setup lang="ts" generic="T extends string">
const props = defineProps<{ label: string, options: SwitchOption<T>[], modelValue: T | undefined }>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const buttons = ref<HTMLButtonElement[]>([])

// A radio group: the checked option is the one tab stop, and the arrow keys move and select.
const tabStop = computed(() => Math.max(0, props.options.findIndex(option => option.value === props.modelValue)))

function onKeydown(event: KeyboardEvent, index: number) {
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[event.key]
  if (!step) return
  event.preventDefault()
  const next = (index + step + props.options.length) % props.options.length
  emit('update:modelValue', props.options[next]!.value)
  buttons.value[next]?.focus()
}
</script>

<template>
  <div
    class="inline-flex gap-0.5 rounded-full bg-[rgba(20,18,16,.62)] p-[3px] backdrop-blur-[8px]"
    role="radiogroup"
    :aria-label="label"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="buttons"
      type="button"
      role="radio"
      class="grid h-[30px] min-w-9 cursor-pointer place-items-center rounded-full px-2.5 text-[13.5px] font-semibold tracking-[.04em] text-white hover:bg-white/16 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white aria-checked:bg-white aria-checked:text-[#22303a] has-[svg]:w-8 has-[svg]:min-w-0 has-[svg]:px-0"
      :aria-checked="option.value === modelValue"
      :aria-label="option.label"
      :title="option.label"
      :lang="option.lang"
      :tabindex="index === tabStop ? 0 : -1"
      @click="emit('update:modelValue', option.value)"
      @keydown="onKeydown($event, index)"
    >
      <slot :option="option" />
    </button>
  </div>
</template>
