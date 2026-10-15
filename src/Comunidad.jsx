import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar } from "./ui";
import { cupo, cuando } from "./lib/logica";
import { DEPORTES_COM, ORDEN, configDe, etiqueta, cap } from "./lib/modalidades";
import SelectorLugar from "./SelectorLugar";
import SelectorZona from "./SelectorZona";
import { nombreZona, bandera } from "./lib/zonas";
import Planificaciones from "./Planificaciones";

const FILA = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const ESTADOS = [["proximos", "Próximos"], ["coordinar", "A coordinar"], ["abiertos", "Abiertos"], ["pasados", "Anteriores"], ["todos", "Todos"]];
const sinFecha = (p) => p.a_coordinar || !p.fecha || !p.hora;
const instante = (p) => (sinFecha(p) ? Infinity : new Date(`${p.fecha}T${p.hora}`).getTime());
const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);
const SEDE_VACIA = { nombre: "", direccion: "", lat: null, lng: null };

export default function Comunidad({ comunidad, userId, onCambio, onVolver, onAbrirPartido, onVerPerfil }) {
  const cfg = configDe(comunidad);
  const [tab, setTab] = useState("partidos");
  const [partidos, setPartidos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [fDeporte, setFDeporte] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [fEstado, setFEstado] = useState("proximos");
  const [creando, setCreando] = useState(false);
  const [f, setF] = useState({ deporte: cfg.deportes[0], tipo: cfg.modalidades[cfg.deportes[0]][0], fecha: "", hora: "", sede: "", sede_direccion: "", sede_lat: null, sede_lng: null, a_coordinar: false });
  const [sede, setSede] = useState(SEDE_VACIA);
  const [copiado, setCopiado] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [zonas, setZonas] = useState([]);
  const [ajustes, setAjustes] = useState({ nombre: comunidad.nombre, zona_id: comunidad.zona_id ?? "", whatsapp_link: comunidad.whatsapp_link ?? "", publica: comunidad.publica ?? false, descripcion: comunidad.descripcion ?? "", deportes: cfg.deportes, modalidades: cfg.modalidades });
  const [aviso, setAviso] = useState("");
  const [errorPartido, setErrorPartido] = useState("");
  const [otro, setOtro] = useState({});

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

    if (a_coordinar) Object.assign(datos, { a_coordinar: true, fecha: null, hora: null });
    const { data, error } = await supabase.from("partidos").insert(datos).select().single();
    if (error) return setErrorPartido(`No se pudo crear el partido: ${error.message}`);
    onAbrirPartido(data.id);
  };
  const agregarSede = async () => {
    await supabase.from("sedes").insert({ nombre: sede.nombre.trim(), direccion: sede.direccion.trim(), lat: sede.lat, lng: sede.lng, comunidad_id: comunidad.id });
    setSede(SEDE_VACIA);
    cargar();
  };
  const borrarSede = async (id) => { await supabase.from("sedes").delete().eq("id", id); cargar(); };
  const guardarAjustes = async () => {
    const wsp = ajustes.whatsapp_link.trim();
    if (wsp && !wsp.startsWith("https://chat.whatsapp.com/")) return setAviso("El link del grupo debe empezar con https://chat.whatsapp.com/");
    const { data, error } = await supabase.from("comunidades")
      .update({ nombre: ajustes.nombre.trim(), zona_id: ajustes.zona_id || null, whatsapp_link: wsp || null, publica: ajustes.publica, descripcion: ajustes.descripcion.trim() || null, deportes: ajustes.deportes,
        modalidades: Object.fromEntries(ajustes.deportes.map((d) => [d, ajustes.modalidades[d] ?? DEPORTES_COM[d].preset])) })
      .eq("id", comunidad.id).select("*, zonas(nombre, provincia, pais, lat, lng)").single();
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
  const ahora = Date.now();
  const esFuturo = (p) => sinFecha(p) || instante(p) >= ahora - 3 * 3600 * 1000; // sigue "próximo" hasta 3 h después de empezar
  const depDe = (p) => p.deporte ?? "futbol";
  const deporteActivo = cfg.deportes.length === 1 ? cfg.deportes[0] : fDeporte !== "todos" ? fDeporte : null;
  const tiposDisp = deporteActivo
    ? [...new Set([...(cfg.modalidades[deporteActivo] ?? []), ...partidos.filter((p) => depDe(p) === deporteActivo).map((p) => p.tipo)])].sort((a, b) => a - b)
    : [];
  const visibles = partidos
    .filter((p) => (fDeporte === "todos" || depDe(p) === fDeporte)
      && (!deporteActivo || fTipo === "todos" || p.tipo === fTipo)
      && (fEstado === "todos" || (fEstado === "proximos" && esFuturo(p)) || (fEstado === "coordinar" && sinFecha(p))
        || (fEstado === "abiertos" && p.abierto) || (fEstado === "pasados" && !esFuturo(p))))
    .sort((a, b) => (fEstado === "pasados" ? cmp(instante(b), instante(a)) : cmp(instante(a), instante(b))));
  const abrirCrear = () => {
    const d = cfg.deportes.includes(f.deporte) ? f.deporte : cfg.deportes[0];
    const m = cfg.modalidades[d];
    setF({ ...f, deporte: d, tipo: m.includes(f.tipo) ? f.tipo : m[0] });
    setCreando(true);
  };
  const setCampo = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const centro = comunidad.zonas?.lat != null ? { lat: comunidad.zonas.lat, lng: comunidad.zonas.lng } : undefined;
  const alternarDeporte = (d) => {
    const on = ajustes.deportes.includes(d);
    if (on && ajustes.deportes.length === 1) return; // al menos un deporte
    const deportes = on ? ajustes.deportes.filter((x) => x !== d) : ORDEN.filter((x) => x === d || ajustes.deportes.includes(x));
    setAjustes({ ...ajustes, deportes, modalidades: { ...ajustes.modalidades, [d]: ajustes.modalidades[d]?.length ? ajustes.modalidades[d] : DEPORTES_COM[d].preset } });
  };
  const alternarModalidad = (d, t) => {
    const act = ajustes.modalidades[d] ?? [];
    const nuevas = act.includes(t) ? act.filter((x) => x !== t) : [...act, t].sort((a, b) => a - b);
    if (!nuevas.length) return; // al menos una modalidad por deporte
    setAjustes({ ...ajustes, modalidades: { ...ajustes.modalidades, [d]: nuevas } });
  };
  const agregarOtra = (d) => {
    const n = Number(otro[d]);
    if (!Number.isInteger(n) || n < 1 || n > 15) return;
    if (!(ajustes.modalidades[d] ?? []).includes(n)) alternarModalidad(d, n);
    setOtro({ ...otro, [d]: "" });
  };

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver a comunidades</button>
      <div>
        <h2 className="break-words text-3xl font-extrabold">{comunidad.nombre}</h2>
        {comunidad.zonas && <p className="text-tinta/70">{bandera(comunidad.zonas.pais)} {nombreZona(comunidad.zonas)}{comunidad.publica && " · Pública"}</p>}
        {comunidad.descripcion && <p className="mt-1">{comunidad.descripcion}</p>}
        {comunidad.whatsapp_link && (
          <a href={comunidad.whatsapp_link} target="_blank" rel="noreferrer" className={`${btn} mt-3 bg-panel text-cesped`}>Abrir grupo de WhatsApp</a>
        )}
      </div>
      <div className={FILA}>
        {[["partidos", "Partidos"], ["plan", "Planificación"], ["sedes", "Sedes"], ["miembros", "Miembros"], ["invitar", "Invitar"], ...(esAdmin ? [["ajustes", "Ajustes"]] : [])].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`${btn} shrink-0 py-1 ${tab === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
        ))}
      </div>

      {tab === "partidos" && (creando ? (
        <div className="space-y-3 rounded-2xl bg-panel p-5">
          {cfg.deportes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {cfg.deportes.map((d) => (
                <button key={d} type="button" aria-pressed={f.deporte === d} onClick={() => setF({ ...f, deporte: d, tipo: cfg.modalidades[d][0] })}
                  className={`${btn} py-1 ${f.deporte === d ? "bg-pasto text-white" : "bg-panel-alto"}`}>{DEPORTES_COM[d].emoji} {DEPORTES_COM[d].nombre}</button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(cfg.modalidades[f.deporte] ?? []).map((t) => (
              <button key={t} type="button" aria-pressed={f.tipo === t} onClick={() => setF({ ...f, tipo: t })}
                className={`${btn} py-1 ${f.tipo === t ? "bg-pasto text-white" : "bg-panel-alto"}`}>{DEPORTES_COM[f.deporte].formato(t)}</button>
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
                    onClick={() => setF({ ...f, sede: s.nombre, sede_direccion: s.direccion ?? "", sede_lat: s.lat ?? null, sede_lng: s.lng ?? null })}
                    className={`${btn} py-1 text-sm ${f.sede === s.nombre ? "bg-pasto text-white" : "bg-panel-alto"}`}>{s.nombre}</button>
                ))}
              </div>
            )}
            <SelectorLugar centro={centro}
              onElegir={(l) => setF((x) => ({ ...x, sede: l.nombre, sede_direccion: l.direccion, sede_lat: l.lat, sede_lng: l.lng }))} />
            <input className={input} placeholder="Nombre de la cancha" value={f.sede}
              onChange={(e) => setF({ ...f, sede: e.target.value, sede_lat: null, sede_lng: null })} />
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
          <div className="space-y-3">
            <button onClick={abrirCrear} className={`${btn} w-full bg-pasto text-white sm:w-auto`}>Crear partido</button>
            {cfg.deportes.length > 1 && (
              <div className={FILA} role="group" aria-label="Filtrar por deporte">
                {[["todos", "Todos los deportes"], ...cfg.deportes.map((d) => [d, `${DEPORTES_COM[d].emoji} ${DEPORTES_COM[d].nombre}`])].map(([k, t]) => (
                  <button key={k} onClick={() => { setFDeporte(k); setFTipo("todos"); }} className={`${btn} shrink-0 py-1 ${fDeporte === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
                ))}
              </div>
            )}
            {deporteActivo && tiposDisp.length > 1 && (
              <div className={FILA} role="group" aria-label="Filtrar por modalidad">
                {[["todos", "Todas"], ...tiposDisp.map((t) => [t, DEPORTES_COM[deporteActivo].formato(t)])].map(([k, t]) => (
                  <button key={k} onClick={() => setFTipo(k)} className={`${btn} shrink-0 py-1 ${fTipo === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
                ))}
              </div>
            )}
            <div className={FILA} role="group" aria-label="Filtrar por estado">
              {ESTADOS.map(([k, t]) => (
                <button key={k} onClick={() => setFEstado(k)} className={`${btn} shrink-0 py-1 ${fEstado === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
              ))}
            </div>
          </div>
          {visibles.length === 0 ? (
            <p className="text-tinta/70">No hay partidos acá. Creá el primero.</p>
          ) : (
            <ul className="space-y-3">
              {visibles.map((p) => (
                <li key={p.id}>
                  <button onClick={() => onAbrirPartido(p.id)} className="w-full rounded-2xl bg-panel p-4 text-left transition hover:bg-panel-alto">
                    <div className="flex justify-between font-extrabold">
                      <span className="font-display text-lg">{DEPORTES_COM[p.deporte ?? "futbol"]?.emoji} {etiqueta(p)}</span>
                      <span className="font-display text-lg tabular-nums text-cesped">{Math.min(p.inscripciones[0].count, cupo(p))}/{cupo(p)}</span>
                    </div>
                    <p>{cap(cuando(p))}</p>
                    <p className="text-sm text-tinta/70">{p.sede}{p.abierto && " · Abierto a otras comunidades"}</p>
                    {p.resultado_a != null && <p className="text-sm font-semibold text-cesped">Resultado: {p.resultado_a} - {p.resultado_b}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ))}

      {tab === "plan" && <Planificaciones comunidad={comunidad} esAdmin={esAdmin} sedes={sedes} onAbrirPartido={onAbrirPartido} />}

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
              <SelectorLugar key={sedes.length} centro={centro}
                onElegir={(l) => setSede((x) => ({ ...x, nombre: l.nombre, direccion: l.direccion, lat: l.lat, lng: l.lng }))} />
              <input className={input} placeholder="Nombre de la cancha" value={sede.nombre} onChange={(e) => setSede({ ...sede, nombre: e.target.value, lat: null, lng: null })} />
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
          <SelectorZona zonas={zonas} valor={ajustes.zona_id} onChange={(id) => setAjustes({ ...ajustes, zona_id: id })} />
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-[var(--color-pasto)]" checked={ajustes.publica} onChange={(e) => setAjustes({ ...ajustes, publica: e.target.checked })} />
            <span>Comunidad pública <span className="font-normal text-tinta/70">(aparece en Explorar y cualquiera puede unirse sin código)</span></span>
          </label>
          <label className="block text-sm font-semibold">Descripción corta (opcional)
            <input className={input} maxLength={140} placeholder="Ej: Fútbol 7 los jueves a las 21 en Las Quintas" value={ajustes.descripcion} onChange={(e) => setAjustes({ ...ajustes, descripcion: e.target.value })} />
            <span className="block text-xs font-normal text-tinta/70">{ajustes.descripcion.length}/140</span>
          </label>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Deportes de la comunidad</legend>
            <div className="flex flex-wrap gap-2">
              {ORDEN.map((d) => (
                <button key={d} type="button" aria-pressed={ajustes.deportes.includes(d)} onClick={() => alternarDeporte(d)}
                  className={`${btn} py-1 ${ajustes.deportes.includes(d) ? "bg-pasto text-white" : "bg-panel"}`}>{DEPORTES_COM[d].emoji} {DEPORTES_COM[d].nombre}</button>
              ))}
            </div>
            {ajustes.deportes.map((d) => (
              <div key={d} className="space-y-2 rounded-2xl bg-panel p-3">
                <p className="text-sm font-semibold">{DEPORTES_COM[d].emoji} Modalidades de {DEPORTES_COM[d].nombre}</p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...DEPORTES_COM[d].preset, ...(ajustes.modalidades[d] ?? [])])].sort((a, b) => a - b).map((t) => (
                    <button key={t} type="button" aria-pressed={(ajustes.modalidades[d] ?? []).includes(t)} onClick={() => alternarModalidad(d, t)}
                      className={`${btn} py-1 text-sm ${(ajustes.modalidades[d] ?? []).includes(t) ? "bg-pasto text-white" : "bg-panel-alto"}`}>{DEPORTES_COM[d].formato(t)}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className={input} type="number" inputMode="numeric" min={1} max={15} placeholder="Otra: jugadores por equipo"
                    value={otro[d] ?? ""} onChange={(e) => setOtro({ ...otro, [d]: e.target.value })} />
                  <button type="button" onClick={() => agregarOtra(d)} className={`${btn} shrink-0 bg-panel-alto`}>Agregar</button>
                </div>
              </div>
            ))}
          </fieldset>
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
