import { useEffect, useRef, useState } from "react";
import { Balon } from "./ui";
import { AUTOR } from "./lib/autor";
import { DEPORTES_COM, GRUPOS } from "./lib/modalidades";

const ENLACE = "inline-flex min-h-10 items-center rounded text-left text-sm text-tinta/60 hover:text-cesped focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cesped";
const PILDORA = "inline-flex min-h-10 items-center gap-2 rounded-full bg-panel px-3.5 text-sm font-semibold text-tinta hover:bg-panel-alto hover:text-cesped focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cesped";

const Icono = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONOS = {
  Portafolio: <Icono><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /></Icono>,
  GitHub: <Icono><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2" /></Icono>,
  LinkedIn: <Icono><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" /></Icono>,
  Instagram: <Icono><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" /></Icono>,
  Email: <Icono><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Icono>,
};

function Modal({ abierto, onCerrar, titulo, id, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [abierto]);
  return (
    <dialog ref={ref} aria-labelledby={id} onClose={onCerrar} onClick={(e) => e.target === ref.current && onCerrar()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-panel p-0 text-tinta shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      <div className="max-h-[85dvh] space-y-3 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <h2 id={id} className="font-display text-2xl font-extrabold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-lg text-xl hover:bg-panel-alto">✕</button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

// secciones: [{ texto, onClick }] y onDeporte(d) son opcionales (sin sesión no se muestran).
export default function Footer({ secciones, onDeporte }) {
  const [modal, setModal] = useState(null); // "sobre" | "licencia" | null
  const anio = new Date().getFullYear();
  const rango = anio > AUTOR.desde ? `${AUTOR.desde}–${anio}` : `${AUTOR.desde}`;
  const enlaces = [
    ["Portafolio", AUTOR.portafolio],
    ["GitHub", AUTOR.github],
    ["LinkedIn", AUTOR.linkedin],
    ["Instagram", AUTOR.instagram],
    ["Email", AUTOR.email && `mailto:${AUTOR.email}`],
  ].filter(([, url]) => url);
  const externo = (url) => (url.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" });
  const titulo = "mb-2 text-xs font-bold uppercase tracking-wider text-tinta";

  return (
    <footer className="mt-10 border-t border-white/10 pt-8 text-tinta/70">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 font-display text-2xl tracking-wide text-tinta"><Balon size={28} /> DOPARTI</span>
          <span className="rounded-full bg-pasto/20 px-2.5 py-0.5 text-xs font-semibold text-cesped ring-1 ring-cesped/30">{AUTOR.version}</span>
        </div>
        <p className="text-sm">Organizá partidos con tu gente.</p>
        <ul className="flex flex-wrap gap-2">
          {enlaces.map(([t, url]) => (
            <li key={t}><a className={PILDORA} href={url} {...externo(url)}>{ICONOS[t]}{t}</a></li>
          ))}
        </ul>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
        {secciones && (
          <nav aria-label="Secciones">
            <h2 className={titulo}>Secciones</h2>
            <ul>{secciones.map((s) => <li key={s.texto}><button className={ENLACE} onClick={s.onClick}>{s.texto}</button></li>)}</ul>
          </nav>
        )}
        {onDeporte && GRUPOS.map((g) => (
          <nav key={g.id} aria-label={g.nombre}>
            <h2 className={titulo}>{g.nombre}</h2>
            <ul>{g.lista.map((d) => <li key={d}><button className={ENLACE} onClick={() => onDeporte(d)}>{DEPORTES_COM[d].emoji} {DEPORTES_COM[d].nombre}</button></li>)}</ul>
          </nav>
        ))}
        <nav aria-label="Legal y contacto" className={secciones ? "col-span-2 sm:col-span-1" : ""}>
          <h2 className={titulo}>Legal y contacto</h2>
          <ul>
            <li><button className={ENLACE} onClick={() => setModal("sobre")}>Sobre mí</button></li>
            <li><button className={ENLACE} onClick={() => setModal("licencia")}>Licencia</button></li>
            <li><a className={ENLACE} href={AUTOR.portafolio} {...externo(AUTOR.portafolio)}>Contacto ↗</a></li>
          </ul>
        </nav>
      </div>

      <div className="mt-8 flex flex-col gap-1 border-t border-white/10 pt-4 pb-1 text-xs text-tinta/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {rango} DOPARTI · Todos los derechos reservados · {AUTOR.version}</p>
        <p>Hecho por {AUTOR.nombre}</p>
      </div>

      <Modal abierto={modal === "sobre"} onCerrar={() => setModal(null)} titulo="Sobre mí" id="modal-sobre">
        <p>Soy <strong className="text-tinta">{AUTOR.nombre}</strong>, {AUTOR.rol}. {AUTOR.bio}</p>
        <ul className="flex flex-wrap gap-2">
          {enlaces.map(([t, url]) => (
            <li key={t}><a className={`${PILDORA} !bg-panel-alto`} href={url} {...externo(url)}>{ICONOS[t]}{t}</a></li>
          ))}
        </ul>
      </Modal>

      <Modal abierto={modal === "licencia"} onCerrar={() => setModal(null)} titulo="Licencia y derechos de autor" id="modal-licencia">
        <p>DOPARTI —su código, diseño, textos, logotipo y nombre— es una obra de {AUTOR.nombre} protegida por derechos de autor. © {rango}. Todos los derechos reservados.</p>
        <p>El uso para jugadores es personal y gratuito durante la beta.</p>
        <p>No se permite copiar, modificar, redistribuir, vender ni crear obras derivadas sin autorización previa y por escrito del autor.</p>
        <p>Las bibliotecas de terceros (React, Supabase, Tailwind CSS, Vite) conservan sus propias licencias.</p>
      </Modal>
    </footer>
  );
}
