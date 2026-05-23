type ComplaintRow = {
  id: string
  reference_number: string
  severity: string
  bus_number: string | null
  category: string
  is_about_steward_head: boolean
  routes: { name: string }[] | null
}

export async function sendComplaintNotification(complaint: ComplaintRow) {
  if (complaint.is_about_steward_head) {
    console.log('[ntfy] Skipped ntfy — is_about_steward_head')
    return
  }

  const topic   = process.env.NTFY_TOPIC
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://subhan-complaints.vercel.app'

  if (!topic) {
    console.error('[ntfy] NTFY_TOPIC is not set — skipping')
    return
  }

  const isHigh    = complaint.severity === 'HIGH'
  const routeName = complaint.routes?.[0]?.name ?? 'Unknown'

  const body = `Severity: ${complaint.severity}
Route: ${routeName}
Bus: ${complaint.bus_number ?? 'N/A'}
Category: ${complaint.category}
${siteUrl}/staff/complaint/${complaint.id}`

  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Title':        `Nayi Complaint: ${complaint.reference_number}`,
        'Priority':     isHigh ? 'high' : 'default',
        'Tags':         isHigh ? 'rotating_light' : 'bell',
      },
      body,
    })
    console.log(`[ntfy] Published to topic "${topic}": HTTP ${res.status}`)
  } catch (err) {
    console.error('[ntfy] Failed to send notification:', err)
  }
}
