import { dispatchNetlifyHandler, handleThankYouRequest } from '../../server/handlers'

export default async function handler(req: any, res?: any) {
  return dispatchNetlifyHandler(handleThankYouRequest, req, res)
}
