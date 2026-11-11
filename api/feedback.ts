import { handleFeedbackRequest } from '../server/handlers'

export default async function handler(req: any, res: any) {
  const result = await handleFeedbackRequest(req.method, req.body)
  return res.status(result.status).json(result.payload)
}
