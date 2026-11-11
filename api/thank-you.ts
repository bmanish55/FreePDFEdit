import { handleThankYouRequest } from '../server/handlers'

export default async function handler(req: any, res: any) {
  const result = await handleThankYouRequest(req.method, req.body)
  return res.status(result.status).json(result.payload)
}
