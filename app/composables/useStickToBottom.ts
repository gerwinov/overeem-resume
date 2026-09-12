import type { Ref } from 'vue'

const BOTTOM_SLACK_PX = 8

/**
 * "Stick to bottom" while an answer streams (docs/spec.md, "Layout and copy"). Sending turns following
 * on; any scroll the visitor makes toward earlier messages turns it off at once, and only scrolling down
 * at the very bottom turns it on again. Streamed text only grows downward, so any upward movement is the
 * visitor's.
 */
export function useStickToBottom(pageEnd: Ref<HTMLElement | null>) {
  let stuck = false
  let lastY = 0
  let touchY: number | null = null

  const atBottom = () => {
    const end = pageEnd.value
    return !!end && Math.abs(end.getBoundingClientRect().bottom - window.innerHeight) <= BOTTOM_SLACK_PX
  }
  const scrollToEnd = () => {
    pageEnd.value?.scrollIntoView({ block: 'end' })
    lastY = window.scrollY
  }
  // A gesture toward earlier messages only counts when there is something above to scroll to. At the
  // bottom the page cannot scroll further down, so there a gesture toward the end turns following on.
  const toEarlier = () => { if (window.scrollY > 0) stuck = false }
  const toEnd = () => { if (atBottom()) stuck = true }

  const isField = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)

  const onWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) toEarlier()
    else if (event.deltaY > 0) toEnd()
  }
  const onKey = (event: KeyboardEvent) => {
    if (isField(event.target)) return
    if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) toEarlier()
    else if (['ArrowDown', 'PageDown', 'End'].includes(event.key)) toEnd()
  }
  // A finger moving down pulls the page toward earlier messages; moving up heads for the end.
  const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null }
  const onTouchMove = (event: TouchEvent) => {
    const y = event.touches[0]?.clientY
    if (y === undefined) return
    if (touchY !== null && y > touchY) toEarlier()
    else if (touchY !== null && y < touchY) toEnd()
    touchY = y
  }
  const onScroll = () => {
    const y = window.scrollY
    if (y < lastY - 1) stuck = false
    else if (y > lastY && atBottom()) stuck = true
    lastY = y
  }

  onMounted(() => {
    lastY = window.scrollY
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
  })

  // `stuck` is checked again after the tick: the visitor can scroll away in between.
  return {
    /** For sending and "New conversation": ends at the bottom and turns following on. */
    jumpToEnd: async () => {
      stuck = true
      await nextTick()
      if (stuck) scrollToEnd()
    },
    /** After new streamed content: follows only while the visitor has not scrolled away. */
    follow: async () => {
      if (!stuck) return
      await nextTick()
      // An upward move whose scroll event has not fired yet, such as a scrollbar drag.
      if (window.scrollY < lastY - 1) stuck = false
      if (stuck) scrollToEnd()
    },
  }
}
