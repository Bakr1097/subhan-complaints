import QRCodePage from './QRCodePage'
import QRCode from 'qrcode'

export const metadata = {
  title: 'QR Code — Subhan Complaints',
}

const START_URL = 'https://subhan-complaints.vercel.app/start'

export default async function QRPage() {
  const qrDataUrl = await QRCode.toDataURL(START_URL, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#0F5D4E', light: '#FFFFFF' },
  })

  return <QRCodePage qrDataUrl={qrDataUrl} submitUrl={START_URL} />
}
