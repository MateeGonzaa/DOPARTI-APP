import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input } from "./ui";

export default function Comunidades({ onAbrir }) {
  const [lista, setLista] = useState([]);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [zonas, setZonas] = useState([]);
  const [zona, setZona] = useState("");

  const cargar = async () => {
    const { data } = await supabase.from("comunidades").select("*, zonas(nombre, provincia, lat, lng)").order("created_at", { ascending: false });
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

  async function crear() {
    const { data, error } = await supabase.rpc("crear_comunidad", { p_nombre: nombre.trim(), p_zona: zona || null });
    if (error) return setError(error.message);
    setNombre("");
    const { data: completa } = await supabase.from("comunidades").select("*, zonas(nombre, provincia, lat, lng)").eq("id", data.id).single();
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
      <section>
        <h2 className="mb-2 text-xl font-extrabold">Tus comunidades</h2>
        {lista.length === 0 ? (
          <p className="text-tinta/70">Todavía no estás en ninguna. Creá una o pedile el link de invitación a tus amigos.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((c) => (
              <li key={c.id}>
                <button onClick={() => onAbrir(c)} className="w-full rounded-2xl bg-panel p-4 text-left font-extrabold transition hover:bg-panel-alto">
                  {c.nombre}
                  {c.zonas && <span className="block text-sm font-normal text-tinta/70">{c.zonas.nombre}, {c.zonas.provincia}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="font-extrabold">Crear comunidad</h3>
        <div className="flex flex-wrap gap-2">
          <input className={input} placeholder="Ej: Los pibes del jueves" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <select aria-label="Zona" className={input} value={zona} onChange={(e) => setZona(e.target.value)}>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}, {z.provincia}</option>)}
          </select>
          <button disabled={!nombre.trim()} onClick={crear} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Crear</button>
        </div>
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
