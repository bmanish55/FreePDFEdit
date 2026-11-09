import type { FontFamilyKey } from '../fonts/fontMatcher'

export type AiMode = 'fit' | 'academic' | 'concise'

export type AiConfig = {
  endpoint: string
  model: string
  customApiKey?: string
}

export type OptimizeResult = {
  id: string
  mode: AiMode
  label: string
  text: string
  charCount: number
  fitsBudget: boolean
  source: 'ollama' | 'builtin' | 'custom'
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  endpoint: 'http://localhost:11434',
  model: 'llama3.2',
}

/**
 * Estimates character budget based on font family, font size, and available line width in points.
 */
export function estimateBudget(
  fontSize: number,
  availableWidth: number,
  family: FontFamilyKey,
): number {
  const factor = family === 'tinos' ? 0.42 : family === 'cousine' ? 0.6 : 0.5
  const estimatedCharWidth = fontSize * factor
  return Math.max(10, Math.floor(availableWidth / estimatedCharWidth))
}

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bin order to\b/gi, 'to'],
  [/\bis able to\b/gi, 'can'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\brearchitected to combine\b/gi, 'combining'],
  [/\brearchitected to\b/gi, 'designed to'],
  [/\bdesigned to combine\b/gi, 'combining'],
  [/\bmusic recommendation system\b/gi, 'music recommender'],
  [/\brecommendation system\b/gi, 'recommender'],
  [/\bat the present time\b/gi, 'currently'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\ba large number of\b/gi, 'many'],
  [/\ba majority of\b/gi, 'most'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\btake into consideration\b/gi, 'consider'],
  [/\bconduct an investigation of\b/gi, 'investigate'],
  [/\bmake an examination of\b/gi, 'examine'],
  [/\bprovide assistance to\b/gi, 'assist'],
  [/\butilize\b/gi, 'use'],
  [/\butilizes\b/gi, 'uses'],
  [/\butilizing\b/gi, 'using'],
  [/\bfurthermore\b/gi, 'also'],
  [/\bnevertheless\b/gi, 'however'],
  [/\bwith reference to\b/gi, 'regarding'],
  [/\bin connection with\b/gi, 'with'],
  [/\bin the event that\b/gi, 'if'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bas a consequence of\b/gi, 'because of'],
]

function applyReplacements(text: string): string {
  let result = text
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/\s{2,}/g, ' ').trim()
}

function truncateToWords(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const words = text.split(' ')
  let acc = ''
  for (const w of words) {
    const candidate = acc ? `${acc} ${w}` : w
    if (candidate.length > maxChars) break
    acc = candidate
  }
  return acc || text.slice(0, maxChars)
}

export function builtinSemanticOptimize(
  text: string,
  targetChars: number,
): OptimizeResult[] {
  const condensed = applyReplacements(text)

  let fitText = condensed
  if (fitText.length > targetChars) {
    fitText = fitText
      .replace(/\bvisual and audio\b/gi, 'audio-visual')
      .replace(/\baudio and visual\b/gi, 'audio-visual')
      .replace(/\bapplication\b/gi, 'app')
      .replace(/\binformation\b/gi, 'info')
      .replace(/\btechnology\b/gi, 'tech')
    if (fitText.length > targetChars) {
      fitText = truncateToWords(fitText, targetChars)
    }
  }

  let academicText = text
    .replace(/\bcombining visual and audio\b/gi, 'integrating multimodal audiovisual features')
    .replace(/\bvery accurate\b/gi, 'highly accurate')
    .replace(/\ba lot of\b/gi, 'substantial')
    .replace(/\bshows that\b/gi, 'demonstrates that')
  if (academicText.length > targetChars + 15) {
    academicText = applyReplacements(academicText)
  }

  const conciseText = truncateToWords(
    fitText
      .replace(/\baffect-aware\b/gi, 'affective')
      .replace(/\bcombining\b/gi, 'fusing'),
    Math.floor(targetChars * 0.9),
  )

  return [
    {
      id: 'opt-fit',
      mode: 'fit',
      label: '✨ Smart Fit to Line',
      text: fitText,
      charCount: fitText.length,
      fitsBudget: fitText.length <= targetChars,
      source: 'builtin',
    },
    {
      id: 'opt-academic',
      mode: 'academic',
      label: '🎓 Academic Polish',
      text: academicText,
      charCount: academicText.length,
      fitsBudget: academicText.length <= targetChars,
      source: 'builtin',
    },
    {
      id: 'opt-concise',
      mode: 'concise',
      label: '✂️ Ultra-Concise',
      text: conciseText,
      charCount: conciseText.length,
      fitsBudget: conciseText.length <= targetChars,
      source: 'builtin',
    },
  ]
}

async function queryOllama(
  prompt: string,
  config: AiConfig,
): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(`${config.endpoint.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model || 'llama3.2',
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 80,
        },
      }),
    })

    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    return data.response?.trim() || null
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

export async function testOllamaConnection(endpoint: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return res.ok
  } catch {
    clearTimeout(timeoutId)
    return false
  }
}

export async function optimizeText(
  text: string,
  targetChars: number,
  config: AiConfig = DEFAULT_AI_CONFIG,
): Promise<OptimizeResult[]> {
  try {
    const prompt = `Rewrite this single line to fit in under ${targetChars} characters while retaining its exact meaning and tone:\n"${text}"\nOutput ONLY the rewritten text without quotes or explanation:`
    const ollamaResponse = await queryOllama(prompt, config)

    if (ollamaResponse && ollamaResponse.length > 0 && ollamaResponse !== text) {
      const cleanOllama = ollamaResponse.replace(/^["']|["']$/g, '').trim()
      const fallbackList = builtinSemanticOptimize(text, targetChars)

      return [
        {
          id: 'opt-ollama',
          mode: 'fit',
          label: `✨ Ollama (${config.model}) Fit`,
          text: cleanOllama,
          charCount: cleanOllama.length,
          fitsBudget: cleanOllama.length <= targetChars,
          source: 'ollama',
        },
        ...fallbackList.slice(1),
      ]
    }
  } catch (err) {
    console.debug('Ollama unavailable, using built-in AI optimizer', err)
  }

  return builtinSemanticOptimize(text, targetChars)
}
