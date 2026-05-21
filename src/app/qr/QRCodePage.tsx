'use client'

interface Props {
  qrDataUrl: string
  submitUrl: string
}

export default function QRCodePage({ qrDataUrl, submitUrl }: Props) {
  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
          #no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* Header */}
        <div id="no-print" className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">QR Code</h1>
            <p className="text-sm text-gray-500 mt-0.5">Rate your trip or submit a complaint</p>
          </div>
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700 underline">
            ← Back to Admin
          </a>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div id="print-area" className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center max-w-sm w-full text-center">

            {/* Branding */}
            <div className="mb-6">
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-gray-400 mb-1">
                Subhan Travels
              </p>
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                Rate Your Trip
              </h2>
              <p className="text-sm text-gray-500 mt-1">Scan to rate or report a complaint</p>
            </div>

            {/* QR code */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR code linking to the passenger feedback page"
              className="w-64 h-64 rounded-xl"
            />

            {/* URL */}
            <p className="mt-4 text-xs font-mono text-gray-400 break-all">{submitUrl}</p>

            {/* Instructions */}
            <div className="mt-6 border-t border-gray-100 pt-5 space-y-1 text-sm text-gray-600">
              <p>Scan with your phone camera to open the form.</p>
              <p className="text-gray-400 italic text-xs mt-1">
                Camera se scan karein — form khul jayega
              </p>
            </div>

          </div>
        </div>

        {/* Print button */}
        <div id="no-print" className="flex justify-center pb-10">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-[#0F5D4E] text-white font-semibold rounded-xl text-sm hover:bg-[#0a4a3d] transition-colors shadow"
          >
            Print QR Code
          </button>
        </div>

      </div>
    </>
  )
}
