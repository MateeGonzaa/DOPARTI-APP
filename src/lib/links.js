const usuarioDe = (v) =>
  v.trim().replace(/^https?:\/\/(www\.)?[^/]+\//i, '').replace(/^@/, '').split(/[/?#]/)[0]

export const linkInstagram = (v) => (v ? `https://instagram.com/${usuarioDe(v)}` : null)
export const linkTikTok = (v) => (v ? `https://www.tiktok.com/@${usuarioDe(v)}` : null)
export const linkX = (v) => (v ? `https://x.com/${usuarioDe(v)}` : null)

export const linkWhatsApp = (v) => {
  const n = v?.replace(/\D/g, '')
  return n ? `https://wa.me/${n}` : null
}


export function linkPersonal(v) {
  if (!v?.trim()) return null
  const url = /^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`
  try {
    const u = new URL(url)
    return ['http:', 'https:'].includes(u.protocol) ? u.href : null
  } catch {
    return null
  }
}