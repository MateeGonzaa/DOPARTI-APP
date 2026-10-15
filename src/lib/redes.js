// Redes sociales del perfil. Se guarda solo el usuario (o el número), nunca un link libre,
// y el link se arma acá: así nadie puede meter una URL rara en un perfil.
export const REDES = {
  instagram: { nombre: "Instagram", ejemplo: "usuario o link de tu perfil" },
  whatsapp: { nombre: "WhatsApp", ejemplo: "Con código de país: 5491155551234" },
  tiktok: { nombre: "TikTok", ejemplo: "usuario o link de tu perfil" },
  twitter: { nombre: "X (Twitter)", ejemplo: "usuario o link de tu perfil" },
};

const USUARIO = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{2,24}$/,
  twitter: /^[A-Za-z0-9_]{1,15}$/,
};

// Acepta "@usuario", "usuario" o el link completo. Devuelve { ok, valor }.
export function normalizarRed(tipo, texto) {
  const t = (texto ?? "").trim();
  if (!t) return { ok: true, valor: null };
  if (tipo === "whatsapp") {
    const m = t.match(/wa\.me\/\+?(\d+)/i);
    const d = (m ? m[1] : t).replace(/[\s()+-]/g, "");
    return /^\d{8,15}$/.test(d) ? { ok: true, valor: d } : { ok: false };
  }
  const u = t
    .replace(/^https?:\/\/(www\.|m\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com)\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return USUARIO[tipo]?.test(u) ? { ok: true, valor: u } : { ok: false };
}

export function urlDe(tipo, valor) {
  const r = normalizarRed(tipo, valor);
  if (!r.ok || !r.valor) return null;
  const v = r.valor;
  if (tipo === "instagram") return `https://www.instagram.com/${v}`;
  if (tipo === "tiktok") return `https://www.tiktok.com/@${v}`;
  if (tipo === "twitter") return `https://x.com/${v}`;
  if (tipo === "whatsapp") return `https://wa.me/${v}`;
  return null;
}
