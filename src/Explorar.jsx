import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input } from "./ui";
import { DEPORTES_COM } from "./lib/modalidades";
import { bandera, distanciaKm, formatoKm, nombreZona } from "./lib/zonas";
import SelectorZona from "./SelectorZona";
import SelectorDeportes from "./SelectorDeportes";

const ORDENES = [["activas", "Más activas"], ["cerca", "Más cerca"], ["miembros", "Más grandes"], ["nuevas", "Más nuevas"]];
const FILA = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function PedirCiudad() {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ pais: "", provincia: "", nombre: "" });
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const completo = f.pais.trim().length > 1 && f.provincia.trim().length > 1 && f.nombre.trim().length > 1;

  async function enviar() {
    const { error } = await supabase.from("zonas_pedidas").insert({ pais: f.pais.trim(), provincia: f.provincia.trim(), nombre: f.nombre.trim() });
    if (error) return setMsg("No se pudo enviar el pedido. Probá de nuevo más tarde.");
    setF({ pais: "", provincia: "", nombre: "" });
    setMsg("¡Gracias! Vamos a sumar tu ciudad pronto.");
  }

  if (!abierto) return <button onClick={() => setAbierto(true)} className="font-semibold text-cesped underline-offset-2 hover:underline">¿No encontrás tu ciudad? Pedila acá</button>;
  return (
    <div className="space-y-2 rounded-2xl bg-panel p-4">
      <p className="font-extrabold">Pedir una ciudad</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={input} aria-label="País" placeholder="País" maxLength={60} value={f.pais} onChange={set("pais")} />
        <input className={input} aria-label="Provincia o región" placeholder="Provincia / región" maxLength={80} value={f.provincia} onChange={set("provincia")} />
        <input className={input} aria-label="Ciudad" placeholder="Ciudad" maxLength={80} value={f.nombre} onChange={set("nombre")} />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={!completo} onClick={enviar} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Enviar pedido</button>
        {msg && <p role="status" className="text-sm font-semibold text-cesped">{msg}</p>}
      </div>
    </div>
  );
}

