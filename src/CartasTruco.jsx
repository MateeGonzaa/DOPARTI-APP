import { useMemo } from "react";
import { PALOS, fuerza } from "./lib/truco";
import { svgCarta, svgDorso } from "./lib/cartasSvg";

// Cartas de la baraja española con el estilo de las de truco argentinas.
// El dibujo sale de lib/cartasSvg.js (solo recibe número y palo, nunca texto de usuarios).
const TAM = {
  grande: "h-[6.9rem] w-[4.6rem] sm:h-36 sm:w-24",
  chica: "h-[5.1rem] w-[3.4rem] sm:h-24 sm:w-16",
};

const Dibujo = ({ html }) => (
  <svg viewBox="0 0 100 150" className="block h-full w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
);

// c = { n, p }. Si `oculta`, se muestra el dorso. Si hay onClick es un botón.
export function Carta({ c, oculta = false, chica = false, onClick, deshabilitada = false, className = "", style }) {
  const tam = chica ? TAM.chica : TAM.grande;
  const base = `relative shrink-0 select-none rounded-[0.7rem] shadow-lg shadow-black/50 ${tam} ${className}`;

  if (oculta || !c) {
    return <div role="img" aria-label="Carta boca abajo" style={style} className={base}><Dibujo html={svgDorso()} /></div>;
  }

  const destacada = fuerza(c) >= 11; // las 4 cartas "matadoras": ancho de espada y de basto, siete de espada y de oro
  const clases = `${base} ${destacada ? "ring-2 ring-amber-400" : ""}`;
  const nombre = `${c.n} de ${PALOS[c.p]}`;

  return onClick ? (
    <button type="button" onClick={onClick} disabled={deshabilitada} aria-label={`Jugar ${nombre}`} style={style}
      className={`${clases} transition-transform ${deshabilitada ? "opacity-70" : "hover:-translate-y-2 focus-visible:-translate-y-2"}`}>
      <Dibujo html={svgCarta(c.n, c.p)} />
    </button>
  ) : (
    <div role="img" aria-label={nombre} className={clases} style={style}><Dibujo html={svgCarta(c.n, c.p)} /></div>
  );
}

const COLORES_CONFETI = ["#5fe08d", "#ff8f5a", "#1c78b8", "#fbbf24", "#f4f8f5", "#ef4444"];

export function Confeti({ cantidad = 44 }) {
  const piezas = useMemo(() => Array.from({ length: cantidad }, (_, i) => ({
    i,
    izq: Math.random() * 100,
    delay: Math.random() * 1.2,
    dur: 2.4 + Math.random() * 2,
    color: COLORES_CONFETI[i % COLORES_CONFETI.length],
    ancho: 6 + Math.random() * 6,
  })), [cantidad]);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {piezas.map((p) => (
        <span key={p.i} className="confeti-pieza absolute top-0 block rounded-sm"
          style={{ left: `${p.izq}%`, width: p.ancho, height: p.ancho * 1.6, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </div>
  );
}
