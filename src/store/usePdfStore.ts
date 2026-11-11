import { create } from 'zustand'
import type { FontFamilyKey } from '../lib/fonts/fontMatcher'
import {
  hasHandledCoffeeSession,
  markCoffeeSessionHandled,
} from '../lib/coffee/coffeeService'
import type { TextRun } from '../lib/text/extractText'
import {
  buildMergedTextObject,
  buildObjectCandidate,
  buildRunCandidate,
  getSameLineCandidates,
  isSameHorizontalLine,
  type LineCandidate,
} from '../lib/text/mergeText'

export type OriginalSpan = {
  x: number
  baselineY: number
  width: number
  fontSize: number
  bgColor: string
}

export type AlignmentGuide = {
  page: number
  orientation: 'v' | 'h'
  pos: number
  start: number
  end: number
  kind: 'page' | 'object' | 'baseline'
}

export type PageSize = {
  width: number
  height: number
}

export type TextObject = {
  id: string
  type: 'text'
  page: number
  x: number
  baselineY: number
  text: string
  fontFamily: FontFamilyKey
  bold: boolean
  italic: boolean
  fontSize: number
  color: string
  boxWidth?: number
  originalKey?: string
  coveredKeys?: string[]
  original: null | {
    text: string
    x: number
    baselineY?: number
    width: number
    fontSize: number
    bgColor: string
    maxRight: number
    spans?: OriginalSpan[]
    merged?: boolean
  }
}

export type ImageObject = {
  id: string
  type: 'image'
  page: number
  x: number
  y: number
  width: number
  height: number
  dataUrl: string
  mime: 'image/png' | 'image/jpeg'
}

export type RectObject = {
  id: string
  type: 'whiteout' | 'highlight'
  page: number
  x: number
  y: number
  width: number
  height: number
}

export type AnnotationIconKey =
  | 'comment'
  | 'chat'
  | 'pointer'
  | 'arrow'
  | 'check'
  | 'circle'
  | 'cross'
  | 'insert'
  | 'np'
  | 'fileNote'
  | 'paragraph'
  | 'question'
  | 'star'
  | 'key'

export type AnnotationObject = {
  id: string
  type: 'annotation'
  page: number
  x: number
  y: number
  size: number
  icon: AnnotationIconKey
  color: string
  note: string
}

export type ShapeKind =
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'rectangle'
  | 'polygon'
  | 'cloud'
  | 'polyline'

export type LineStyle = 'solid' | 'dashed' | 'dotted'

export type ShapePoint = { x: number; y: number }

export type ShapeStyle = {
  strokeColor: string
  fillColor: string | null
  opacity: number
  strokeWidth: number
  lineStyle: LineStyle
}

export type ShapeObject = {
  id: string
  type: 'shape'
  page: number
  shape: ShapeKind
  x: number
  y: number
  width: number
  height: number
  points?: ShapePoint[]
  strokeColor: string
  fillColor: string | null
  opacity: number
  strokeWidth: number
  lineStyle: LineStyle
}

export type EditObject =
  | TextObject
  | ImageObject
  | RectObject
  | AnnotationObject
  | ShapeObject

export type ActiveTool =
  | 'select'
  | 'addText'
  | 'addImage'
  | 'whiteout'
  | 'highlight'
  | 'annotate'
  | 'shape'

const LAYER_ORDER: Record<EditObject['type'], number> = {
  whiteout: 0,
  highlight: 1,
  image: 2,
  shape: 3,
  text: 4,
  annotation: 5,
}

export function sortObjectsByLayer(objects: EditObject[]): EditObject[] {
  return [...objects].sort((a, b) => LAYER_ORDER[a.type] - LAYER_ORDER[b.type])
}

