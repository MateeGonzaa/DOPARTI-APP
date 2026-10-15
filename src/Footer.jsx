import { Balon } from "./ui";
import { AUTOR } from "./lib/autor";

const PILL = "inline-flex min-h-10 items-center rounded-lg bg-panel-alto px-3 font-semibold text-cesped hover:bg-pasto hover:text-white";

export default function Footer() {
  const anio = new Date().getFullYear();
  const rango = anio > AUTOR.desde ? `${AUTOR.desde}–${anio}` : `${AUTOR.desde}`;
  const enlaces = [
    ["Portafolio", AUTOR.portafolio],
    ["GitHub", AUTOR.github],
    ["LinkedIn", AUTOR.linkedin],
    ["Email", AUTOR.email && `mailto:${AUTOR.email}`],
  ].filter(([, url]) => url);

  return (
    <footer className="mt-8 space-y-3 border-t border-white/10 pt-4 text-xs text-tinta/70">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-display text-lg tracking-wide text-tinta">
          <Balon size={22} /> DOPARTI
        </span>
        <span className="rounded-full bg-pasto/20 px-2.5 py-0.5 font-semibold text-cesped ring-1 ring-cesped/30">{AUTOR.version}</span>
      </div>

      <section aria-labelledby="sobre-mi" className="space-y-2 rounded-2xl bg-panel p-3">
        <h2 id="sobre-mi" className="font-display text-sm font-extrabold text-tinta">Sobre mí</h2>
        <p>Soy <strong className="font-semibold text-tinta">{AUTOR.nombre}</strong>, {AUTOR.rol}. {AUTOR.bio}</p>
        {enlaces.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {enlaces.map(([t, url]) => (
              <li key={t}><a className={PILL} href={url} target={url.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">{t} <span aria-hidden="true" className="ml-1">↗</span></a></li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center">© {rango} DOPARTI · Todos los derechos reservados · {AUTOR.version}</p>

      <details className="rounded-2xl bg-panel px-3 py-1">
        <summary className="flex min-h-10 cursor-pointer items-center font-semibold text-tinta">Licencia y derechos de autor</summary>
        <div className="space-y-1.5 pb-2">
          <p>DOPARTI —su código, diseño, textos, logotipo y nombre— es una obra de {AUTOR.nombre} protegida por derechos de autor. El uso para jugadores es personal y gratuito durante la beta.</p>
          <p>No se permite copiar, modificar, redistribuir ni crear obras derivadas sin autorización previa y por escrito del autor.</p>
          <p>Las bibliotecas de terceros (React, Supabase, Tailwind CSS, Vite) conservan sus propias licencias.</p>
        </div>
      </details>
    </footer>
  );
}
