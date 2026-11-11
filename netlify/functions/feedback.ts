import { dispatchNetlifyHandler, handleFeedbackRequest } from '../../server/handlers'

export default async function handler(req: any, res?: any) {
  return dispatchNetlifyHandler(handleFeedbackRequest, req, res)
}
