import { handleSendOtpRequest } from '../server/handlers'

export default async function handler(req: any, res: any) {
  const result = await handleSendOtpRequest(req.method, req.body)
  return res.status(result.status).json(result.payload)
}
