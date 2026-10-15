import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input } from "./ui";
import SelectorLugar from "./SelectorLugar";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TIPOS = [5, 7, 11];
const VACIA = { dia_semana: 4, hora: "21:00", tipo: 7, sede: "", sede_direccion: "", sede_lat: null, sede_lng: null, notas: "" };
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Próxima fecha (a partir de ahora) en que cae ese día de la semana a esa hora.
function proxima(dia, hora) {
  const [h, m] = hora.split(":").map(Number);
  const ahora = new Date();
  const d = new Date();
  d.setHours(h, m, 0, 0);
  let diff = (dia - d.getDay() + 7) % 7;
  if (diff === 0 && d <= ahora) diff = 7;
  d.setDate(d.getDate() + diff);
  return { fecha: ymd(d), hora: `${pad(h)}:${pad(m)}`, d };
}

export default function Planificaciones({ comunidad, esAdmin, sedes, onAbrirPartido }) {
  const [planes, setPlanes] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [nuevo, setNuevo] = useState(VACIA);
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState("");

  const cargar = async () => {
    const [a, b] = await Promise.all([
      supabase.from("planificaciones").select("*").eq("comunidad_id", comunidad.id),
      supabase.from("partidos").select("id, fecha, hora").eq("comunidad_id", comunidad.id).gte("fecha", ymd(new Date())),
    ]);
    const orden = (x) => ((x.dia_semana + 6) % 7) * 10000 + Number(x.hora.slice(0, 2)) * 60 + Number(x.hora.slice(3, 5)); // lunes primero
    setPlanes((a.data ?? []).sort((x, y) => orden(x) - orden(y)));
    setPartidos(b.data ?? []);
  };
  useEffect(() => { cargar(); }, [comunidad.id]);

  async function agregar() {
    setError("");
    const { error } = await supabase.from("planificaciones").insert({
      comunidad_id: comunidad.id, dia_semana: nuevo.dia_semana, hora: nuevo.hora, tipo: nuevo.tipo,
      sede: nuevo.sede.trim(), sede_direccion: nuevo.sede_direccion.trim() || null,
      sede_lat: nuevo.sede_lat, sede_lng: nuevo.sede_lng, notas: nuevo.notas.trim() || null,
    });
    if (error) return setError("No se pudo guardar la planificación.");
    setNuevo(VACIA);
    setAgregando(false);
    cargar();
  }
  const quitar = async (id) => {
    if (!window.confirm("¿Quitar esta planificación? Los partidos ya creados no se borran.")) return;
    await supabase.from("planificaciones").delete().eq("id", id);
    cargar();
  };

  const existente = (pl) => {
    const pr = proxima(pl.dia_semana, pl.hora);
    return { pr, partido: partidos.find((x) => x.fecha === pr.fecha && x.hora?.slice(0, 5) === pr.hora) };
  };
  async function crearPartido(pl) {
    setError("");
    const { pr, partido } = existente(pl);
    if (partido) return onAbrirPartido(partido.id);
    const { data, error } = await supabase.from("partidos").insert({
      comunidad_id: comunidad.id, tipo: pl.tipo, fecha: pr.fecha, hora: pr.hora,
      sede: pl.sede, sede_direccion: pl.sede_direccion ?? "", sede_lat: pl.sede_lat, sede_lng: pl.sede_lng,
    }).select().single();
    if (error) return setError(`No se pudo crear el partido: ${error.message}`);
    onAbrirPartido(data.id);
  }

  const centro = comunidad.zonas?.lat != null ? { lat: comunidad.zonas.lat, lng: comunidad.zonas.lng } : undefined;
  const set = (k) => (e) => setNuevo({ ...nuevo, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <p className="text-tinta/70">Los días y horarios fijos del grupo. Con un toque creás el partido de la próxima semana.</p>

      {planes === null ? null : planes.length === 0 ? (
        <p className="text-tinta/70">{esAdmin ? "Todavía no hay planificaciones. Agregá la primera." : "Todavía no hay planificaciones. Las agrega quien administra la comunidad."}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-panel">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Planificación semanal</caption>
            <thead className="text-tinta/70">
              <tr><th className="px-3 py-2 font-semibold">Día</th><th className="px-3 py-2 font-semibold">Hora</th><th className="px-3 py-2 font-semibold">Tipo</th><th className="px-3 py-2 font-semibold">Sede</th><th className="px-3 py-2"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              {planes.map((pl) => {
                const { pr, partido } = existente(pl);
                return (
                  <tr key={pl.id} className="border-t border-white/10 align-top">
                    <td className="px-3 py-2"><b>{DIAS[pl.dia_semana]}</b><span className="block text-xs text-tinta/70">Próx. {pr.d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span></td>
                    <td className="px-3 py-2 tabular-nums">{pl.hora.slice(0, 5)}</td>
                    <td className="px-3 py-2">F{pl.tipo}</td>
                    <td className="px-3 py-2"><span className="block break-words">{pl.sede}</span>{pl.notas && <span className="block text-xs text-tinta/70">{pl.notas}</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => crearPartido(pl)} className={`${btn} min-h-9 whitespace-nowrap px-3 py-1 text-sm ${partido ? "bg-panel-alto" : "bg-pasto text-white"}`}>{partido ? "Ver partido" : "Crear partido"}</button>
                        {esAdmin && <button onClick={() => quitar(pl.id)} className="px-2 py-1 text-sm font-semibold text-brasa">Quitar</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {esAdmin && (agregando ? (
        <div className="space-y-3 rounded-2xl bg-panel p-5">
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <label className="text-sm font-semibold">Día
              <select className={input} value={nuevo.dia_semana} onChange={(e) => setNuevo({ ...nuevo, dia_semana: Number(e.target.value) })}>
                {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Hora<input type="time" className={input} value={nuevo.hora} onChange={set("hora")} /></label>
          </div>
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <button key={t} type="button" onClick={() => setNuevo({ ...nuevo, tipo: t })} className={`${btn} flex-1 ${nuevo.tipo === t ? "bg-pasto text-white" : "bg-panel-alto"}`}>Fútbol {t}</button>
            ))}
          </div>
          <div className="space-y-2">
            <span className="text-sm font-semibold">Sede</span>
            {sedes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sedes.map((s) => (
                  <button key={s.id} type="button" onClick={() => setNuevo({ ...nuevo, sede: s.nombre, sede_direccion: s.direccion ?? "", sede_lat: s.lat ?? null, sede_lng: s.lng ?? null })}
                    className={`${btn} py-1 text-sm ${nuevo.sede === s.nombre ? "bg-pasto text-white" : "bg-panel-alto"}`}>{s.nombre}</button>
                ))}
              </div>
            )}
            <SelectorLugar centro={centro} onElegir={(l) => setNuevo((x) => ({ ...x, sede: l.nombre, sede_direccion: l.direccion, sede_lat: l.lat, sede_lng: l.lng }))} />
            <input className={input} placeholder="Nombre de la cancha" value={nuevo.sede} onChange={(e) => setNuevo({ ...nuevo, sede: e.target.value, sede_lat: null, sede_lng: null })} />
            <input className={input} placeholder="Notas (opcional): ej. llevar pechera" maxLength={120} value={nuevo.notas} onChange={set("notas")} />
          </div>
          <div className="flex gap-2">
            <button disabled={!nuevo.sede.trim() || !nuevo.hora} onClick={agregar} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Guardar</button>
            <button onClick={() => { setAgregando(false); setNuevo(VACIA); }} className={`${btn} bg-panel-alto`}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAgregando(true)} className={`${btn} bg-pasto text-white`}>Agregar planificación</button>
      ))}
      {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
    </div>
  );
}
