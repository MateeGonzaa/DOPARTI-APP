import { btn, input } from "./ui";
import { DEPORTES, LISTA, GENEROS, PIES, MANOS } from "./lib/deportes";


export default function CamposJugador({ f, setF }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const alternar = (d) => {
    const esta = f.deportes.includes(d);
    if (esta && f.deportes.length === 1) return; 
    setF({ ...f, deportes: esta ? f.deportes.filter((x) => x !== d) : [...f.deportes, d] });
  };
  const usaPie = f.deportes.includes("futbol");
  const usaMano = f.deportes.some((d) => d !== "futbol" && DEPORTES[d]?.usaMano !== false);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">Edad
          <input className={input} type="number" inputMode="numeric" min={8} max={90} required value={f.edad} onChange={set("edad")} />
        </label>
        <label className="block text-sm font-semibold">Género
          <select className={input} value={f.genero} onChange={set("genero")}>
            {GENEROS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Qué te gusta jugar</legend>
        <div className="flex flex-wrap gap-2">
          {LISTA.map((d) => (
            <button key={d} type="button" aria-pressed={f.deportes.includes(d)} onClick={() => alternar(d)}
              className={`${btn} py-1 ${f.deportes.includes(d) ? "bg-pasto text-white" : "bg-panel"}`}>
              {DEPORTES[d].emoji} {DEPORTES[d].nombre}
            </button>
          ))}
        </div>
      </fieldset>

      {(usaPie || usaMano) && (
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          {usaPie && (
            <label className="block text-sm font-semibold">Pie hábil
              <select className={input} value={f.pie} onChange={set("pie")}>
                {PIES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </label>
          )}
          {usaMano && (
            <label className="block text-sm font-semibold">Mano hábil
              <select className={input} value={f.mano} onChange={set("mano")}>
                {MANOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {f.deportes.map((d) => (
        <label key={d} className="block text-sm font-semibold">Posición en {DEPORTES[d].nombre}
          <select className={input} value={f.posiciones[d] ?? ""} onChange={(e) => setF({ ...f, posiciones: { ...f.posiciones, [d]: e.target.value } })}>
            <option value="">Sin preferencia</option>
            {DEPORTES[d].posiciones.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      ))}
    </>
  );
}
