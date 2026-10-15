import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Avatar } from "./ui";
import Compositor from "./Compositor";

export function hace(fecha) {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  if (min < 10080) return `hace ${Math.floor(min / 1440)} d`;
  return new Date(fecha).toLocaleDateString("es-AR");
}

function Texto({ t }) {
  if (!t) return null;
  return (
    <p className="whitespace-pre-wrap break-words">
      {t.split(/(@\S+)/g).map((x, i) => (x.startsWith("@") ? <b key={i} className="text-cesped">{x}</b> : x))}
    </p>
  );
}

// Comentarios de un perfil, con respuestas, "me gusta", emojis y GIFs.
export default function Comentarios({ perfilId, apodo, userId, esMio, onVerPerfil }) {
  const [items, setItems] = useState(null);
  const [respondiendo, setRespondiendo] = useState(null);
  const [abiertos, setAbiertos] = useState(new Set());
  const [aviso, setAviso] = useState("");

  const cargar = async () => {
    const { data } = await supabase
      .from("perfil_comentarios")
      .select("id, texto, gif_url, padre_id, created_at, autor_id, autor:profiles!autor_id(id, apodo, avatar_url), likes:comentario_likes(usuario_id)")
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: true });
    setItems(data ?? []);
  };
  useEffect(() => { cargar(); }, [perfilId]);

  // padre = id del comentario raíz (las respuestas a respuestas quedan en el mismo hilo, con @mención)
  const publicar = (padre) => async ({ texto, gif_url }) => {
    setAviso("");
    const { error } = await supabase.from("perfil_comentarios").insert({
      perfil_id: perfilId, autor_id: userId, texto: texto || null, gif_url: gif_url || null, padre_id: padre,
    });
    if (error) return "No se pudo publicar. Probá de nuevo.";
    if (padre) { setAbiertos(new Set([...abiertos, padre])); setRespondiendo(null); }
    await cargar();
    return null;
  };

  const alternarLike = async (c) => {
    const meGusta = c.likes.some((l) => l.usuario_id === userId);
    setItems((xs) => xs.map((x) => (x.id !== c.id ? x : {
      ...x, likes: meGusta ? x.likes.filter((l) => l.usuario_id !== userId) : [...x.likes, { usuario_id: userId }],
    })));
    const { error } = meGusta
      ? await supabase.from("comentario_likes").delete().eq("comentario_id", c.id).eq("usuario_id", userId)
      : await supabase.from("comentario_likes").insert({ comentario_id: c.id });
    if (error) cargar();
  };

  async function borrar(c, nResp) {
    const msg = nResp ? `¿Borrar este comentario y sus ${nResp} respuestas?` : "¿Borrar este comentario?";
    if (!window.confirm(msg)) return;
    const { error } = await supabase.from("perfil_comentarios").delete().eq("id", c.id);
    if (error) setAviso("No se pudo borrar el comentario.");
    cargar();
  }

  if (items === null) return null;
  const raices = items.filter((c) => !c.padre_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const respuestasDe = (id) => items.filter((c) => c.padre_id === id);

  const fila = (c, esResp, raizId, nResp = 0) => {
    const meGusta = c.likes.some((l) => l.usuario_id === userId);
    const puedeBorrar = c.autor_id === userId || esMio;
    return (
      <div className="flex gap-3">
        <button onClick={() => onVerPerfil?.(c.autor_id)} aria-label={`Ver perfil de ${c.autor?.apodo ?? "usuario"}`} className="shrink-0 self-start">
          <Avatar perfil={c.autor} size={esResp ? 28 : 36} />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-baseline justify-between gap-2 text-sm">
            <button onClick={() => onVerPerfil?.(c.autor_id)} className="truncate text-left font-bold">{c.autor?.apodo ?? "?"}</button>
            <span className="shrink-0 text-tinta/60">{hace(c.created_at)}</span>
          </p>
          <Texto t={c.texto} />
          {c.gif_url && <img src={c.gif_url} alt="GIF" loading="lazy" className="max-h-52 max-w-full rounded-lg" />}
          <div className="flex flex-wrap items-center text-sm font-semibold">
            <button onClick={() => alternarLike(c)} aria-pressed={meGusta} aria-label={meGusta ? "Quitar me gusta" : "Me gusta"}
              className={`inline-flex min-h-9 items-center gap-1 rounded-lg pr-3 ${meGusta ? "text-brasa" : "text-tinta/70"}`}>
              <span aria-hidden="true">{meGusta ? "❤️" : "🤍"}</span>{c.likes.length > 0 && <span>{c.likes.length}</span>}
            </button>
            <button onClick={() => setRespondiendo(respondiendo === c.id ? null : c.id)} className="min-h-9 pr-3 text-cesped">Responder</button>
            {puedeBorrar && <button onClick={() => borrar(c, nResp)} className="min-h-9 text-brasa">Borrar</button>}
          </div>
          {respondiendo === c.id && (
            <Compositor key={c.id} autoFocus boton="Responder" placeholder={`Respondé a ${c.autor?.apodo ?? "este comentario"}`}
              inicial={esResp ? `@${c.autor?.apodo} ` : ""} onEnviar={publicar(raizId)} onCancelar={() => setRespondiendo(null)} />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-3">
      <h3 className="font-extrabold">Comentarios{items.length > 0 && ` (${items.length})`}</h3>
      {!esMio && <Compositor placeholder={`Dejale un comentario a ${apodo}`} onEnviar={publicar(null)} />}
      {aviso && <p role="alert" className="text-sm font-semibold text-brasa">{aviso}</p>}
      {raices.length === 0 ? (
        <p className="text-tinta/70">{esMio ? "Todavía nadie te dejó comentarios." : "Todavía no hay comentarios. Escribí el primero."}</p>
      ) : (
        <ul className="space-y-2">
          {raices.map((c) => {
            const resp = respuestasDe(c.id);
            const abierto = resp.length <= 2 || abiertos.has(c.id);
            return (
              <li key={c.id} className="space-y-3 rounded-lg bg-panel p-3">
                {fila(c, false, c.id, resp.length)}
                {resp.length > 2 && (
                  <button onClick={() => setAbiertos(new Set(abierto ? [...abiertos].filter((x) => x !== c.id) : [...abiertos, c.id]))}
                    aria-expanded={abierto} className="ml-12 text-sm font-semibold text-cesped">
                    {abierto ? "Ocultar respuestas" : `Ver ${resp.length} respuestas`}
                  </button>
                )}
                {resp.length > 0 && abierto && (
                  <div className="ml-6 space-y-3 border-l border-white/10 pl-3">
                    {resp.map((r) => <div key={r.id}>{fila(r, true, c.id)}</div>)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
