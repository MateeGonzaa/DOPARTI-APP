import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Avatar, Cargando } from "./ui";
import { hace } from "./Comentarios";

const ACCION = {
  comentario: "comentó en tu perfil",
  respuesta: "respondió tu comentario",
  like: "le dio ❤️ a tu comentario",
};

export default function Actividad({ userId, onVolver, onVerPerfil, onCambio }) {
  const [lista, setLista] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("notificaciones")
        .select("id, tipo, leida, created_at, perfil_id, de:profiles!de_id(id, apodo, avatar_url), comentario:perfil_comentarios!comentario_id(texto, gif_url)")
        .eq("usuario_id", userId).order("created_at", { ascending: false }).limit(40);
      setLista(data ?? []);
      if ((data ?? []).some((n) => !n.leida)) {
        await supabase.from("notificaciones").update({ leida: true }).eq("usuario_id", userId).eq("leida", false);
        onCambio?.();
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <h2 className="text-3xl font-extrabold">Actividad</h2>
      {lista === null ? <Cargando texto="Cargando actividad…" /> : lista.length === 0 ? (
        <p className="text-tinta/70">Todavía no hay actividad. Cuando alguien te comente, te responda o le dé me gusta a un comentario tuyo, aparece acá.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map((n) => (
            <li key={n.id}>
              <button onClick={() => onVerPerfil(n.perfil_id)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-panel-alto ${n.leida ? "bg-panel" : "bg-panel-alto ring-1 ring-cesped/50"}`}>
                <Avatar perfil={n.de} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block"><b>{n.de?.apodo ?? "Alguien"}</b> {ACCION[n.tipo]}</span>
                  {(n.comentario?.texto || n.comentario?.gif_url) && (
                    <span className="block truncate text-sm text-tinta/70">{n.comentario.texto || "GIF"}</span>
                  )}
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
