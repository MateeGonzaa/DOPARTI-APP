import { useState } from "react";
import { CATEGORIAS } from "./lib/emojis";

const RECIENTES = "doparti_emojis_recientes"; // mismo almacenamiento que los comentarios del perfil
const leer = () => { try { return JSON.parse(localStorage.getItem(RECIENTES)) ?? []; } catch { return []; } };
const guardar = (e) => {
  try { localStorage.setItem(RECIENTES, JSON.stringify([e, ...leer().filter((x) => x !== e)].slice(0, 16))); } catch { /* sin almacenamiento */ }
};

// Panel de emojis por categorías. onElegir(emoji) lo recibe el que lo usa.
export default function SelectorEmoji({ onElegir }) {
  const [recientes, setRecientes] = useState(leer);
  const [cat, setCat] = useState(() => (leer().length ? "recientes" : "caras"));
  const pestañas = [...(recientes.length ? [{ id: "recientes", icono: "🕘", nombre: "Recientes", lista: recientes }] : []), ...CATEGORIAS];
  const actual = pestañas.find((c) => c.id === cat) ?? pestañas[0];

  return (
    <div className="rounded-lg bg-panel-alto p-2">
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Categorías de emojis">
        {pestañas.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={actual.id === c.id} aria-label={c.nombre} title={c.nombre} onClick={() => setCat(c.id)}
            className={`grid size-10 shrink-0 place-items-center rounded-lg text-xl ${actual.id === c.id ? "bg-panel ring-1 ring-cesped" : "hover:bg-panel"}`}>{c.icono}</button>
        ))}
      </div>
      <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto" role="group" aria-label={actual.nombre}>
        {actual.lista.map((x) => (
          <button key={x} type="button" onClick={() => { guardar(x); setRecientes(leer()); onElegir(x); }}
            className="grid min-h-10 place-items-center rounded-lg text-xl hover:bg-panel">{x}</button>
        ))}
      </div>
    </div>
  );
}
