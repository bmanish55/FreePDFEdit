import type { ImageObject } from '../../store/usePdfStore'

export async function createMobileImageObject(file: File, page: number): Promise<ImageObject> {
  const mime = file.type as 'image/png' | 'image/jpeg'
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const width = 200
  return {
    id: crypto.randomUUID(),
    type: 'image',
    page,
    x: 50,
    y: 50,
    width,
    height: (width * image.height) / image.width,
    dataUrl,
    mime,
  }
}
