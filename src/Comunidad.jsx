import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar } from "./ui";
import { cupo, cuando } from "./lib/logica";

const TIPOS = [5, 7, 11];
const SEDE_VACIA = { nombre: "", direccion: "" };

export default function Comunidad({ comunidad, userId, onCambio, onVolver, onAbrirPartido, onVerPerfil }) {
  const [tab, setTab] = useState("partidos");
  const [partidos, setPartidos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [creando, setCreando] = useState(false);
  const [f, setF] = useState({ tipo: 7, fecha: "", hora: "", sede: "", sede_direccion: "", a_coordinar: false });
  const [sede, setSede] = useState(SEDE_VACIA);
  const [copiado, setCopiado] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [zonas, setZonas] = useState([]);
  const [ajustes, setAjustes] = useState({ nombre: comunidad.nombre, zona_id: comunidad.zona_id ?? "", whatsapp_link: comunidad.whatsapp_link ?? "" });
  const [aviso, setAviso] = useState("");
  const [errorPartido, setErrorPartido] = useState("");

  const cargar = async () => {
    const [a, b] = await Promise.all([
      supabase.from("partidos").select("*, inscripciones(count)").eq("comunidad_id", comunidad.id).order("fecha"),
      supabase.from("sedes").select("*").eq("comunidad_id", comunidad.id).order("nombre"),
    ]);
    setPartidos(a.data ?? []);
    setSedes(b.data ?? []);
  };
  const cargarMiembros = async () => {
    const { data: m } = await supabase.from("miembros").select("usuario_id").eq("comunidad_id", comunidad.id);
    const ids = (m ?? []).map((x) => x.usuario_id);
    if (!ids.length) return setMiembros([]);
    const { data } = await supabase.from("profiles").select("id, apodo, nombre_completo, avatar_url").in("id", ids).order("apodo");
    setMiembros(data ?? []);
  };
  useEffect(() => { cargar(); cargarMiembros(); }, [comunidad.id]);
  useEffect(() => {
    supabase.from("miembros").select("rol").eq("comunidad_id", comunidad.id).eq("usuario_id", userId).maybeSingle()
      .then(({ data }) => setEsAdmin(data?.rol === "admin"));
    supabase.from("zonas").select("*").order("provincia").order("nombre").then(({ data }) => setZonas(data ?? []));
  }, [comunidad.id]);

  const crearPartido = async () => {
    setErrorPartido("");
    const { a_coordinar, ...base } = f;
    const datos = { ...base, sede: f.sede.trim(), sede_direccion: f.sede_direccion.trim(), comunidad_id: comunidad.id };
    // a_coordinar solo se manda cuando se usa, así los partidos con fecha no dependen de esa columna.
    if (a_coordinar) Object.assign(datos, { a_coordinar: true, fecha: null, hora: null });
    const { data, error } = await supabase.from("partidos").insert(datos).select().single();
    if (error) return setErrorPartido(`No se pudo crear el partido: ${error.message}`);
    onAbrirPartido(data.id);
  };
  const agregarSede = async () => {
    await supabase.from("sedes").insert({ nombre: sede.nombre.trim(), direccion: sede.direccion.trim(), comunidad_id: comunidad.id });
    setSede(SEDE_VACIA);
    cargar();
  };
  const borrarSede = async (id) => { await supabase.from("sedes").delete().eq("id", id); cargar(); };
  const guardarAjustes = async () => {
    const wsp = ajustes.whatsapp_link.trim();
    if (wsp && !wsp.startsWith("https://chat.whatsapp.com/")) return setAviso("El link del grupo debe empezar con https://chat.whatsapp.com/");
    const { data, error } = await supabase.from("comunidades")
      .update({ nombre: ajustes.nombre.trim(), zona_id: ajustes.zona_id || null, whatsapp_link: wsp || null })
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
        {comunidad.whatsapp_link && (
          <a href={comunidad.whatsapp_link} target="_blank" rel="noreferrer" className={`${btn} mt-3 bg-panel text-cesped`}>Abrir grupo de WhatsApp</a>
        )}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {[["partidos", "Partidos"], ["sedes", "Sedes"], ["miembros", "Miembros"], ["invitar", "Invitar"], ...(esAdmin ? [["ajustes", "Ajustes"]] : [])].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`${btn} shrink-0 py-1 ${tab === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
        ))}
      </div>

      {tab === "partidos" && (creando ? (
        <div className="space-y-3 rounded-2xl bg-panel p-5">
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <button key={t} onClick={() => setF({ ...f, tipo: t })} className={`${btn} flex-1 ${f.tipo === t ? "bg-pasto text-white" : "bg-panel-alto"}`}>Fútbol {t}</button>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-pasto" checked={f.a_coordinar} onChange={(e) => setF({ ...f, a_coordinar: e.target.checked })} />
            Fecha y hora a coordinar con el grupo
          </label>
          {!f.a_coordinar && (
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <label className="text-sm font-semibold">Fecha<input type="date" className={input} value={f.fecha} onChange={setCampo("fecha")} /></label>
              <label className="text-sm font-semibold">Hora<input type="time" className={input} value={f.hora} onChange={setCampo("hora")} /></label>
            </div>
          )}
          <div className="space-y-2">
            <span className="text-sm font-semibold">Sede</span>
            {sedes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sedes.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setF({ ...f, sede: s.nombre, sede_direccion: s.direccion ?? "" })}
                    className={`${btn} py-1 text-sm ${f.sede === s.nombre ? "bg-pasto text-white" : "bg-panel-alto"}`}>{s.nombre}</button>
                ))}
              </div>
            )}
            <input className={input} placeholder="Nombre de la cancha" value={f.sede} onChange={setCampo("sede")} />
            <input className={input} placeholder="Dirección (opcional)" value={f.sede_direccion} onChange={setCampo("sede_direccion")} />
          </div>
          {errorPartido && <p role="alert" className="text-sm font-semibold text-brasa">{errorPartido}</p>}
          <div className="flex gap-2">
            <button disabled={(!f.a_coordinar && (!f.fecha || !f.hora)) || !f.sede.trim()} onClick={crearPartido} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Crear partido</button>
            <button onClick={() => setCreando(false)} className={`${btn} bg-panel-alto`}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {["todos", ...TIPOS].map((x) => (
                <button key={x} onClick={() => setFiltro(x)} className={`${btn} py-1 ${filtro === x ? "bg-tinta text-fondo" : "bg-panel"}`}>
                  {x === "todos" ? "Todos" : `F${x}`}
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
              <input className={input} placeholder="Nombre de la cancha" value={sede.nombre} onChange={(e) => setSede({ ...sede, nombre: e.target.value })} />
              <input className={input} placeholder="Dirección (opcional)" value={sede.direccion} onChange={(e) => setSede({ ...sede, direccion: e.target.value })} />
              <button disabled={!sede.nombre.trim()} onClick={agregarSede} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Guardar sede</button>
            </div>
          )}
        </div>
      )}

      {tab === "miembros" && (
        <ul className="space-y-2">
          {miembros.map((m) => (
            <li key={m.id}>
              <button onClick={() => onVerPerfil(m.id)} className="flex w-full items-center gap-3 rounded-lg bg-panel px-3 py-2 text-left hover:bg-panel-alto">
                <Avatar perfil={m} size={36} />
                <span className="min-w-0">
                  <b className="block truncate">{m.apodo}</b>
                  <span className="block truncate text-sm text-tinta/70">{m.nombre_completo}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
          <label className="block text-sm font-semibold">Link del grupo de WhatsApp (opcional)
            <input className={input} inputMode="url" placeholder="https://chat.whatsapp.com/..." value={ajustes.whatsapp_link} onChange={(e) => setAjustes({ ...ajustes, whatsapp_link: e.target.value })} />
          </label>
          <p className="-mt-2 text-sm text-tinta/70">En WhatsApp: abrí el grupo, Info del grupo, Invitar al grupo mediante enlace, Copiar enlace.</p>
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
