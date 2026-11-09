import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { debugMatchFont } from './lib/fonts/fontMatcher'
import { loadFont } from './lib/fonts/fontLoader'
import { debugLayoutText } from './lib/text/layoutText'

if (import.meta.env.DEV) {
  debugMatchFont()
  debugLayoutText()
  loadFont({ family: 'carlito', bold: true, italic: false })
    .then((font) => {
      console.log('Loaded carlito-bold test:', {
        ascent: font.ascent,
        descent: font.descent,
        measureHello12: font.measure('Hello', 12),
      })
    })
    .catch((err) => {
      console.warn('Dev font loader notice:', err.message)
    })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
