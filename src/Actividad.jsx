import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Avatar, Cargando } from "./ui";
import { hace } from "./Comentarios";
import { TIPOS } from "./lib/notificaciones";

const SELECT = "id, tipo, leida, created_at, perfil_id, de_id, titulo, cuerpo, ref, de:profiles!de_id(id, apodo, avatar_url), comentario:perfil_comentarios!comentario_id(texto, gif_url)";

// Todos los avisos de la app: comentarios, amistades, invitaciones, partidos, mensajes, Truco y recordatorios.
export default function Actividad({ userId, onVolver, onAbrir, onConfigurar, onCambio }) {
  const [lista, setLista] = useState(null);

  const cargar = async () => {
    const { data } = await supabase.from("notificaciones").select(SELECT)
      .eq("usuario_id", userId).order("created_at", { ascending: false }).limit(60);
    setLista(data ?? []);
    if ((data ?? []).some((n) => !n.leida)) {
      await supabase.from("notificaciones").update({ leida: true }).eq("usuario_id", userId).eq("leida", false);
      onCambio?.();
    }
  };

  useEffect(() => {
    cargar();
    // Si llega un aviso mientras tenés abierta esta pantalla, aparece al instante
    const sub = supabase.channel(`actividad:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${userId}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const titulo = (n) => (n.titulo ? n.titulo : <><b>{n.de?.apodo ?? "Alguien"}</b> {TIPOS[n.tipo]?.texto}</>);
  const detalle = (n) => n.cuerpo || n.comentario?.texto || (n.comentario?.gif_url ? "GIF" : "");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
        {onConfigurar && <button onClick={onConfigurar} className="inline-flex min-h-11 items-center px-2 font-semibold text-cesped">⚙️ Configurar avisos</button>}
      </div>
      <h2 className="text-3xl font-extrabold">Actividad</h2>
      {lista === null ? <Cargando texto="Cargando actividad…" /> : lista.length === 0 ? (
        <p className="text-tinta/70">Todavía no hay actividad. Acá vas a ver invitaciones, solicitudes de amistad, partidos nuevos, mensajes, recordatorios y más.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((n) => (
            <li key={n.id}>
              <button onClick={() => onAbrir(n)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-panel-alto ${n.leida ? "bg-panel" : "bg-panel-alto ring-1 ring-cesped/50"}`}>
                {n.de ? <Avatar perfil={n.de} size={36} /> : (
                  <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-pasto text-lg">{TIPOS[n.tipo]?.icono ?? "🔔"}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block">{TIPOS[n.tipo]?.icono && n.de ? `${TIPOS[n.tipo].icono} ` : ""}{titulo(n)}</span>
                  {detalle(n) && <span className="block truncate text-sm text-tinta/70">{detalle(n)}</span>}
                  <span className="block text-xs text-tinta/60">{hace(n.created_at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
