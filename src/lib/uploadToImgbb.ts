import axios from 'axios'

export async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)

  const apiKey = process.env.REACT_APP_IMGBB_KEY
  if (!apiKey) throw new Error('Не задан REACT_APP_IMGBB_KEY')

  const imgbbUrl = `https://api.imgbb.com/1/upload?key=${apiKey}`
  const resp = await axios.post(imgbbUrl, formData)
  const url: string | undefined = resp?.data?.data?.url
  if (!url) throw new Error('ImgBB вернул пустой URL')

  return url
}
