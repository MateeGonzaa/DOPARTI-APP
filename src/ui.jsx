export const btn = "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cesped";
export const input = "min-h-11 w-full rounded-lg border border-tinta/25 bg-panel px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-cesped";

export const POSICIONES = ["Arquero", "Defensor", "Mediocampista", "Delantero"];
export const PIES = [["diestro", "Diestro"], ["zurdo", "Zurdo"], ["ambidiestro", "Ambidiestro"]];
export const nombrePie = (v) => PIES.find(([k]) => k === v)?.[1];

// Cada 3 partidos jugados se sube un nivel. No tiene tope.
export const nivelDe = (jugados) => Math.floor(jugados / 3) + 1;

export function Nivel({ jugados }) {
  const n = nivelDe(jugados);
  const en = jugados % 3;
  const faltan = 3 - en;
  return (
    <div className="rounded-2xl bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl font-extrabold text-cesped">Nivel {n}</span>
        <span className="text-sm text-tinta/70">{jugados} {jugados === 1 ? "partido jugado" : "partidos jugados"}</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i < en ? "bg-cesped shadow-[0_0_10px_var(--color-cesped)]" : "bg-tinta/15"}`} />
        ))}
      </div>
      <p className="mt-1 text-sm text-tinta/70">
        {faltan} {faltan === 1 ? "partido" : "partidos"} para el nivel {n + 1}
      </p>
    </div>
  );
}

export function Avatar({ perfil, size = 32 }) {
  const style = { width: size, height: size };
  return perfil?.avatar_url ? (
    <img src={perfil.avatar_url} alt="" style={style} className="rounded-full object-cover" />
  ) : (
    <span style={style} className="inline-flex items-center justify-center rounded-full bg-pasto font-bold text-white">
      {(perfil?.apodo || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Balon({ size = 28, className = "" }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="#f4f8f5" stroke="#0f2118" strokeWidth="1.5" />
      <polygon points="16,9.5 22,13.8 19.7,20.8 12.3,20.8 10,13.8" fill="#0f2118" />
      <path d="M16 9.5V2.5M22 13.8l6.5-2.2M19.7 20.8l4 5.8M12.3 20.8l-4 5.8M10 13.8l-6.5-2.2"
        stroke="#0f2118" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display tracking-wide">
      <Balon size={28} className="balon-rueda" />
      DOPARTI
    </span>
  );
}

export function Cargando({ texto = "Cargando…" }) {
  return (
    <div role="status" className="flex flex-col items-center gap-1 py-16 text-tinta/70">
      <Balon size={36} className="balon-pique" />
      <span className="sombra-balon" aria-hidden="true" />
      <span className="mt-2 text-sm">{texto}</span>
    </div>
  );
}
