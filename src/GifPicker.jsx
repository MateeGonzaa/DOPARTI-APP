import { useEffect, useState } from "react";
import { input } from "./ui";


const KEY_PROPIA = import.meta.env.VITE_GIPHY_KEY;
const KEY = KEY_PROPIA || "dc6zaTOxFJmzC"; 

const BASE = "https://api.giphy.com/v1/gifs";
const cache = new Map(); 

const aItem = (g) => ({
  id: g.id,
  titulo: g.title,
  previa: g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url,
  url: g.images?.fixed_height?.url ?? g.images?.original?.url,
});

export default function GifPicker({ onElegir, onCerrar }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = q.trim();
    if (t.length === 1) return;
    const ctl = new AbortController();
    const url = t
      ? `${BASE}/search?api_key=${KEY}&q=${encodeURIComponent(t)}&limit=24&rating=pg-13&lang=es`
      : `${BASE}/trending?api_key=${KEY}&limit=24&rating=pg-13`;
    if (cache.has(url)) { setRes(cache.get(url)); setError(""); return; }
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(url, { signal: ctl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        const items = (j.data ?? []).map(aItem).filter((g) => g.previa && g.url);
        cache.set(url, items);
        setRes(items);
        setError("");
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message === "429" ? "GIPHY recibió demasiadas consultas por ahora. Probá en un rato." : !KEY_PROPIA ? "No se pudieron cargar los GIFs. Falta configurar VITE_GIPHY_KEY (clave gratis de developers.giphy.com)." : "No se pudieron cargar los GIFs. Probá de nuevo en un rato.");
      }
    }, t ? 500 : 0);
    return () => { clearTimeout(espera); ctl.abort(); };
  }, [q]);

  return (
    <div className="space-y-2 rounded-lg bg-panel-alto p-3">
      <div className="flex items-center gap-2">
        <input className={input} type="search" autoFocus placeholder="Buscar GIFs de lo que quieras" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" onClick={onCerrar} className="shrink-0 px-2 py-2 text-sm font-semibold text-cesped">Cerrar</button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
      {res === null && !error ? <p className="text-sm text-tinta/70">Cargando…</p> : res?.length === 0 ? (
        <p className="text-sm text-tinta/70">No encontramos GIFs para eso.</p>
      ) : (
        <ul className="grid max-h-60 grid-cols-3 gap-1 overflow-y-auto">
          {res?.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => onElegir(g.url)} aria-label={g.titulo || "Elegir GIF"} className="block aspect-square w-full overflow-hidden rounded-lg bg-panel">
                <img src={g.previa} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-right text-xs text-tinta/60">Powered by GIPHY</p>
    </div>
  );
}
