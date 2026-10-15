import { Balon } from "./ui";
import { AUTOR } from "./lib/autor";

const ENLACE = "inline-flex min-h-11 items-center rounded-lg bg-panel-alto px-3 font-semibold text-cesped hover:bg-panel";

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
    <footer className="mt-10 space-y-4 border-t border-white/10 pt-6 text-sm text-tinta/70">
      <div className="flex items-center gap-2 font-display text-base text-tinta">
        <Balon size={22} /> DOPARTI
        <span className="rounded-full bg-panel px-2 py-0.5 font-sans text-xs">{AUTOR.version}</span>
      </div>

      <section aria-labelledby="sobre-mi" className="space-y-2 rounded-2xl bg-panel p-4">
        <h2 id="sobre-mi" className="font-display text-lg font-extrabold text-tinta">Sobre mí</h2>
        <p>Soy <strong className="text-tinta">{AUTOR.nombre}</strong>, {AUTOR.rol}. {AUTOR.bio}</p>
        {enlaces.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {enlaces.map(([t, url]) => (
              <li key={t}><a className={ENLACE} href={url} target={url.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">{t}</a></li>
            ))}
          </ul>
        )}
      </section>

      <p>© {rango} {AUTOR.nombre}. Todos los derechos reservados.</p>
      <details className="rounded-2xl bg-panel p-4">
        <summary className="cursor-pointer font-semibold text-tinta">Licencia y derechos de autor</summary>
        <div className="mt-2 space-y-2">
          <p>DOPARTI —su código, diseño, textos, logotipo y nombre— es una obra protegida por la legislación de derechos de autor. Su uso por parte de los jugadores es personal y gratuito durante la beta.</p>
          <p>No está permitido copiar, modificar, redistribuir, revender ni crear obras derivadas de DOPARTI sin autorización previa y por escrito de su autor.</p>
          <p>Las bibliotecas de terceros que utiliza (React, Supabase, Tailwind CSS, Vite) conservan sus propias licencias.</p>
        </div>
      </details>
    </footer>
  );
}
