import type { AnnotationIconKey } from '../../store/usePdfStore'

export const ANNOTATION_COLORS = [
  '#facc15', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#d946ef', // magenta
  '#0ea5e9', // blue
  '#84cc16', // green
] as const

export type IconPrimitive = {
  d: string
  mode: 'fill' | 'stroke' | 'knockout'
  strokeWidth?: number
}

export type AnnotationIconDef = {
  key: AnnotationIconKey
  label: string
  primitives: IconPrimitive[]
}

const KAPPA = 0.5522847498

function circlePath(cx: number, cy: number, r: number): string {
  const k = r * KAPPA
  return [
    `M ${cx} ${cy - r}`,
    `C ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy}`,
    `C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}`,
    `C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}`,
    `C ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r}`,
    'Z',
  ].join(' ')
}

export const ANNOTATION_ICONS: AnnotationIconDef[] = [
  {
    key: 'comment',
    label: 'Comment',
    primitives: [
      {
        d: 'M 4 4 H 20 C 21.1 4 22 4.9 22 6 V 16 C 22 17.1 21.1 18 20 18 H 9 L 4 21.5 V 18 C 2.9 18 2 17.1 2 16 V 6 C 2 4.9 2.9 4 4 4 Z',
        mode: 'stroke',
        strokeWidth: 2,
      },
      { d: 'M 6.5 8.5 H 17.5 M 6.5 11.5 H 17.5 M 6.5 14.5 H 13.5', mode: 'stroke', strokeWidth: 1.7 },
    ],
  },
  {
    key: 'chat',
    label: 'Note',
    primitives: [
      {
        d: 'M 4 4 H 20 C 21.1 4 22 4.9 22 6 V 16 C 22 17.1 21.1 18 20 18 H 9 L 4 21.5 V 18 C 2.9 18 2 17.1 2 16 V 6 C 2 4.9 2.9 4 4 4 Z',
        mode: 'fill',
      },
    ],
  },
  {
    key: 'pointer',
    label: 'Pointer',
    primitives: [
      { d: 'M 4 4 L 21 12 L 4 20 L 8.5 12 Z', mode: 'fill' },
    ],
  },
  {
    key: 'arrow',
    label: 'Arrow',
    primitives: [
      {
        d: 'M 3 9.5 H 13 V 5 L 21.5 12 L 13 19 V 14.5 H 3 Z',
        mode: 'fill',
      },
    ],
  },
  {
    key: 'check',
    label: 'Check',
    primitives: [
      { d: 'M 4.5 12.5 L 9.5 17.5 L 19.5 6.5', mode: 'stroke', strokeWidth: 3.2 },
    ],
  },
  {
    key: 'circle',
    label: 'Circle',
    primitives: [
      { d: circlePath(12, 12, 7.2), mode: 'stroke', strokeWidth: 3.8 },
    ],
  },
  {
    key: 'cross',
    label: 'Cross',
    primitives: [
      { d: 'M 5.5 5.5 L 18.5 18.5 M 18.5 5.5 L 5.5 18.5', mode: 'stroke', strokeWidth: 3.2 },
    ],
  },
  {
    key: 'insert',
    label: 'Insert',
    primitives: [
      {
        d: 'M 12 3.5 L 19.5 11.5 H 14.5 V 17 L 19.5 20.5 L 18 22 L 12 18.5 L 6 22 L 4.5 20.5 L 9.5 17 V 11.5 H 4.5 Z',
        mode: 'fill',
      },
    ],
  },
  {
    key: 'np',
    label: 'New Paragraph',
    primitives: [
      { d: 'M 12 3 L 21.5 16.5 H 2.5 Z', mode: 'fill' },
      { d: 'M 6.5 22.5 V 18.5 L 10.5 22.5 V 18.5', mode: 'stroke', strokeWidth: 1.5 },
      { d: 'M 13.5 22.5 V 18.5 H 16.5 V 20.6 H 13.5', mode: 'stroke', strokeWidth: 1.5 },
    ],
  },
  {
    key: 'fileNote',
    label: 'Sticky Note',
    primitives: [
      {
        d: 'M 4 3 H 19 C 20.1 3 21 3.9 21 5 V 15 L 15 21 H 5 C 3.9 21 3 20.1 3 19 V 5 C 3 3.9 3.9 3 4 3 Z',
        mode: 'fill',
      },
      { d: 'M 15 21 V 15 H 21 Z', mode: 'knockout' },
    ],
  },
  {
    key: 'paragraph',
    label: 'Paragraph',
    primitives: [
      {
        d: 'M 11 4 C 7 4 5 6.4 5 9 C 5 11.6 7 14 11 14 V 21 H 13.5 V 6.2 H 16 V 21 H 18.5 V 4 Z',
        mode: 'fill',
      },
    ],
  },
  {
    key: 'question',
    label: 'Question',
    primitives: [
      {
        d: 'M 8.2 8.5 C 8.2 5.9 10 4.2 12.3 4.2 C 14.6 4.2 16.3 5.7 16.3 7.8 C 16.3 10.2 12 11.1 12 14.6',
        mode: 'stroke',
        strokeWidth: 2.8,
      },
      { d: circlePath(12, 18.8, 1.7), mode: 'fill' },
    ],
  },
  {
    key: 'star',
    label: 'Star',
    primitives: [
      {
        d: 'M 12 2.4 L 14.9 8.5 L 21.6 9.4 L 16.7 14.1 L 17.9 20.8 L 12 17.5 L 6.1 20.8 L 7.3 14.1 L 2.4 9.4 L 9.1 8.5 Z',
        mode: 'fill',
      },
    ],
  },
  {
    key: 'key',
    label: 'Key',
    primitives: [
      { d: circlePath(15.8, 8.2, 4.2), mode: 'stroke', strokeWidth: 2.5 },
      { d: 'M 12.6 11.4 L 4.5 19.5 M 6.2 17.8 L 9 20.6 M 9 15 L 11.4 17.4', mode: 'stroke', strokeWidth: 2.5 },
    ],
  },
]

const ICON_MAP = new Map(ANNOTATION_ICONS.map((icon) => [icon.key, icon]))

export function getAnnotationIcon(key: AnnotationIconKey): AnnotationIconDef {
  return ICON_MAP.get(key) ?? ANNOTATION_ICONS[0]
}