export default function Explorar({ onVolver, onAbrir, onCrear, deporteInicial = "" }) {
  const [zonas, setZonas] = useState([]);
  const [filtro, setFiltro] = useState({ pais: "", provincia: "", zonaId: "" });
  const [texto, setTexto] = useState("");
  const [deporte, setDeporte] = useState(deporteInicial);
  const [orden, setOrden] = useState("activas");
  const [pos, setPos] = useState(null);
  const [aviso, setAviso] = useState("");
  const [res, setRes] = useState(null); // null = cargando
  const [populares, setPopulares] = useState([]);
  const [uniendo, setUniendo] = useState("");

  useEffect(() => {
    supabase.from("zonas").select("*").then(({ data }) => setZonas(data ?? []));
    supabase.rpc("zonas_con_comunidades").then(({ data }) => setPopulares(data ?? []));
  }, []);

  useEffect(() => {
    let vigente = true;
    const t = setTimeout(async () => {
      setRes(null);
      const { data, error } = await supabase.rpc("explorar_comunidades", {
        p_pais: filtro.pais || null, p_provincia: filtro.provincia || null, p_zona: filtro.zonaId || null,
        p_texto: texto.trim() || null, p_deporte: deporte || null,
      });
      if (!vigente) return;
      if (error) setAviso("No se pudo buscar. ¿Ya ejecutaste migracion6_explorar.sql en Supabase?");
      setRes(data ?? []);
    }, texto ? 300 : 0);
    return () => { vigente = false; clearTimeout(t); };
  }, [filtro, texto, deporte]);

  const lista = useMemo(() => {
    const conKm = (res ?? []).map((c) => ({ ...c, km: pos && c.lat != null ? distanciaKm(pos, { lat: c.lat, lng: c.lng }) : null }));
    const n = (x) => x ?? 1e9;
    return conKm.sort((a, b) =>
      orden === "cerca" ? n(a.km) - n(b.km)
        : orden === "activas" ? b.proximos - a.proximos || b.miembros - a.miembros
        : orden === "miembros" ? b.miembros - a.miembros
        : new Date(b.created_at) - new Date(a.created_at));
  }, [res, pos, orden]);

  const cerca = () => {
    if (!navigator.geolocation) return setAviso("Tu navegador no permite usar la ubicación.");
    setAviso("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setOrden("cerca"); setAviso("Ordenadas por cercanía. Tu ubicación no se guarda en ningún lado."); },
      () => setAviso("No pudimos acceder a tu ubicación. Podés elegir tu ciudad en los filtros."),
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  const abrir = async (c) => {
    const { data } = await supabase.from("comunidades").select("*, zonas(nombre, provincia, pais, lat, lng)").eq("id", c.id).single();
    if (data) onAbrir(data);
  };
  const unirse = async (c) => {
    setUniendo(c.id);
    const { error } = await supabase.rpc("unirse_a_comunidad_publica", { p_id: c.id });
    setUniendo("");
    if (error) return setAviso(error.message);
    abrir(c);
  };

  const hayFiltros = filtro.pais || texto || deporte;

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver a mis comunidades</button>
      <div>
        <h2 className="text-3xl font-extrabold">Explorar comunidades</h2>
        <p className="text-tinta/70">Encontrá grupos públicos de tu zona y sumate a jugar.</p>
      </div>

      <div className="space-y-3 rounded-2xl bg-panel p-4">
        <input className={input} type="search" aria-label="Buscar por nombre" placeholder="Buscar por nombre…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <SelectorZona zonas={zonas} filtro valor={filtro} onChange={setFiltro} />
        <SelectorDeportes valor={deporte} onChange={setDeporte} conTodos scroll />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={cerca} className={`${btn} bg-pasto text-white`}>📍 Cerca de mí</button>
          <label className="flex items-center gap-2 text-sm font-semibold">Ordenar por
            <select className={`${input} !min-h-9 !w-auto !py-1`} value={orden} onChange={(e) => setOrden(e.target.value)}>
              {ORDENES.map(([k, t]) => <option key={k} value={k} disabled={k === "cerca" && !pos}>{t}{k === "cerca" && !pos ? " (activá la ubicación)" : ""}</option>)}
            </select>
          </label>
        </div>
        {aviso && <p role="status" className="text-sm font-semibold text-cesped">{aviso}</p>}
      </div>

      {populares.length > 0 && (
        <section aria-label="Ciudades con comunidades">
          <h3 className="mb-2 text-sm font-semibold text-tinta/70">Ciudades con movimiento</h3>
          <div className={FILA}>
            {populares.map((z) => (
              <button key={z.id} onClick={() => setFiltro({ pais: z.pais, provincia: z.provincia, zonaId: z.id })}
                className={`${btn} shrink-0 bg-panel py-1 text-sm ${filtro.zonaId === z.id ? "ring-2 ring-cesped" : ""}`}>
                {bandera(z.pais)} {z.nombre} <span className="ml-1 rounded-full bg-panel-alto px-2 text-xs">{z.cantidad}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-live="polite" className="space-y-3">
        {res === null ? <p className="text-tinta/70">Buscando comunidades…</p> : (
          <>
            <p className="text-sm text-tinta/70">{lista.length} {lista.length === 1 ? "comunidad" : "comunidades"}{hayFiltros ? " con esos filtros" : " públicas"}</p>
            {lista.length === 0 ? (
              <div className="space-y-3 rounded-2xl bg-panel p-4">
                <p className="font-extrabold">Todavía no hay comunidades públicas acá.</p>
                <p className="text-tinta/70">Sé el primero: creá una y marcala como pública para que otros jugadores te encuentren.</p>
                <button onClick={onCrear} className={`${btn} bg-pasto text-white`}>Crear una comunidad</button>
              </div>
            ) : (
              <ul className="space-y-2">
                {lista.map((c) => (
                  <li key={c.id} className="space-y-2 rounded-2xl bg-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="break-words font-display text-lg font-extrabold">{c.nombre}</h4>
                        {c.zona && <p className="text-sm text-tinta/70">{bandera(c.pais)} {nombreZona({ nombre: c.zona, provincia: c.provincia, pais: c.pais })}{c.km != null && ` · ≈ ${formatoKm(c.km).replace("a ", "")}`}</p>}
                      </div>
                      {c.proximos > 0 && <span className="shrink-0 rounded-full bg-pasto px-2 py-0.5 text-xs font-bold text-white">Activa</span>}
                    </div>
                    {c.descripcion && <p className="text-sm">{c.descripcion}</p>}
                    <div className="flex flex-wrap gap-1.5 text-sm">
                      {(c.deportes ?? []).filter((d) => DEPORTES_COM[d]).map((d) => <span key={d} className="rounded-full bg-panel-alto px-2 py-0.5">{DEPORTES_COM[d].emoji} {DEPORTES_COM[d].nombre}</span>)}
                      <span className="rounded-full bg-panel-alto px-2 py-0.5">👥 {c.miembros}</span>
                      <span className="rounded-full bg-panel-alto px-2 py-0.5">📅 {c.proximos} {c.proximos === 1 ? "próximo" : "próximos"}</span>
                    </div>
                    {c.soy_miembro
                      ? <button onClick={() => abrir(c)} className={`${btn} bg-panel-alto`}>Ya sos miembro · Abrir</button>
                      : <button disabled={uniendo === c.id} onClick={() => unirse(c)} className={`${btn} bg-pasto text-white disabled:opacity-40`}>{uniendo === c.id ? "Uniéndote…" : "Unirme"}</button>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <PedirCiudad />
    </div>
  );
}
