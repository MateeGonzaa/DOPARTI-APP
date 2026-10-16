import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input } from "./ui";
import { cuando } from "./lib/logica";
import { DEPORTES_COM, etiqueta, cap } from "./lib/modalidades";
import { nombreZona, bandera } from "./lib/zonas";
import SelectorZona from "./SelectorZona";
import SelectorDeportes from "./SelectorDeportes";

export default function Comunidades({ onAbrir, userId, onAbrirPartido, onExplorar }) {
  const [lista, setLista] = useState([]);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [zonas, setZonas] = useState([]);
  const [zona, setZona] = useState("");
  const [proximos, setProximos] = useState([]);
  const [deportesNuevos, setDeportesNuevos] = useState(["futbol"]);
  const [publica, setPublica] = useState(false);

  const cargar = async () => {
    const { data } = await supabase.from("comunidades").select("*, zonas(nombre, provincia, pais, lat, lng)").order("created_at", { ascending: false });
    setLista(data ?? []);
  };
  useEffect(() => {
    cargar();
    supabase.from("zonas").select("*").order("provincia").order("nombre").then(({ data }) => {
      const z = data ?? [];
      setZonas(z);
      setZona(z.find((x) => x.nombre === "Río Cuarto")?.id ?? z[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("inscripciones")
      .select("partidos(id, deporte, tipo, fecha, hora, a_coordinar, sede, comunidades(nombre))")
      .eq("usuario_id", userId)
      .then(({ data }) => {
        const desde = Date.now() - 3 * 3600 * 1000; 
        const sinFecha = (p) => p.a_coordinar || !p.fecha || !p.hora;
        const t = (p) => (sinFecha(p) ? Infinity : new Date(`${p.fecha}T${p.hora}`).getTime());
        const lista = (data ?? []).map((d) => d.partidos).filter(Boolean)
          .filter((p) => t(p) >= desde)
          .sort((a, b) => (t(a) === t(b) ? 0 : t(a) < t(b) ? -1 : 1));
        setProximos(lista.slice(0, 5));
      });
  }, [userId]);

  async function crear() {
    const { data, error } = await supabase.rpc("crear_comunidad", { p_nombre: nombre.trim(), p_zona: zona || null });
    if (error) return setError(error.message);
    setNombre("");
    if (deportesNuevos.join() !== "futbol" || publica) await supabase.from("comunidades").update({ deportes: deportesNuevos, publica }).eq("id", data.id);
    setDeportesNuevos(["futbol"]);
    setPublica(false);
    const { data: completa } = await supabase.from("comunidades").select("*, zonas(nombre, provincia, pais, lat, lng)").eq("id", data.id).single();
    onAbrir(completa ?? data);
  }
  async function unirse() {
    const { error } = await supabase.rpc("unirse_a_comunidad", { p_codigo: codigo.trim() });
    if (error) return setError(error.message);
    setCodigo("");
    setError("");
    cargar();
  }

  return (
    <div className="space-y-6">
      {proximos.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-extrabold">Tus próximos partidos</h2>
          <ul className="space-y-2">
            {proximos.map((p) => (
              <li key={p.id}>
                <button onClick={() => onAbrirPartido(p.id)} className="w-full rounded-2xl bg-panel p-4 text-left transition hover:bg-panel-alto">
                  <span className="font-display text-lg font-extrabold">{DEPORTES_COM[p.deporte ?? "futbol"]?.emoji} {etiqueta(p)}</span>
                  <span className="block">{cap(cuando(p))}</span>
                  <span className="block text-sm text-tinta/70">{p.sede}{p.comunidades?.nombre && ` · ${p.comunidades.nombre}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button onClick={onExplorar} className="flex w-full items-center gap-3 rounded-2xl bg-pasto p-4 text-left text-white transition hover:shadow-[0_0_24px_-6px_var(--color-cesped)]">
        <span aria-hidden="true" className="text-3xl">🧭</span>
        <span>
          <span className="block font-display text-lg font-extrabold">Explorar comunidades</span>
          <span className="block text-sm text-white/85">Encontrá grupos cerca tuyo, en tu provincia o en otros países.</span>
        </span>
      </button>
      <section>
        <h2 className="mb-2 text-xl font-extrabold">Tus comunidades</h2>
        {lista.length === 0 ? (
          <p className="text-tinta/70">Todavía no estás en ninguna. Explorá las públicas, creá una o pedile el link de invitación a tus amigos.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((c) => (
              <li key={c.id}>
                <button onClick={() => onAbrir(c)} className="w-full rounded-2xl bg-panel p-4 text-left font-extrabold transition hover:bg-panel-alto">
                  {c.nombre}
                  {c.zonas && <span className="block text-sm font-normal text-tinta/70">{bandera(c.zonas.pais)} {nombreZona(c.zonas)}{c.publica && " · Pública"}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="font-extrabold">Crear comunidad</h3>
        <p className="text-sm text-tinta/70">Elegí qué se juega en tu comunidad. Podés combinar deportes con eSports y más.</p>
        <SelectorDeportes multiple valor={deportesNuevos} onChange={setDeportesNuevos} />
        <div className="flex flex-wrap gap-2">
          <input className={input} placeholder="Ej: Los pibes del jueves" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <button disabled={!nombre.trim()} onClick={crear} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Crear</button>
        </div>
        <SelectorZona zonas={zonas} valor={zona} onChange={setZona} />
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-[var(--color-pasto)]" checked={publica} onChange={(e) => setPublica(e.target.checked)} />
          <span>Comunidad pública <span className="font-normal text-tinta/70">(aparece en Explorar y cualquiera puede unirse)</span></span>
        </label>
      </section>
      <section className="space-y-2">
        <h3 className="font-extrabold">Unirme con un código</h3>
        <div className="flex gap-2">
          <input className={input} placeholder="Código de invitación" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <button disabled={!codigo.trim()} onClick={unirse} className={`${btn} bg-tinta text-fondo disabled:opacity-40`}>Unirme</button>
        </div>
      </section>
      {error && <p className="text-sm font-semibold text-brasa">{error}</p>}
    </div>
  );
}
