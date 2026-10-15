import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar } from "./ui";
import { hace } from "./Comentarios";

// Chat en vivo sobre un canal de la tabla `mensajes`. Sirve para comunidades, mensajes privados y partidas de Truco.
// `alto` controla la altura de la lista: en la partida de Truco es fija, en pantallas completas ocupa el resto.
export default function Chat({ canal, userId, onVerPerfil, alto = "h-[min(60dvh,28rem)]", vacio = "Todavía no hay mensajes. Escribí el primero." }) {
  const [msgs, setMsgs] = useState(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const perfiles = useRef(new Map());
  const fin = useRef(null);
  const lista = useRef(null);

  const completar = async (filas) => {
    const faltan = [...new Set(filas.map((m) => m.autor_id))].filter((id) => !perfiles.current.has(id));
    if (faltan.length) {
      const { data } = await supabase.from("profiles").select("id, apodo, avatar_url").in("id", faltan);
      (data ?? []).forEach((p) => perfiles.current.set(p.id, p));
    }
  };

  useEffect(() => {
    let vigente = true;
    setMsgs(null);
    (async () => {
      const { data, error: e } = await supabase.from("mensajes").select("*").eq("canal", canal).order("id", { ascending: false }).limit(100);
      if (!vigente) return;
      if (e) { setError("No se pudo cargar el chat. Falta ejecutar la migración de la base de datos."); return setMsgs([]); }
      const filas = (data ?? []).reverse();
      await completar(filas);
      if (vigente) setMsgs(filas);
    })();

    const sub = supabase.channel(`chat:${canal}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes", filter: `canal=eq.${canal}` }, async ({ new: m }) => {
        await completar([m]);
        setMsgs((xs) => (xs && !xs.some((x) => x.id === m.id) ? [...xs, m] : xs));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "mensajes" }, ({ old }) => {
        setMsgs((xs) => xs && xs.filter((x) => x.id !== old.id));
      })
      .subscribe();
    return () => { vigente = false; supabase.removeChannel(sub); };
  }, [canal]);

  // Baja al último mensaje solo si ya estabas cerca del final (así no te saltea lo que estás leyendo)
  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    const cerca = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (cerca || msgs?.at(-1)?.autor_id === userId) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    setError("");
    const { data, error: err } = await supabase.from("mensajes").insert({ canal, texto: t }).select().single();
    if (err) { setTexto(t); return setError("No se pudo enviar el mensaje."); }
    if (data) setMsgs((xs) => (xs && !xs.some((x) => x.id === data.id) ? [...xs, data] : xs));
  }

  const borrar = async (id) => { await supabase.from("mensajes").delete().eq("id", id); setMsgs((xs) => xs.filter((m) => m.id !== id)); };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div ref={lista} role="log" aria-live="polite" aria-label="Mensajes" className={`${alto} space-y-2 overflow-y-auto overscroll-contain rounded-2xl bg-panel p-3`}>
        {msgs === null ? <p className="py-6 text-center text-tinta/70">Cargando mensajes…</p>
          : msgs.length === 0 ? <p className="py-6 text-center text-tinta/70">{vacio}</p>
          : msgs.map((m, i) => {
            const mio = m.autor_id === userId;
            const p = perfiles.current.get(m.autor_id);
            const seguido = msgs[i - 1]?.autor_id === m.autor_id;
            return (
              <div key={m.id} className={`group flex items-end gap-2 ${mio ? "flex-row-reverse" : ""}`}>
                <div className="w-7 shrink-0">
                  {!mio && !seguido && (
                    <button onClick={() => onVerPerfil?.(m.autor_id)} aria-label={`Ver perfil de ${p?.apodo ?? "usuario"}`}><Avatar perfil={p} size={28} /></button>
                  )}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${mio ? "rounded-br-md bg-pasto text-white" : "rounded-bl-md bg-panel-alto"}`}>
                  {!mio && !seguido && <p className="text-xs font-bold text-cesped">{p?.apodo ?? "?"}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                  <p className="mt-0.5 flex items-center justify-end gap-2 text-[11px] opacity-60">
                    {hace(m.created_at)}
                    {mio && <button onClick={() => borrar(m.id)} aria-label="Borrar mensaje" className="hidden font-semibold group-hover:inline focus-visible:inline">Borrar</button>}
                  </p>
                </div>
              </div>
            );
          })}
        <div ref={fin} />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
      <form onSubmit={enviar} className="flex gap-2">
        <input className={input} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} placeholder="Escribí un mensaje" aria-label="Mensaje" autoComplete="off" />
        <button type="submit" disabled={!texto.trim()} className={`${btn} bg-pasto text-white disabled:opacity-50`}>Enviar</button>
      </form>
    </div>
  );
}
