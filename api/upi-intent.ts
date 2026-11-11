import { handleUpiIntentRequest } from '../server/handlers'

export default async function handler(req: any, res: any) {
  const result = await handleUpiIntentRequest(req.method, req.body)
  return res.status(result.status).json(result.payload)
}