function areObjectListsEqual(a: EditObject[], b: EditObject[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function pruneEmptySelectedText(
  state: { objects: EditObject[]; history: EditObject[][]; selectedId: string | null },
  nextSelectedId: string | null,
): { objects: EditObject[]; history: EditObject[][] } {
  if (!state.selectedId || state.selectedId === nextSelectedId) {
    return { objects: state.objects, history: state.history }
  }
  const prevSelected = state.objects.find((obj) => obj.id === state.selectedId)
  if (
    !prevSelected ||
    prevSelected.type !== 'text' ||
    prevSelected.original !== null ||
    prevSelected.text !== ''
  ) {
    return { objects: state.objects, history: state.history }
  }
  const cleanedObjects = state.objects.filter((obj) => obj.id !== prevSelected.id)
  let nextHistory = state.history
  while (
    nextHistory.length > 0 &&
    areObjectListsEqual(
      nextHistory[nextHistory.length - 1].filter((obj) => obj.id !== prevSelected.id),
      cleanedObjects,
    )
  ) {
    nextHistory = nextHistory.slice(0, -1)
  }
  return { objects: cleanedObjects, history: nextHistory }
}

export type CoffeeBanner = {
  kind: 'declined' | 'supported'
  supporterName?: string
  amount?: number
  emailSent?: boolean
} | null

type PdfState = {
  pdfBytes: Uint8Array | null
  fileName: string
  numPages: number
  zoom: number
  activeTool: ActiveTool
  objects: EditObject[]
  selectedId: string | null
  visiblePage: number
  history: EditObject[][]
  textWarning: string | null
  pageTextRuns: Record<number, TextRun[]>
  pageSizes: Record<number, PageSize>
  activeGuides: AlignmentGuide[]
  mergeSourceId: string | null
  activeAnnotationIcon: AnnotationIconKey
  activeAnnotationColor: string
  activeShapeKind: ShapeKind
  activeShapeStyle: ShapeStyle
  isAiModalOpen: boolean
  setAiModalOpen: (open: boolean) => void
  isFeedbackModalOpen: boolean
  setFeedbackModalOpen: (open: boolean) => void
  isCoffeeModalOpen: boolean
  coffeeSource: 'download' | 'footer'
  coffeeBanner: CoffeeBanner
  hasSeenCoffeePrompt: boolean
  openCoffeeModal: (source: 'download' | 'footer') => void
  closeCoffeeModal: () => void
  markCoffeePromptHandled: () => void
  setCoffeeBanner: (banner: CoffeeBanner) => void
  setPdf: (pdfBytes: Uint8Array, fileName: string, numPages: number) => void
  restoreSession: (pdfBytes: Uint8Array, fileName: string, numPages: number, objects: EditObject[]) => void
  setZoom: (zoom: number) => void
  setActiveTool: (activeTool: ActiveTool) => void
  setVisiblePage: (visiblePage: number) => void
  setTextWarning: (warning: string | null) => void
  setPageTextRuns: (page: number, runs: TextRun[]) => void
  setPageSize: (page: number, size: PageSize) => void
  setActiveGuides: (guides: AlignmentGuide[]) => void
  setMergeSourceId: (id: string | null) => void
  setActiveAnnotationIcon: (icon: AnnotationIconKey) => void
  setActiveAnnotationColor: (color: string) => void
  setActiveShapeKind: (kind: ShapeKind) => void
  updateActiveShapeStyle: (changes: Partial<ShapeStyle>) => void
  addObject: (object: EditObject) => void
  updateObject: (id: string, changes: Partial<EditObject>, saveHistory?: boolean) => void
  beginHistory: () => void
  selectObject: (selectedId: string | null) => void
  deleteSelected: () => void
  undo: () => void
  mergeLineForSelected: (sourceId: string) => void
  mergeWithTarget: (
    sourceId: string,
    target: { kind: 'object'; id: string } | { kind: 'run'; run: TextRun },
  ) => void
}

function applyMerge(
  state: PdfState,
  primary: TextObject,
  participants: LineCandidate[],
): Partial<PdfState> {
  if (participants.length < 2) {
    return { mergeSourceId: null }
  }
  const { merged, removedObjectIds } = buildMergedTextObject(primary, participants)
  const removedSet = new Set(removedObjectIds)
  const nextObjects = state.objects
    .filter((obj) => !removedSet.has(obj.id))
    .map((obj) => (obj.id === primary.id ? merged : obj))

  return {
    objects: nextObjects,
    selectedId: merged.id,
    mergeSourceId: null,
    textWarning: null,
    history: [...state.history, state.objects],
  }
}

export const usePdfStore = create<PdfState>((set) => ({
  pdfBytes: null,
  fileName: '',
  numPages: 0,
  zoom: 1,
  activeTool: 'select',
  objects: [],
  selectedId: null,
  visiblePage: 1,
  history: [],
  textWarning: null,
  pageTextRuns: {},
  pageSizes: {},
  activeGuides: [],
  mergeSourceId: null,
  activeAnnotationIcon: 'comment',
  activeAnnotationColor: '#facc15',
  activeShapeKind: 'rectangle',
  activeShapeStyle: {
    strokeColor: '#2563eb',
    fillColor: null,
    opacity: 1,
    strokeWidth: 3,
    lineStyle: 'solid',
  },
  isAiModalOpen: false,
  setAiModalOpen: (isAiModalOpen) => set({ isAiModalOpen }),
  isFeedbackModalOpen: false,
  setFeedbackModalOpen: (isFeedbackModalOpen) => set({ isFeedbackModalOpen }),
  isCoffeeModalOpen: false,
  coffeeSource: 'download',
  coffeeBanner: null,
  hasSeenCoffeePrompt: hasHandledCoffeeSession(),
  openCoffeeModal: (coffeeSource) =>
    set({ isCoffeeModalOpen: true, coffeeSource }),
  closeCoffeeModal: () => set({ isCoffeeModalOpen: false }),
  markCoffeePromptHandled: () => {
    markCoffeeSessionHandled()
    set({ hasSeenCoffeePrompt: true })
  },
  setCoffeeBanner: (coffeeBanner) => set({ coffeeBanner }),
  setPdf: (pdfBytes, fileName, numPages) =>
    set({
      pdfBytes,
      fileName,
      numPages,
      zoom: 1,
      objects: [],
      selectedId: null,
      visiblePage: 1,
      history: [],
      textWarning: null,
      pageTextRuns: {},
      pageSizes: {},
      activeGuides: [],
      mergeSourceId: null,
    }),
  restoreSession: (pdfBytes, fileName, numPages, objects) =>
    set({
      pdfBytes,
      fileName,
      numPages,
      objects,
      zoom: 1,
      selectedId: null,
      visiblePage: 1,
      history: [],
      textWarning: null,
      pageTextRuns: {},
      pageSizes: {},
      activeGuides: [],
      mergeSourceId: null,
    }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),
  setActiveTool: (activeTool) =>
    set((state) => {
      if (activeTool === 'select') {
        return { activeTool, mergeSourceId: null }
      }
      const { objects, history } = pruneEmptySelectedText(state, null)
      return {
        activeTool,
        objects,
        history,
        selectedId: null,
        textWarning: null,
        mergeSourceId: null,
        activeGuides: [],
      }
    }),
  setVisiblePage: (visiblePage) => set({ visiblePage }),
  setTextWarning: (textWarning) => set({ textWarning }),
  setPageTextRuns: (page, runs) =>
    set((state) => ({
      pageTextRuns: { ...state.pageTextRuns, [page]: runs },
    })),
  setPageSize: (page, size) =>
    set((state) => {
      const existing = state.pageSizes[page]
      if (existing && existing.width === size.width && existing.height === size.height) {
        return state
      }
      return {
        pageSizes: { ...state.pageSizes, [page]: size },
      }
    }),
  setActiveGuides: (activeGuides) => set({ activeGuides }),
  setMergeSourceId: (mergeSourceId) => set({ mergeSourceId }),
  setActiveAnnotationIcon: (activeAnnotationIcon) =>
    set((state) => {
      const selected = state.objects.find(
        (obj) => obj.id === state.selectedId && obj.type === 'annotation',
      )
      if (!selected) return { activeAnnotationIcon }
      return {
        activeAnnotationIcon,
        objects: state.objects.map((obj) =>
          obj.id === selected.id ? { ...obj, icon: activeAnnotationIcon } : obj,
        ),
        history: [...state.history, state.objects],
      }
    }),
  setActiveAnnotationColor: (activeAnnotationColor) =>
    set((state) => {
      const selected = state.objects.find(
        (obj) => obj.id === state.selectedId && obj.type === 'annotation',
      )
      if (!selected) return { activeAnnotationColor }
      return {
        activeAnnotationColor,
        objects: state.objects.map((obj) =>
          obj.id === selected.id ? { ...obj, color: activeAnnotationColor } : obj,
        ),
        history: [...state.history, state.objects],
      }
    }),
  setActiveShapeKind: (activeShapeKind) => set({ activeShapeKind }),
  updateActiveShapeStyle: (changes) =>
    set((state) => {
      const nextStyle = { ...state.activeShapeStyle, ...changes }
      const selected = state.objects.find(
        (obj) => obj.id === state.selectedId && obj.type === 'shape',
      )
      if (!selected) return { activeShapeStyle: nextStyle }
      return {
        activeShapeStyle: nextStyle,
        objects: state.objects.map((obj) =>
          obj.id === selected.id ? ({ ...obj, ...changes } as EditObject) : obj,
        ),
        history: [...state.history, state.objects],
      }
    }),
  addObject: (object) =>
    set((state) => {
      const { objects, history } = pruneEmptySelectedText(state, object.id)
      return {
        objects: [...objects, object],
        selectedId: object.id,
        mergeSourceId: null,
        history: [...history, objects],
      }
    }),
  updateObject: (id, changes, saveHistory = true) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? ({ ...object, ...changes } as EditObject) : object,
      ),
      history: saveHistory ? [...state.history, state.objects] : state.history,
    })),
  beginHistory: () => set((state) => ({ history: [...state.history, state.objects] })),
  selectObject: (selectedId) =>
    set((state) => {
      const { objects, history } = pruneEmptySelectedText(state, selectedId)
      return {
        objects,
        history,
        selectedId,
        mergeSourceId: state.mergeSourceId === selectedId ? state.mergeSourceId : null,
        textWarning: selectedId === null ? null : state.textWarning,
      }
    }),
  deleteSelected: () =>
    set((state) => {
      if (!state.selectedId) return state
      return {
        objects: state.objects.filter((object) => object.id !== state.selectedId),
        selectedId: null,
        mergeSourceId: null,
        activeGuides: [],
        textWarning: null,
        history: [...state.history, state.objects],
      }
    }),
  undo: () =>
    set((state) => {
      const previous = state.history.at(-1)
      if (!previous) return state
      return {
        objects: previous,
        history: state.history.slice(0, -1),
        selectedId: null,
        mergeSourceId: null,
        activeGuides: [],
        textWarning: null,
      }
    }),
  mergeLineForSelected: (sourceId) =>
    set((state) => {
      const primary = state.objects.find(
        (obj): obj is TextObject => obj.id === sourceId && obj.type === 'text',
      )
      if (!primary) return { mergeSourceId: null }
      const pageRuns = state.pageTextRuns[primary.page] ?? []
      const participants = getSameLineCandidates(primary, state.objects, pageRuns)
      return applyMerge(state, primary, participants)
    }),
  mergeWithTarget: (sourceId, target) =>
    set((state) => {
      const primary = state.objects.find(
        (obj): obj is TextObject => obj.id === sourceId && obj.type === 'text',
      )
      if (!primary) return { mergeSourceId: null }

      if (target.kind === 'object') {
        const other = state.objects.find(
          (obj): obj is TextObject => obj.id === target.id && obj.type === 'text',
        )
        if (
          !other ||
          other.id === primary.id ||
          other.page !== primary.page ||
          !isSameHorizontalLine(primary, other)
        ) {
          return { mergeSourceId: null }
        }
        return applyMerge(state, primary, [
          buildObjectCandidate(primary),
          buildObjectCandidate(other),
        ])
      }

      if (target.run.page !== primary.page || !isSameHorizontalLine(primary, target.run)) {
        return { mergeSourceId: null }
      }
      return applyMerge(state, primary, [
        buildObjectCandidate(primary),
        buildRunCandidate(target.run),
      ])
    }),
}))
