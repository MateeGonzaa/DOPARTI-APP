import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar } from "./ui";

const PERFIL = "id, apodo, nombre_completo, avatar_url";

function Persona({ p, onVer, children }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2">
      <button onClick={() => onVer(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar perfil={p} size={36} />
        <span className="min-w-0">
          <b className="block truncate">{p.apodo}</b>
          <span className="block truncate text-sm text-tinta/70">{p.nombre_completo}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

export default function Amigos({ userId, onVolver, onVerPerfil, onCambio }) {
  const [tab, setTab] = useState("amigos");
  const [filas, setFilas] = useState([]);
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const cargar = async () => {
    const { data } = await supabase
      .from("amistades")
      .select(`id, solicitante_id, destinatario_id, estado, solicitante:profiles!solicitante_id(${PERFIL}), destinatario:profiles!destinatario_id(${PERFIL})`)
      .order("created_at", { ascending: false });
    setFilas(data ?? []);
    onCambio?.();
  };
  useEffect(() => { cargar(); }, []);

  const otro = (f) => (f.solicitante_id === userId ? f.destinatario : f.solicitante);
  const amigos = filas.filter((f) => f.estado === "aceptada");
  const recibidas = filas.filter((f) => f.estado === "pendiente" && f.destinatario_id === userId);
  const enviadas = filas.filter((f) => f.estado === "pendiente" && f.solicitante_id === userId);
  const relacion = (uid) => filas.find((f) => otro(f)?.id === uid);

  const pedir = async (uid) => { await supabase.from("amistades").insert({ solicitante_id: userId, destinatario_id: uid }); cargar(); };
  const responder = async (id, aceptar) => { await supabase.rpc("responder_solicitud", { p_id: id, p_aceptar: aceptar }); cargar(); };
  const quitar = async (f) => {
    if (f.estado === "aceptada" && !window.confirm(`¿Quitar a ${otro(f)?.apodo} de tus amigos?`)) return;
    await supabase.from("amistades").delete().eq("id", f.id);
    cargar();
  };

  async function buscar(e) {
    e.preventDefault();
    const t = q.trim().replace(/[%_,()]/g, "");
    if (t.length < 2) return;
    setBuscando(true);
    const { data } = await supabase.from("profiles").select(PERFIL).ilike("apodo", `%${t}%`).neq("id", userId).order("apodo").limit(15);
    setRes(data ?? []);
    setBuscando(false);
  }

  const tabs = [["amigos", `Amigos (${amigos.length})`], ["solicitudes", `Solicitudes${recibidas.length ? ` (${recibidas.length})` : ""}`], ["buscar", "Buscar"]];

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <h2 className="text-3xl font-extrabold">Amigos</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {tabs.map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`${btn} shrink-0 py-1 ${tab === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
        ))}
      </div>

      {tab === "amigos" && (amigos.length === 0
        ? <p className="text-tinta/70">Todavía no tenés amigos. Buscalos por apodo o entrá al perfil de alguien de tu comunidad.</p>
        : <ul className="space-y-2">{amigos.map((f) => (
            <Persona key={f.id} p={otro(f)} onVer={onVerPerfil}>
              <button onClick={() => quitar(f)} className="px-2 py-2 text-sm font-semibold text-brasa">Quitar</button>
            </Persona>
          ))}</ul>)}

      {tab === "solicitudes" && (
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="font-extrabold">Recibidas</h3>
            {recibidas.length === 0 ? <p className="text-tinta/70">No tenés solicitudes pendientes.</p> : (
              <ul className="space-y-2">{recibidas.map((f) => (
                <Persona key={f.id} p={otro(f)} onVer={onVerPerfil}>
                  <button onClick={() => responder(f.id, true)} className={`${btn} min-h-9 bg-pasto px-3 py-1 text-sm text-white`}>Aceptar</button>
                  <button onClick={() => responder(f.id, false)} className="px-2 py-2 text-sm font-semibold text-brasa">Rechazar</button>
                </Persona>
              ))}</ul>
            )}
          </section>
          {enviadas.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-extrabold">Enviadas</h3>
              <ul className="space-y-2">{enviadas.map((f) => (
                <Persona key={f.id} p={otro(f)} onVer={onVerPerfil}>
                  <button onClick={() => quitar(f)} className="px-2 py-2 text-sm font-semibold text-brasa">Cancelar</button>
                </Persona>
              ))}</ul>
            </section>
          )}
        </div>
      )}

      {tab === "buscar" && (
        <div className="space-y-3">
          <form onSubmit={buscar} className="flex gap-2">
            <input className={input} placeholder="Buscar por apodo" value={q} onChange={(e) => setQ(e.target.value)} />
            <button disabled={q.trim().length < 2 || buscando} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Buscar</button>
          </form>
          {res && (res.length === 0 ? <p className="text-tinta/70">No encontramos a nadie con ese apodo.</p> : (
            <ul className="space-y-2">{res.map((p) => {
              const r = relacion(p.id);
              return (
                <Persona key={p.id} p={p} onVer={onVerPerfil}>
                  {!r && <button onClick={() => pedir(p.id)} className={`${btn} min-h-9 bg-pasto px-3 py-1 text-sm text-white`}>Agregar</button>}
                  {r?.estado === "aceptada" && <span className="px-2 text-sm font-semibold text-cesped">Amigos</span>}
                  {r?.estado === "pendiente" && r.solicitante_id === userId && <span className="px-2 text-sm text-tinta/70">Enviada</span>}
                  {r?.estado === "pendiente" && r.destinatario_id === userId && (
                    <button onClick={() => responder(r.id, true)} className={`${btn} min-h-9 bg-pasto px-3 py-1 text-sm text-white`}>Aceptar</button>
                  )}
                </Persona>
              );
            })}</ul>
          ))}
        </div>
      )}
    </div>
  );
}
