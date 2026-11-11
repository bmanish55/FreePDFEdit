import { useEffect, useRef, useState } from 'react'

type FontSizeInputProps = {
  value: number
  onChange: (nextSize: number) => void
  onStartEdit?: () => void
  min?: number
  max?: number
  className?: string
  ariaLabel?: string
}

function formatSize(size: number): string {
  return String(Math.round(size * 10) / 10)
}

export default function FontSizeInput({
  value,
  onChange,
  onStartEdit,
  min = 4,
  max = 120,
  className = '',
  ariaLabel = 'Font size',
}: FontSizeInputProps) {
  const [draft, setDraft] = useState(() => formatSize(value))
  const [isFocused, setIsFocused] = useState(false)
  const historyStartedRef = useRef(false)
  const initialValueRef = useRef(value)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatSize(value))
    }
  }, [value, isFocused])

  const emitChange = (nextSize: number) => {
    if (!historyStartedRef.current) {
      onStartEdit?.()
      historyStartedRef.current = true
    }
    onChange(nextSize)
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={1}
      value={draft}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => {
        setIsFocused(true)
        historyStartedRef.current = false
        skipBlurCommitRef.current = false
        initialValueRef.current = value
      }}
      onChange={(event) => {
        const raw = event.target.value
        setDraft(raw)
        if (raw.trim() === '') return
        const parsed = Number.parseFloat(raw)
        if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
          emitChange(parsed)
        }
      }}
      onBlur={() => {
        setIsFocused(false)
        if (skipBlurCommitRef.current) {
          skipBlurCommitRef.current = false
          historyStartedRef.current = false
          return
        }
        const parsed = Number.parseFloat(draft)
        if (draft.trim() !== '' && Number.isFinite(parsed)) {
          const clamped = Math.min(max, Math.max(min, parsed))
          if (clamped !== value) {
            emitChange(clamped)
          }
          setDraft(formatSize(clamped))
        } else {
          setDraft(formatSize(value))
        }
        historyStartedRef.current = false
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          skipBlurCommitRef.current = true
          const reverted = initialValueRef.current
          if (reverted !== value) {
            onChange(reverted)
          }
          setDraft(formatSize(reverted))
          historyStartedRef.current = false
          event.currentTarget.blur()
        }
      }}
    />
  )
}
