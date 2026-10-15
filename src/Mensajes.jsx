import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar, Cargando } from "./ui";
import { hace } from "./Comentarios";
import Chat from "./Chat";
import { canalDm } from "./lib/chat";

// Mensajes privados entre usuarios. `conId` abre directo la conversación con esa persona.
export default function Mensajes({ userId, conId = null, onVolver, onVerPerfil }) {
  const [abierto, setAbierto] = useState(conId);   // id del otro usuario
  const [convs, setConvs] = useState(null);
  const [perfiles, setPerfiles] = useState({});
  const [amigos, setAmigos] = useState([]);
  const [q, setQ] = useState("");

  const cargar = async () => {
    const { data } = await supabase.rpc("mis_conversaciones");
    const filas = (data ?? []).sort((a, b) => b.ultimo_at.localeCompare(a.ultimo_at));
    setConvs(filas);
    const ids = filas.map((c) => c.otro_id);
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, apodo, avatar_url").in("id", ids);
      setPerfiles((x) => ({ ...x, ...Object.fromEntries((ps ?? []).map((p) => [p.id, p])) }));
    }
  };
  useEffect(() => { cargar(); }, [abierto]);
  useEffect(() => {
    supabase.from("amistades")
      .select("solicitante_id, solicitante:profiles!solicitante_id(id, apodo, avatar_url), destinatario:profiles!destinatario_id(id, apodo, avatar_url)")
      .eq("estado", "aceptada").then(({ data }) => {
        const lista = (data ?? []).map((a) => (a.solicitante_id === userId ? a.destinatario : a.solicitante)).filter(Boolean);
        setAmigos(lista);
        setPerfiles((x) => ({ ...x, ...Object.fromEntries(lista.map((p) => [p.id, p])) }));
      });
  }, [userId]);

  // Si abrieron el chat desde un perfil y todavía no está cargado, lo pedimos
  useEffect(() => {
    if (!abierto || perfiles[abierto]) return;
    supabase.from("profiles").select("id, apodo, avatar_url").eq("id", abierto).single()
      .then(({ data }) => data && setPerfiles((x) => ({ ...x, [data.id]: data })));
  }, [abierto]);

  if (abierto) {
    const otro = perfiles[abierto];
    return (
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => (conId ? onVolver() : setAbierto(null))} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
          <button onClick={() => onVerPerfil?.(abierto)} className="flex min-w-0 items-center gap-2" aria-label={`Ver perfil de ${otro?.apodo ?? "usuario"}`}>
            <Avatar perfil={otro} size={36} />
            <h2 className="truncate font-display text-xl font-extrabold">{otro?.apodo ?? "…"}</h2>
          </button>
        </div>
        <Chat canal={canalDm(userId, abierto)} userId={userId} onVerPerfil={onVerPerfil} alto="h-[min(65dvh,34rem)] lg:h-[60dvh]" vacio="Todavía no se escribieron. ¡Mandá el primero!" />
      </section>
    );
  }

  if (convs === null) return <Cargando />;
  const yaTiene = new Set(convs.map((c) => c.otro_id));
  const nuevos = amigos.filter((a) => !yaTiene.has(a.id) && a.apodo.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">Mensajes</h2>
        <button onClick={onVolver} className="min-h-11 px-2 font-semibold text-cesped">Volver</button>
      </div>
      {convs.length > 0 && (
        <ul className="space-y-2">
          {convs.map((c) => {
            const p = perfiles[c.otro_id];
            return (
              <li key={c.canal}>
                <button onClick={() => setAbierto(c.otro_id)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-panel p-3 text-left hover:bg-panel-alto">
                  <Avatar perfil={p} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-bold">{p?.apodo ?? "Usuario"}</span>
                      <span className="shrink-0 text-xs text-tinta/60">{hace(c.ultimo_at)}</span>
                    </span>
                    <span className="block truncate text-sm text-tinta/70">{c.ultimo}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="space-y-2">
        <h3 className="font-extrabold">{convs.length ? "Escribirle a un amigo" : "Empezá una conversación"}</h3>
        {amigos.length === 0 ? (
          <p className="text-tinta/70">Cuando tengas amigos en DOPARTI vas a poder escribirles acá. También podés tocar “Mensaje” en el perfil de cualquier jugador.</p>
        ) : (
          <>
            <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar entre tus amigos" aria-label="Buscar entre tus amigos" />
            <ul className="grid gap-2 sm:grid-cols-2">
              {nuevos.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setAbierto(a.id)} className={`${btn} w-full justify-start gap-3 bg-panel`}>
                    <Avatar perfil={a} size={32} /><span className="truncate">{a.apodo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
