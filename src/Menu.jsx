import { useEffect } from "react";
import { Avatar } from "./ui";

export default function Menu({ abierto, onCerrar, perfil, items }) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  return (
    <div className={`fixed inset-0 z-50 ${abierto ? "" : "pointer-events-none"}`}>
      <div onClick={onCerrar} aria-hidden="true"
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${abierto ? "opacity-100" : "opacity-0"}`} />
      <nav id="menu" aria-label="Menú principal" inert={abierto ? undefined : ""}
        className={`absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-1 bg-panel p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${abierto ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-3 flex items-center gap-3 border-b border-white/10 pb-4">
          <Avatar perfil={perfil} size={48} />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{perfil?.apodo}</p>
            <p className="truncate text-sm text-tinta/70">{perfil?.nombre_completo}</p>
          </div>
        </div>
        {items.map((it) => (
          <button key={it.texto} onClick={() => { onCerrar(); it.onClick(); }}
            className={`flex min-h-12 items-center rounded-lg px-3 text-left font-semibold hover:bg-panel-alto ${it.peligro ? "mt-auto text-brasa" : ""}`}>
            {it.texto}
            {it.insignia > 0 && <span className="ml-2 rounded-full bg-naranja px-2 text-sm text-white">{it.insignia}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
