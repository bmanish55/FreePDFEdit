import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  X,
  Check,
  Copy,
  Settings2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  optimizeText,
  estimateBudget,
  testOllamaConnection,
  DEFAULT_AI_CONFIG,
  type AiConfig,
  type OptimizeResult,
} from '../lib/ai/aiOptimizer'
import { usePdfStore, type TextObject } from '../store/usePdfStore'
import Button from './ui/Button'

type AiOptimizeModalProps = {
  isOpen: boolean
  onClose: () => void
  textObject: TextObject
}

export default function AiOptimizeModal({
  isOpen,
  onClose,
  textObject,
}: AiOptimizeModalProps) {
  const updateObject = usePdfStore((state) => state.updateObject)

  const [aiConfig, setAiConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG)
  const [results, setResults] = useState<OptimizeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [appliedId, setAppliedId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)

  // Calculate target budget from original line or current object bounds
  const availableWidth = textObject.original
    ? textObject.original.maxRight - textObject.x
    : 450
  const targetChars = estimateBudget(
    textObject.fontSize,
    availableWidth,
    textObject.fontFamily,
  )
  const currentChars = textObject.text.length
  const isOverBudget = currentChars > targetChars

  const handleGenerate = async (customConfig?: AiConfig) => {
    setLoading(true)
    try {
      const candidates = await optimizeText(
        textObject.text,
        targetChars,
        customConfig || aiConfig,
      )
      setResults(candidates)
    } finally {
      setLoading(false)
    }
  }

  // Trigger initial optimization when modal opens
  useEffect(() => {
    if (isOpen) {
      setAppliedId(null)
      void handleGenerate()
      void checkOllama()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, textObject.id, textObject.text])

  const checkOllama = async () => {
    setCheckingOllama(true)
    const reachable = await testOllamaConnection(aiConfig.endpoint)
    setOllamaConnected(reachable)
    setCheckingOllama(false)
  }

  const handleApply = (result: OptimizeResult) => {
    updateObject(textObject.id, { text: result.text })
    setAppliedId(result.id)
    setTimeout(() => {
      onClose()
    }, 400)
  }

  const handleCopy = async (result: OptimizeResult) => {
    await navigator.clipboard.writeText(result.text)
    setCopiedId(result.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="ai-modal-title" className="text-base font-semibold text-slate-900">
                AI Smart Fit & Optimizer
              </h2>
              <p className="text-xs text-slate-500">
                Fit text into line boundaries & optimize document tone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Space Status */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Line Budget Status</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isOverBudget ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {isOverBudget ? (
                <>
                  <AlertCircle size={14} />
                  Over limit by {currentChars - targetChars} chars
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Fits within line budget
                </>
              )}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Current: {currentChars} chars</span>
                <span>Max Target: ~{targetChars} chars</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isOverBudget ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((currentChars / targetChars) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-2.5 rounded-lg bg-white p-2 text-xs text-slate-700 border border-slate-200/80 font-mono">
            &ldquo;{textObject.text}&rdquo;
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            AI Suggestions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleGenerate()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Regenerate
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label="AI Settings"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Settings2 size={15} />
            </button>
          </div>
        </div>

        {/* Collapsible Model Settings */}
        {showSettings && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center justify-between font-medium text-slate-800 mb-2">
              <span>Open-Source AI Model Engine</span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  ollamaConnected ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {ollamaConnected ? '● Ollama Online' : '● Built-in Offline Engine'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-600">Ollama Endpoint</label>
                <input
                  type="text"
                  value={aiConfig.endpoint}
                  onChange={(e) => setAiConfig({ ...aiConfig, endpoint: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600">Model Name</label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  placeholder="llama3.2 or qwen2.5"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void checkOllama()}
                disabled={checkingOllama}
              >
                {checkingOllama ? 'Connecting...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="mt-3 flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-0.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
              <RefreshCw size={24} className="animate-spin text-brand-500" />
              <p className="mt-2 text-xs font-medium">Optimizing phrasing with AI...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No suggestions generated yet. Click Regenerate.
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        item.fitsBudget
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.charCount} chars {item.fitsBudget ? '✓ Fits' : '⚠️ Long'}
                    </span>
                  </div>
                </div>

                <p className="mt-1.5 text-xs text-slate-800 font-sans leading-relaxed">
                  {item.text}
                </p>

                <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2">
                  <button
                    onClick={() => void handleCopy(item)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none"
                    title="Copy to clipboard"
                  >
                    {copiedId === item.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copiedId === item.id ? 'Copied' : 'Copy'}
                  </button>
                  <Button
                    variant={appliedId === item.id ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleApply(item)}
                  >
                    {appliedId === item.id ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        Applied!
                      </>
                    ) : (
                      'Apply to Line'
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <span>Client-side and open-source models keep your PDF documents completely private.</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
