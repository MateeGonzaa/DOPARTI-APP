import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar, Cargando } from "./ui";
import { hace } from "./Comentarios";

const PERFIL = "id, apodo, avatar_url";

// Lobby del Truco virtual: crear partida, sentarse, mirar en vivo. Si viene `comunidad`, solo muestra y crea las de ese grupo.
export default function Truco({ userId, comunidad = null, onAbrir, onVolver }) {
  const [partidas, setPartidas] = useState(null);
  const [perfiles, setPerfiles] = useState({});
  const [comunidades, setComunidades] = useState([]);
  const [meta, setMeta] = useState(15);
  const [comId, setComId] = useState(comunidad?.id ?? "");
  const [error, setError] = useState("");

  const cargar = async () => {
    let q = supabase.from("truco_partidas").select("*").neq("estado", "terminada").order("created_at", { ascending: false }).limit(40);
    if (comunidad) q = q.eq("comunidad_id", comunidad.id);
    const { data, error: e } = await q;
    if (e) { setError("No se pudo cargar el Truco. Falta ejecutar la migración de la base de datos."); return setPartidas([]); }
    const lista = data ?? [];
    setPartidas(lista);
    const ids = [...new Set(lista.flatMap((p) => [p.creador_id, p.rival_id]).filter(Boolean))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select(PERFIL).in("id", ids);
      setPerfiles((x) => ({ ...x, ...Object.fromEntries((ps ?? []).map((p) => [p.id, p])) }));
    }
  };

  useEffect(() => {
    cargar();
    const sub = supabase.channel(`truco-lobby:${comunidad?.id ?? "todas"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "truco_partidas" }, cargar)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [comunidad?.id]);

  useEffect(() => {
    if (comunidad) return;
    supabase.from("miembros").select("comunidades(id, nombre)").eq("usuario_id", userId)
      .then(({ data }) => setComunidades((data ?? []).map((m) => m.comunidades).filter(Boolean)));
  }, [userId]);

  async function crear() {
    setError("");
    const { data, error: e } = await supabase.from("truco_partidas")
      .insert({ puntos_meta: meta, comunidad_id: comId || null }).select().single();
    if (e) return setError(`No se pudo crear la partida (${e.message}).`);
    onAbrir(data.id);
  }

  if (partidas === null) return <Cargando texto="Buscando mesas de Truco…" />;
  const mias = partidas.filter((p) => p.creador_id === userId || p.rival_id === userId);
  const esperando = partidas.filter((p) => p.estado === "esperando" && !mias.includes(p));
  const envivo = partidas.filter((p) => p.estado === "jugando" && !mias.includes(p));
  const nombre = (id) => perfiles[id]?.apodo ?? "…";

  const Fila = ({ p, accion, estilo }) => (
    <li>
      <button onClick={() => onAbrir(p.id)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-panel p-3 text-left hover:bg-panel-alto">
        <Avatar perfil={perfiles[p.creador_id]} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">
            {nombre(p.creador_id)}{p.rival_id ? ` vs ${nombre(p.rival_id)}` : ""}
          </span>
          <span className="block text-sm text-tinta/70">A {p.puntos_meta} puntos · {hace(p.created_at)}
            {p.estado === "jugando" && p.juego ? ` · ${p.juego.puntos[0]} a ${p.juego.puntos[1]}` : ""}</span>
        </span>
        <span className={`${btn} shrink-0 py-1 text-sm ${estilo}`}>{accion}</span>
      </button>
    </li>
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">🃏 Truco virtual</h2>
        {onVolver && <button onClick={onVolver} className="min-h-11 px-2 font-semibold text-cesped">Volver</button>}
      </div>

      <div className="space-y-3 rounded-2xl bg-panel p-4">
        <h3 className="font-extrabold">Nueva partida 1 contra 1</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Puntos de la partida">
          {[15, 30].map((m) => (
            <button key={m} aria-pressed={meta === m} onClick={() => setMeta(m)} className={`${btn} py-1 ${meta === m ? "bg-pasto text-white" : "bg-panel-alto"}`}>A {m} puntos</button>
          ))}
        </div>
        {!comunidad && comunidades.length > 0 && (
          <label className="block text-sm font-semibold">Dónde se juega
            <select className={input} value={comId} onChange={(e) => setComId(e.target.value)}>
              <option value="">Entre amigos (sin comunidad)</option>
              {comunidades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        )}
        <button onClick={crear} className={`${btn} bg-pasto text-white`}>Crear y esperar rival</button>
        <p className="text-sm text-tinta/70">Cada partida terminada suma como partido jugado y te acerca al próximo nivel.</p>
        {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
      </div>

      {mias.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-extrabold">Tus partidas</h3>
          <ul className="grid gap-2 lg:grid-cols-2">{mias.map((p) => <Fila key={p.id} p={p} accion={p.estado === "esperando" ? "Esperando" : "Seguir"} estilo="bg-naranja text-white" />)}</ul>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-extrabold">Mesas esperando rival</h3>
        {esperando.length === 0 ? <p className="text-tinta/70">No hay mesas abiertas. Creá una y compartí el link.</p>
          : <ul className="grid gap-2 lg:grid-cols-2">{esperando.map((p) => <Fila key={p.id} p={p} accion="Sentarme" estilo="bg-pasto text-white" />)}</ul>}
      </div>
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 font-extrabold"><span aria-hidden="true" className="size-2.5 animate-pulse rounded-full bg-red-500" />En vivo ahora</h3>
        {envivo.length === 0 ? <p className="text-tinta/70">Nadie está jugando en este momento.</p>
          : <ul className="grid gap-2 lg:grid-cols-2">{envivo.map((p) => <Fila key={p.id} p={p} accion="Mirar" estilo="bg-panel-alto" />)}</ul>}
      </div>
    </section>
  );
}
