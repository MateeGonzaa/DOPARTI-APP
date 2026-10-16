import { useMemo } from "react";
import { PALOS, fuerza } from "./lib/truco";

// Cartas españolas dibujadas en SVG: no hay imágenes que cargar.
const COLORES = { E: "#1d4ed8", B: "#166534", O: "#b45309", C: "#b91c1c" };

export function IconoPalo({ p, size = 28 }) {
  const color = COLORES[p];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill={color}>
      {p === "E" && (<><polygon points="12,1 15.2,13 8.8,13" /><rect x="6.5" y="13" width="11" height="2.2" rx="1.1" /><rect x="10.8" y="15" width="2.4" height="5" /><circle cx="12" cy="21.3" r="1.6" /></>)}
      {p === "B" && <path d="M12 1.5c3.4 0 4.6 3.3 3.4 5.6l-1.2 2.6 1.4 12.3H8.4l1.4-12.3-1.2-2.6C7.4 4.8 8.6 1.5 12 1.5z" />}
      {p === "O" && (<><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="6" fill="none" stroke="#fffaf0" strokeWidth="1.6" /><circle cx="12" cy="12" r="2.4" fill="#fffaf0" /></>)}
      {p === "C" && (<><path d="M4.5 3h15c0 6.6-3.2 10-7.5 10S4.5 9.6 4.5 3z" /><rect x="10.9" y="13" width="2.2" height="6" /><rect x="6.5" y="19" width="11" height="2.4" rx="1.2" /></>)}
    </svg>
  );
}

const TAM = {
  grande: "h-[6.8rem] w-[4.6rem] sm:h-[8.6rem] sm:w-24",
  chica: "h-[5rem] w-[3.4rem] sm:h-[5.9rem] sm:w-16",
};

// c = { n, p }. Si `oculta`, se muestra el dorso. Si hay onClick es un botón.
export function Carta({ c, oculta = false, chica = false, onClick, deshabilitada = false, className = "", style }) {
  const tam = chica ? TAM.chica : TAM.grande;
  const base = `relative shrink-0 select-none overflow-hidden rounded-xl shadow-lg shadow-black/50 ${tam} ${className}`;

  if (oculta || !c) {
    return (
      <div aria-label="Carta boca abajo" style={{ background: "repeating-linear-gradient(45deg,#14532d,#14532d 6px,#166534 6px,#166534 12px)", ...style }}
        className={`${base} border-2 border-[#f4f8f5]/80`}>
        <span className="absolute inset-2 rounded-md border border-[#f4f8f5]/30" />
      </div>
    );
  }

  const destacada = fuerza(c) >= 11; // las 4 cartas "matadoras"
  const color = COLORES[c.p];
  const cara = (
    <>
      <span className="absolute left-1.5 top-1 font-display text-lg font-extrabold leading-none sm:text-2xl" style={{ color }}>{c.n}</span>
      <span className="absolute inset-0 grid place-items-center"><IconoPalo p={c.p} size={chica ? 30 : 44} /></span>
      <span className="absolute bottom-1 right-1.5 rotate-180 font-display text-lg font-extrabold leading-none sm:text-2xl" style={{ color }}>{c.n}</span>
    </>
  );
  const clases = `${base} bg-[#fffaf0] ${destacada ? "ring-2 ring-amber-400" : "ring-1 ring-black/20"}`;
  const nombre = `${c.n} de ${PALOS[c.p]}`;

  return onClick ? (
    <button type="button" onClick={onClick} disabled={deshabilitada} aria-label={`Jugar ${nombre}`} style={style}
      className={`${clases} transition-transform ${deshabilitada ? "opacity-70" : "hover:-translate-y-2 focus-visible:-translate-y-2"}`}>
      {cara}
    </button>
  ) : (
    <div role="img" aria-label={nombre} className={clases} style={style}>{cara}</div>
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
