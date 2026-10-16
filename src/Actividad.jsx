import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import { hace } from "./Comentarios";
import { TIPOS } from "./lib/notificaciones";

// Lista de avisos del usuario (amistades, invitaciones, mensajes, Truco, comentarios…). Se actualiza en vivo.
// Props que manda App.jsx: onAbrir(aviso) lleva a la pantalla del aviso, onConfigurar abre los ajustes de avisos,
// onCambio refresca los contadores del menú.
export default function Actividad({ userId, onVolver, onAbrir, onConfigurar, onCambio }) {
  const [avisos, setAvisos] = useState(null);
  const [error, setError] = useState("");

  const cargar = async () => {
    const { data, error: e } = await supabase
      .from("notificaciones")
      .select("*, de:profiles!de_id(apodo, avatar_url)")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (e) { setError("No se pudo cargar la actividad."); return setAvisos([]); }
    setAvisos(data ?? []);
  };

  useEffect(() => {
    cargar();
    const sub = supabase.channel(`actividad:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${userId}` }, cargar)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [userId]);

  async function abrir(n) {
    if (!n.leida) {
      setAvisos((xs) => xs.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      await supabase.from("notificaciones").update({ leida: true }).eq("id", n.id);
      onCambio?.();
    }
    onAbrir?.(n);
  }

  async function marcarTodas() {
    setAvisos((xs) => xs.map((x) => ({ ...x, leida: true })));
    await supabase.from("notificaciones").update({ leida: true }).eq("usuario_id", userId).eq("leida", false);
    onCambio?.();
  }

  async function borrar(id) {
    setAvisos((xs) => xs.filter((x) => x.id !== id));
    await supabase.from("notificaciones").delete().eq("id", id);
    onCambio?.();
  }

  if (avisos === null) return <Cargando texto="Cargando tu actividad…" />;
  const sinLeer = avisos.filter((a) => !a.leida).length;

  // Los avisos viejos (comentarios, respuestas, me gusta) no tienen título guardado: se arma con el tipo
  const titulo = (n) => n.titulo ?? `${n.de?.apodo ?? "Alguien"} ${TIPOS[n.tipo]?.texto ?? "te avisó algo"}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Actividad</h2>
        <button onClick={onVolver} className="min-h-11 px-2 font-semibold text-cesped">Volver</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={marcarTodas} disabled={sinLeer === 0} className={`${btn} bg-panel-alto py-1 text-sm disabled:opacity-40`}>Marcar todo como leído</button>
        {onConfigurar && <button onClick={onConfigurar} className={`${btn} bg-panel py-1 text-sm`}>⚙️ Ajustes de avisos</button>}
      </div>

      {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}

      {avisos.length === 0 ? (
        <p className="rounded-2xl bg-panel p-6 text-center text-tinta/70">Todavía no tenés actividad. Cuando alguien te escriba, te invite o se siente en tu mesa de Truco, lo vas a ver acá.</p>
      ) : (
        <ul className="space-y-2">
          {avisos.map((n) => (
            <li key={n.id} className="flex items-stretch gap-1">
              <button onClick={() => abrir(n)}
                className={`flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 text-left hover:bg-panel-alto ${n.leida ? "bg-panel" : "bg-panel-alto ring-1 ring-cesped/40"}`}>
                <span className="relative shrink-0">
                  <Avatar perfil={n.de} size={40} />
                  <span aria-hidden="true" className="absolute -bottom-1 -right-1 text-base">{TIPOS[n.tipo]?.icono ?? "🔔"}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${n.leida ? "font-semibold" : "font-extrabold"}`}>{titulo(n)}</span>
                  {n.cuerpo && <span className="line-clamp-2 text-sm text-tinta/70">{n.cuerpo}</span>}
                  <span className="block text-xs text-tinta/50">{hace(n.created_at)}</span>
                </span>
                {!n.leida && <span aria-label="Sin leer" className="size-2.5 shrink-0 rounded-full bg-naranja" />}
              </button>
              <button onClick={() => borrar(n.id)} aria-label="Borrar aviso" className="min-h-11 shrink-0 rounded-2xl px-3 text-tinta/50 hover:bg-panel hover:text-brasa">✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
