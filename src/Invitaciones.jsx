import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import { cuando } from "./lib/logica";
import { etiqueta, cap } from "./lib/modalidades";

export default function Invitaciones({ userId, onVolver, onAbrirPartido, onCambio }) {
  const [tab, setTab] = useState("recibidas");
  const [recibidas, setRecibidas] = useState(null);
  const [enviadas, setEnviadas] = useState([]);
  const [error, setError] = useState("");

  const cargar = async () => {
    const [a, b] = await Promise.all([
      supabase.rpc("mis_invitaciones"),
      supabase.from("invitaciones")
        .select("id, estado, para:profiles!para_id(id, apodo, avatar_url), partidos(id, deporte, tipo, fecha, hora, a_coordinar, sede)")
        .eq("de_id", userId).order("created_at", { ascending: false }).limit(30),
    ]);
    const rec = a.data ?? [];
    const ids = rec.map((x) => x.partido_id).filter(Boolean);
    let dep = {};
    if (ids.length) {
      const { data } = await supabase.from("partidos").select("id, deporte").in("id", ids);
      dep = Object.fromEntries((data ?? []).map((x) => [x.id, x.deporte]));
    }
    setRecibidas(rec.map((x) => ({ ...x, deporte: dep[x.partido_id] ?? "futbol" })));
    setEnviadas((b.data ?? []).filter((x) => x.partidos));
    onCambio?.();
  };
  useEffect(() => { cargar(); }, []);

  async function aceptar(inv) {
    setError("");
    const { data, error } = await supabase.rpc("aceptar_invitacion", { p_id: inv.id });
    if (error) return setError("No se pudo aceptar la invitación.");
    onCambio?.();
    onAbrirPartido(data ?? inv.partido_id);
  }
  async function borrar(id) {
    await supabase.from("invitaciones").delete().eq("id", id);
    cargar();
  }

  const tabs = [["recibidas", `Recibidas${recibidas?.length ? ` (${recibidas.length})` : ""}`], ["enviadas", "Enviadas"]];

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <h2 className="text-3xl font-extrabold">Invitaciones</h2>
      <div className="flex gap-2">
        {tabs.map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`${btn} py-1 ${tab === k ? "bg-tinta text-fondo" : "bg-panel"}`}>{t}</button>
        ))}
      </div>

      {recibidas === null ? <Cargando texto="Cargando invitaciones…" /> : tab === "recibidas" ? (
        recibidas.length === 0 ? (
          <p className="text-tinta/70">No tenés invitaciones pendientes. Cuando un amigo te invite a un partido, aparece acá.</p>
        ) : (
          <ul className="space-y-3">
            {recibidas.map((inv) => (
              <li key={inv.id} className="space-y-3 rounded-2xl bg-panel p-4">
                <div className="flex items-center gap-3">
                  <Avatar perfil={{ apodo: inv.de_apodo, avatar_url: inv.de_avatar }} size={40} />
                  <p className="min-w-0"><b>{inv.de_apodo}</b> te invitó a jugar</p>
                </div>
                <div>
                  <p className="font-display text-lg font-extrabold">{etiqueta(inv)}</p>
                  <p>{cap(cuando(inv))}</p>
                  <p className="text-sm text-tinta/70">{inv.sede} · {inv.comunidad}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => aceptar(inv)} className={`${btn} bg-pasto text-white`}>Aceptar y ver partido</button>
                  <button onClick={() => borrar(inv.id)} className={`${btn} bg-panel-alto text-brasa`}>Rechazar</button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : enviadas.length === 0 ? (
        <p className="text-tinta/70">Todavía no invitaste a nadie. Entrá al perfil de un amigo o a un partido para invitarlo.</p>
      ) : (
        <ul className="space-y-2">
          {enviadas.map((inv) => (
            <li key={inv.id} className="flex items-center gap-3 rounded-lg bg-panel p-3">
              <Avatar perfil={inv.para} size={36} />
              <button onClick={() => onAbrirPartido(inv.partidos.id)} className="min-w-0 flex-1 text-left">
                <b className="block truncate">{inv.para?.apodo}</b>
                <span className="block truncate text-sm text-tinta/70">{etiqueta(inv.partidos)} · {cap(cuando(inv.partidos))}</span>
                <span className={`block text-sm font-semibold ${inv.estado === "aceptada" ? "text-cesped" : "text-tinta/70"}`}>
                  {inv.estado === "aceptada" ? "Aceptó" : "Pendiente"}
                </span>
              </button>
              <button onClick={() => borrar(inv.id)} className="shrink-0 px-2 py-2 text-sm font-semibold text-brasa">
                {inv.estado === "aceptada" ? "Quitar" : "Cancelar"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm font-semibold text-brasa">{error}</p>}
    </div>
  );
}
