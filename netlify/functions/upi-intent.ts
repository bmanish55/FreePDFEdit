import { dispatchNetlifyHandler, handleUpiIntentRequest } from '../../server/handlers'

export default async function handler(req: any, res?: any) {
  return dispatchNetlifyHandler(handleUpiIntentRequest, req, res)
}
