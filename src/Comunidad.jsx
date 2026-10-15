import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input } from "./ui";
import { cupo, cuando } from "./lib/logica";
import SelectorLugar from "./SelectorLugar";

const VACIO = { nombre: "", direccion: "", lat: null, lng: null };

export default function Comunidad({ comunidad, userId, onCambio, onVolver, onAbrirPartido }) {
  const [tab, setTab] = useState("partidos");
  const [partidos, setPartidos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [creando, setCreando] = useState(false);
  const [f, setF] = useState({ tipo: 7, fecha: "", hora: "", sede: "", sede_direccion: "", sede_lat: null, sede_lng: null });
  const [sede, setSede] = useState(VACIO);
  const [copiado, setCopiado] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [zonas, setZonas] = useState([]);
  const [ajustes, setAjustes] = useState({ nombre: comunidad.nombre, zona_id: comunidad.zona_id ?? "" });
  const [aviso, setAviso] = useState("");

  const cargar = async () => {
    const [a, b] = await Promise.all([
      supabase.from("partidos").select("*, inscripciones(count)").eq("comunidad_id", comunidad.id).order("fecha"),
      supabase.from("sedes").select("*").eq("comunidad_id", comunidad.id).order("nombre"),
    ]);
    setPartidos(a.data ?? []);
    setSedes(b.data ?? []);
  };
  useEffect(() => { cargar(); }, [comunidad.id]);
  useEffect(() => {
    supabase.from("miembros").select("rol").eq("comunidad_id", comunidad.id).eq("usuario_id", userId).maybeSingle()
      .then(({ data }) => setEsAdmin(data?.rol === "admin"));
    supabase.from("zonas").select("*").order("provincia").order("nombre").then(({ data }) => setZonas(data ?? []));
  }, [comunidad.id]);

  const crearPartido = async () => {
    const { data } = await supabase.from("partidos").insert({ ...f, comunidad_id: comunidad.id }).select().single();
    if (data) onAbrirPartido(data.id);
  };
  const agregarSede = async () => {
    await supabase.from("sedes").insert({ ...sede, comunidad_id: comunidad.id });
    setSede(VACIO);
    cargar();
  };
  const borrarSede = async (id) => { await supabase.from("sedes").delete().eq("id", id); cargar(); };
  const guardarAjustes = async () => {
    const { data, error } = await supabase.from("comunidades")
      .update({ nombre: ajustes.nombre.trim(), zona_id: ajustes.zona_id || null })
      .eq("id", comunidad.id).select("*, zonas(nombre, provincia, lat, lng)").single();
    if (error) return setAviso("No se pudieron guardar los cambios.");
    onCambio(data);
    setAviso("Cambios guardados.");
  };
  const eliminarComunidad = async () => {
    if (!window.confirm(`¿Eliminar "${comunidad.nombre}"? Se borran también sus partidos y sedes.`)) return;
    const { error } = await supabase.from("comunidades").delete().eq("id", comunidad.id);
    if (error) return setAviso("No se pudo eliminar la comunidad.");
    onVolver();
  };

  const centro = comunidad.zonas ? { lat: comunidad.zonas.lat, lng: comunidad.zonas.lng } : undefined;
  const link = `${location.origin}/?invitacion=${comunidad.codigo_invitacion}`;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true); } catch { /* sin permiso */ }
  };
  const visibles = partidos.filter((p) => filtro === "todos" || p.tipo === filtro);
  const setCampo = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver a comunidades</button>
      <div>
        <h2 className="break-words text-3xl font-extrabold">{comunidad.nombre}</h2>
        {comunidad.zonas && <p className="text-tinta/70">{comunidad.zonas.nombre}, {comunidad.zonas.provincia}</p>}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {[["partidos", "Partidos"], ["sedes", "Sedes"], ["invitar", "Invitar"], ...(esAdmin ? [["ajustes", "Ajustes"]] : [])].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`${btn} shrink-0 py-1 ${tab === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
        ))}
      </div>

      {tab === "partidos" && (creando ? (
        <div className="space-y-3 rounded-2xl bg-panel p-5">
          <div className="flex gap-2">
            {[7, 11].map((t) => (
              <button key={t} onClick={() => setF({ ...f, tipo: t })} className={`${btn} flex-1 ${f.tipo === t ? "bg-pasto text-white" : "bg-panel"}`}>Fútbol {t}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <label className="text-sm font-semibold">Fecha<input type="date" className={input} value={f.fecha} onChange={setCampo("fecha")} /></label>
            <label className="text-sm font-semibold">Hora<input type="time" className={input} value={f.hora} onChange={setCampo("hora")} /></label>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-semibold">Sede</span>
            {sedes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sedes.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setF({ ...f, sede: s.nombre, sede_direccion: s.direccion ?? "", sede_lat: s.lat, sede_lng: s.lng })}
                    className={`${btn} py-1 text-sm ${f.sede === s.nombre ? "bg-pasto text-white" : "bg-panel"}`}>{s.nombre}</button>
                ))}
              </div>
            )}
            <SelectorLugar centro={centro} onElegir={(l) => setF({ ...f, sede: l.nombre, sede_direccion: l.direccion, sede_lat: l.lat, sede_lng: l.lng })} />
            {f.sede && <p className="text-sm">Elegida: <b>{f.sede}</b>{f.sede_direccion && ` — ${f.sede_direccion}`}</p>}
          </div>
          <div className="flex gap-2">
            <button disabled={!f.fecha || !f.hora || !f.sede.trim()} onClick={crearPartido} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Crear partido</button>
            <button onClick={() => setCreando(false)} className={`${btn} bg-panel`}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {["todos", 7, 11].map((x) => (
                <button key={x} onClick={() => setFiltro(x)} className={`${btn} py-1 ${filtro === x ? "bg-tinta text-fondo" : "bg-panel"}`}>
                  {x === "todos" ? "Todos" : `Fútbol ${x}`}
                </button>
              ))}
            </div>
            <button onClick={() => setCreando(true)} className={`${btn} bg-pasto text-white`}>Crear partido</button>
          </div>
          {visibles.length === 0 ? (
            <p className="text-tinta/70">No hay partidos acá. Creá el primero.</p>
          ) : (
            <ul className="space-y-3">
              {visibles.map((p) => (
                <li key={p.id}>
                  <button onClick={() => onAbrirPartido(p.id)} className="w-full rounded-2xl bg-panel p-4 text-left transition hover:bg-panel-alto">
                    <div className="flex justify-between font-extrabold">
                      <span className="font-display text-lg">Fútbol {p.tipo}</span>
                      <span className="font-display text-lg tabular-nums text-cesped">{Math.min(p.inscripciones[0].count, cupo(p))}/{cupo(p)}</span>
                    </div>
                    <p className="capitalize">{cuando(p)}</p>
                    <p className="text-sm text-tinta/70">{p.sede}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ))}

      {tab === "sedes" && (
        <div className="space-y-4">
          {sedes.length === 0 && <p className="text-tinta/70">{esAdmin ? "Agregá las canchas donde suele jugar el grupo." : "Todavía no hay sedes cargadas. Las agrega quien creó la comunidad."}</p>}
          <ul className="space-y-2">
            {sedes.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-panel px-3 py-2">
                <span className="min-w-0 break-words"><b>{s.nombre}</b>{s.direccion && <span className="text-tinta/70"> — {s.direccion}</span>}</span>
                {esAdmin && <button onClick={() => borrarSede(s.id)} className="shrink-0 px-2 py-2 text-sm font-semibold text-brasa">Quitar</button>}
              </li>
            ))}
          </ul>
          {esAdmin && (
            <div className="space-y-2">
              <SelectorLugar key={sedes.length} centro={centro} onElegir={setSede} />
              {sede.nombre && <p className="text-sm">Elegida: <b>{sede.nombre}</b>{sede.direccion && ` — ${sede.direccion}`}</p>}
              <button disabled={!sede.nombre.trim()} onClick={agregarSede} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Guardar sede</button>
            </div>
          )}
        </div>
      )}

      {tab === "ajustes" && esAdmin && (
        <div className="space-y-4">
          <label className="block text-sm font-semibold">Nombre de la comunidad
            <input className={input} value={ajustes.nombre} onChange={(e) => setAjustes({ ...ajustes, nombre: e.target.value })} />
          </label>
          <label className="block text-sm font-semibold">Zona
            <select className={input} value={ajustes.zona_id} onChange={(e) => setAjustes({ ...ajustes, zona_id: e.target.value })}>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}, {z.provincia}</option>)}
            </select>
          </label>
          <button disabled={!ajustes.nombre.trim()} onClick={guardarAjustes} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Guardar cambios</button>
          {aviso && <p className="text-sm font-semibold text-cesped">{aviso}</p>}
          <div className="border-t border-tinta/15 pt-4">
            <button onClick={eliminarComunidad} className={`${btn} bg-panel text-brasa`}>Eliminar comunidad</button>
          </div>
        </div>
      )}

      {tab === "invitar" && (
        <div className="space-y-3">
          <p>Cualquiera que abra este link y tenga cuenta entra a la comunidad.</p>
          <input readOnly className={input} value={link} onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <button onClick={copiar} className={`${btn} bg-pasto text-white`}>{copiado ? "Link copiado" : "Copiar link"}</button>
            <a target="_blank" rel="noreferrer" className={`${btn} bg-panel`}
              href={`https://wa.me/?text=${encodeURIComponent(`Sumate a ${comunidad.nombre} en DOPARTI: ${link}`)}`}>Enviar por WhatsApp</a>
          </div>
          <p className="text-sm text-tinta/70">Código: {comunidad.codigo_invitacion}</p>
        </div>
      )}
    </div>
  );
}
