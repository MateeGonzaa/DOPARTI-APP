import { AUTOR } from "./lib/autor";

const LINK = "inline-block py-1.5 underline-offset-2 hover:text-cesped hover:underline";

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
    <footer className="mt-8 border-t border-white/10 pt-3 text-center text-xs text-tinta/60">
      <p>
        Hecho por <strong className="font-semibold text-tinta/80">{AUTOR.nombre}</strong> · {AUTOR.rol}
      </p>
      <p className="flex flex-wrap items-center justify-center gap-x-2">
        {enlaces.map(([t, url], i) => (
          <span key={t} className="inline-flex gap-2">
            {i > 0 && <span aria-hidden="true">·</span>}
            <a className={LINK} href={url} target={url.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">{t}</a>
          </span>
        ))}
      </p>
      <p>© {rango} {AUTOR.nombre} · Todos los derechos reservados · {AUTOR.version}</p>
      <details className="mt-1">
        <summary className="inline-block cursor-pointer py-1.5 underline-offset-2 hover:text-cesped hover:underline">Licencia</summary>
        <p className="mx-auto max-w-sm pb-1 text-left">
          DOPARTI (código, diseño, textos, logotipo y nombre) es una obra protegida por derechos de autor. Uso personal y gratuito durante la beta.
          No se permite copiar, modificar, redistribuir ni crear obras derivadas sin autorización escrita del autor.
          Las bibliotecas de terceros conservan sus propias licencias.
        </p>
      </details>
    </footer>
  );
}
