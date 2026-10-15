import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import { cupo, cuando, esProximo, instante } from "./lib/logica";
import { etiqueta, cap } from "./lib/modalidades";

export default function InvitarAPartido({ amigo, userId, onCerrar }) {
  const [lista, setLista] = useState(null);
  const [invitados, setInvitados] = useState(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("partidos").select("id, deporte, tipo, fecha, hora, a_coordinar, sede, comunidades(nombre), inscripciones(usuario_id)"),
      supabase.from("invitaciones").select("partido_id").eq("de_id", userId).eq("para_id", amigo.id),
    ]).then(([a, b]) => {
      setInvitados(new Set((b.data ?? []).map((x) => x.partido_id)));
      const disponibles = (a.data ?? [])
        .filter((p) => esProximo(p) && !p.inscripciones.some((i) => i.usuario_id === amigo.id))
        .sort((x, y) => (instante(x) === instante(y) ? 0 : instante(x) < instante(y) ? -1 : 1));
      setLista(disponibles);
    });
    const alTeclear = (e) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, []);

  async function invitar(p) {
    setError("");
    const { error } = await supabase.from("invitaciones").insert({ partido_id: p.id, de_id: userId, para_id: amigo.id });
    if (error && error.code !== "23505") return setError("No se pudo enviar la invitación.");
    setInvitados(new Set([...invitados, p.id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={`Invitar a ${amigo.apodo} a un partido`} onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-panel p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="flex items-center gap-3">
          <Avatar perfil={amigo} size={40} />
          <h3 className="min-w-0 flex-1 truncate text-xl font-extrabold">Invitar a {amigo.apodo}</h3>
          <button autoFocus onClick={onCerrar} className="-mr-2 px-2 py-2 text-sm font-semibold text-cesped">Cerrar</button>
        </div>

        {lista === null ? <Cargando texto="Buscando partidos…" /> : lista.length === 0 ? (
          <p className="text-tinta/70">No hay partidos próximos para invitarlo. Creá uno en tu comunidad y volvé.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg bg-panel-alto p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-extrabold">{etiqueta(p)} <span className="font-sans text-sm font-normal text-tinta/70">{Math.min(p.inscripciones.length, cupo(p))}/{cupo(p)}</span></p>
                  <p className="text-sm">{cap(cuando(p))}</p>
                  <p className="truncate text-sm text-tinta/70">{p.sede}{p.comunidades?.nombre && ` · ${p.comunidades.nombre}`}</p>
                </div>
                {invitados.has(p.id)
                  ? <span className="shrink-0 px-2 text-sm font-semibold text-cesped">Invitado</span>
                  : <button onClick={() => invitar(p)} className={`${btn} min-h-9 shrink-0 bg-pasto px-3 py-1 text-sm text-white`}>Invitar</button>}
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
      </div>
    </div>
  );
}
