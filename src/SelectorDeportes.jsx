import { btn } from "./ui";
import { DEPORTES_COM, GRUPOS, ORDEN } from "./lib/modalidades";

const FILA = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Dos filtros separados: "Deportes" y "eSports y más".
//  - multiple: elegís varios (crear / editar comunidad). `valor` es un array y siempre queda al menos uno.
//  - simple:   elegís uno (Explorar). `valor` es un texto ("" = todos) y `conTodos` agrega el botón "Todos".
export default function SelectorDeportes({ valor, onChange, multiple = false, conTodos = false, scroll = false }) {
  const elegidos = multiple ? valor : valor ? [valor] : [];

  const alternar = (d) => {
    if (!multiple) return onChange(valor === d ? "" : d);
    const activo = elegidos.includes(d);
    if (activo && elegidos.length === 1) return; // al menos uno
    onChange(ORDEN.filter((x) => (x === d ? !activo : elegidos.includes(x))));
  };

  const estiloActivo = multiple ? "bg-pasto text-white" : "bg-tinta text-fondo";
  const estiloInactivo = multiple ? "bg-panel" : "bg-panel-alto";

  return (
    <div className="space-y-3">
      {conTodos && (
        <button type="button" aria-pressed={!valor} onClick={() => onChange("")}
          className={`${btn} py-1 text-sm ${!valor ? "bg-tinta text-fondo" : "bg-panel-alto"}`}>Todos</button>
      )}
      {GRUPOS.map((g) => {
        const cuantos = g.lista.filter((d) => elegidos.includes(d)).length;
        return (
          <div key={g.id} role="group" aria-label={g.nombre} className="space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <span aria-hidden="true">{g.icono}</span> {g.nombre}
              {cuantos > 0 && <span className="rounded-full bg-pasto px-2 text-xs font-bold text-white">{cuantos}</span>}
            </p>
            <div className={scroll ? FILA : "flex flex-wrap gap-2"}>
              {g.lista.map((d) => {
                const on = elegidos.includes(d);
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => alternar(d)}
                    className={`${btn} py-1 text-sm ${scroll ? "shrink-0" : ""} ${on ? estiloActivo : estiloInactivo}`}>
                    {DEPORTES_COM[d].emoji} {DEPORTES_COM[d].nombre}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
