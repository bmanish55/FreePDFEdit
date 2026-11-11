import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  handleFeedbackRequest,
  handleSendOtpRequest,
  handleThankYouRequest,
  handleUpiIntentRequest,
} from './server/handlers'

function localApiPlugin(): Plugin {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0]
        const routeMap: Record<
          string,
          typeof handleSendOtpRequest
        > = {
          '/api/send-otp': handleSendOtpRequest,
          '/.netlify/functions/send-otp': handleSendOtpRequest,
          '/api/feedback': handleFeedbackRequest,
          '/.netlify/functions/feedback': handleFeedbackRequest,
          '/api/upi-intent': handleUpiIntentRequest,
          '/.netlify/functions/upi-intent': handleUpiIntentRequest,
          '/api/thank-you': handleThankYouRequest,
          '/.netlify/functions/thank-you': handleThankYouRequest,
        }

        const handler = routeMap[path]
        if (!handler) {
          return next()
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const raw = Buffer.concat(chunks).toString('utf8')
          const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined
          const result = await handler(req.method, body, env)
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.payload))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Local API handler error',
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
})
