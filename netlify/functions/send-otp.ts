import { dispatchNetlifyHandler, handleSendOtpRequest } from '../../server/handlers'

export default async function handler(req: any, res?: any) {
  return dispatchNetlifyHandler(handleSendOtpRequest, req, res)
}
