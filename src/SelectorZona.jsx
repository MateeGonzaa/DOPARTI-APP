import { input } from "./ui";
import { PAIS_BASE, bandera, paisesDe, provinciasDe, ciudadesDe } from "./lib/zonas";

// Modo elegir (crear / ajustes): valor = id de zona, onChange(id).
// Modo filtro (Explorar): valor = { pais, provincia, zonaId }, onChange(objeto); "" = todos.
export default function SelectorZona({ zonas, valor, onChange, filtro = false }) {
  if (!zonas.length) return null;
  const zona = zonas.find((z) => z.id === (filtro ? valor.zonaId : valor));
  const pais = filtro ? valor.pais : zona?.pais ?? PAIS_BASE;
  const provincia = filtro ? valor.provincia : zona?.provincia ?? "";
  const provincias = pais ? provinciasDe(zonas, pais) : [];
  const ciudades = pais && provincia ? ciudadesDe(zonas, pais, provincia) : [];

  const cambiarPais = (p) => {
    if (filtro) return onChange({ pais: p, provincia: "", zonaId: "" });
    const prov = provinciasDe(zonas, p)[0];
    onChange(ciudadesDe(zonas, p, prov)[0]?.id ?? "");
  };
  const cambiarProvincia = (prov) => {
    if (filtro) return onChange({ pais, provincia: prov, zonaId: "" });
    onChange(ciudadesDe(zonas, pais, prov)[0]?.id ?? "");
  };
  const cambiarCiudad = (id) => (filtro ? onChange({ pais, provincia, zonaId: id }) : onChange(id));

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="block text-sm font-semibold">País
        <select className={input} value={pais} onChange={(e) => cambiarPais(e.target.value)}>
          {filtro && <option value="">Todos los países</option>}
          {paisesDe(zonas).map((p) => <option key={p} value={p}>{bandera(p)} {p}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Provincia / región
        <select className={input} value={provincia} disabled={!pais} onChange={(e) => cambiarProvincia(e.target.value)}>
          {filtro && <option value="">Todas</option>}
          {provincias.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Ciudad
        <select className={input} value={filtro ? valor.zonaId : valor} disabled={!provincia} onChange={(e) => cambiarCiudad(e.target.value)}>
          {filtro && <option value="">Todas</option>}
          {ciudades.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
      </label>
    </div>
  );
}
