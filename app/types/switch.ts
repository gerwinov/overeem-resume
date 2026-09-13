/** One option of a SegmentedSwitch; `label` names it for screen readers and as its tooltip. */
export type SwitchOption<V extends string> = { value: V, label: string, lang?: string }
