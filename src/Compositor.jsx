import { useRef, useState } from "react";
import { btn, input } from "./ui";
import GifPicker from "./GifPicker";
import { CATEGORIAS } from "./lib/emojis";

const RECIENTES = "doparti_emojis_recientes";
const leerRecientes = () => { try { return JSON.parse(localStorage.getItem(RECIENTES)) ?? []; } catch { return []; } };
const guardarReciente = (e) => {
  try { localStorage.setItem(RECIENTES, JSON.stringify([e, ...leerRecientes().filter((x) => x !== e)].slice(0, 16))); } catch { /* sin almacenamiento */ }
};

// Caja para escribir un comentario o una respuesta, con emojis y GIFs.
export default function Compositor({ placeholder, boton = "Comentar", inicial = "", autoFocus, onEnviar, onCancelar, max = 300 }) {
  const [texto, setTexto] = useState(inicial);
  const [gif, setGif] = useState(null);
  const [panel, setPanel] = useState(null); // "emoji" | "gif" | null
  const [cat, setCat] = useState(() => (leerRecientes().length ? "recientes" : "caras"));
  const [recientes, setRecientes] = useState(leerRecientes);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  function insertar(emoji) {
    const el = ref.current;
    const ini = el?.selectionStart ?? texto.length;
    const fin = el?.selectionEnd ?? texto.length;
    const nuevo = texto.slice(0, ini) + emoji + texto.slice(fin);
    if (nuevo.length > max) return;
    setTexto(nuevo);
    guardarReciente(emoji);
    setRecientes(leerRecientes());
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(ini + emoji.length, ini + emoji.length); });
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError("");
    const err = await onEnviar({ texto: texto.trim(), gif_url: gif });
    setEnviando(false);
    if (err) return setError(err);
    setTexto(""); setGif(null); setPanel(null);
  }

  const vacio = !texto.trim() && !gif;
  const alternar = (p) => setPanel(panel === p ? null : p);
  const pestañas = [...(recientes.length ? [{ id: "recientes", icono: "🕘", nombre: "Recientes", lista: recientes }] : []), ...CATEGORIAS];
  const actual = pestañas.find((c) => c.id === cat) ?? pestañas[0];

  return (
    <form onSubmit={enviar} className="space-y-2">
      <textarea ref={ref} autoFocus={autoFocus} className={`${input} min-h-16`} maxLength={max} placeholder={placeholder} aria-label={placeholder}
        value={texto} onChange={(e) => setTexto(e.target.value)} />
      {gif && (
        <div className="relative inline-block">
          <img src={gif} alt="GIF elegido" className="max-h-40 rounded-lg" />
          <button type="button" onClick={() => setGif(null)} aria-label="Quitar GIF"
            className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/70 text-white">✕</button>
        </div>
      )}
      {panel === "emoji" && (
        <div className="rounded-lg bg-panel-alto p-2">
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Categorías de emojis">
            {pestañas.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={actual.id === c.id} aria-label={c.nombre} title={c.nombre} onClick={() => setCat(c.id)}
                className={`grid size-10 shrink-0 place-items-center rounded-lg text-xl ${actual.id === c.id ? "bg-panel ring-1 ring-cesped" : "hover:bg-panel"}`}>{c.icono}</button>
            ))}
          </div>
          <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto" role="group" aria-label={actual.nombre}>
            {actual.lista.map((x) => (
              <button key={x} type="button" onClick={() => insertar(x)} className="grid min-h-10 place-items-center rounded-lg text-xl hover:bg-panel">{x}</button>
            ))}
          </div>
        </div>
      )}
      {panel === "gif" && <GifPicker onCerrar={() => setPanel(null)} onElegir={(u) => { setGif(u); setPanel(null); }} />}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={panel === "emoji"} onClick={() => alternar("emoji")} className={`${btn} min-h-9 px-3 py-1 text-sm ${panel === "emoji" ? "bg-tinta text-fondo" : "bg-panel-alto"}`}>😊 Emojis</button>
        <button type="button" aria-pressed={panel === "gif"} onClick={() => alternar("gif")} className={`${btn} min-h-9 px-3 py-1 text-sm ${panel === "gif" ? "bg-tinta text-fondo" : "bg-panel-alto"}`}>GIFs</button>
        <span className="ml-auto text-sm text-tinta/70">{texto.length}/{max}</span>
        {onCancelar && <button type="button" onClick={onCancelar} className="px-2 py-2 text-sm font-semibold text-tinta/70">Cancelar</button>}
        <button disabled={vacio || enviando} className={`${btn} min-h-9 bg-pasto px-4 py-1 text-white disabled:opacity-40`}>{boton}</button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
    </form>
  );
}
