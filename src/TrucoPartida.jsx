import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import Chat from "./Chat";
import Votos from "./Votos";
import { canalTruco } from "./lib/chat";
import { aplicar, crearJuego, opciones, textoCanto, etiquetaEnvido, nombreCarta, PALOS } from "./lib/truco";

const SIMBOLO = { E: "🗡️", B: "🪵", O: "🪙", C: "🍷" };
const COLOR = { E: "text-sky-700", B: "text-emerald-800", O: "text-amber-600", C: "text-rose-700" };
const REACCIONES = ["👏", "🔥", "😮", "😂", "😬", "🧉"];

function Carta({ c, onClick, deshabilitada, grande = false }) {
  const tam = grande ? "h-24 w-16 sm:h-32 sm:w-[5.5rem]" : "h-20 w-14 sm:h-28 sm:w-20";
  if (!c) return <div aria-hidden="true" className={`${tam} rounded-lg border border-dashed border-white/15`} />;
  const cuerpo = (
    <>
      <span className={`font-display text-2xl font-extrabold sm:text-3xl ${COLOR[c.p]}`}>{c.n}</span>
      <span aria-hidden="true" className="text-xl sm:text-2xl">{SIMBOLO[c.p]}</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-fondo/70 sm:text-xs">{PALOS[c.p]}</span>
    </>
  );
  const base = `${tam} flex flex-col items-center justify-center gap-0.5 rounded-lg bg-[#f6f1e4] shadow-md ring-1 ring-black/20`;
  return onClick ? (
    <button onClick={onClick} disabled={deshabilitada} aria-label={`Jugar ${nombreCarta(c)}`}
      className={`${base} ${deshabilitada ? "opacity-70" : "hover:-translate-y-2 hover:shadow-[0_8px_24px_-8px_var(--color-cesped)]"}`}>{cuerpo}</button>
  ) : (
    <div role="img" aria-label={nombreCarta(c)} className={base}>{cuerpo}</div>
  );
}

const Dorso = ({ grande }) => (
  <div aria-hidden="true" className={`${grande ? "h-24 w-16 sm:h-32 sm:w-[5.5rem]" : "h-20 w-14 sm:h-28 sm:w-20"} rounded-lg bg-gradient-to-br from-pasto to-panel-alto ring-1 ring-white/20`} />
);

function Jugador({ perfil, puntos, meta, activo, etiqueta }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-panel p-3 ${activo ? "cupo-completo" : ""}`}>
      <Avatar perfil={perfil} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{perfil?.apodo ?? "Esperando…"}</p>
        <p className="text-xs text-tinta/70">{etiqueta}</p>
      </div>
      <p className="font-display text-3xl font-extrabold text-cesped" aria-label={`${puntos} de ${meta} puntos`}>{puntos}<span className="text-base text-tinta/60">/{meta}</span></p>
    </div>
  );
}

export default function TrucoPartida({ id, userId, onVolver, onVerPerfil }) {
  const [row, setRow] = useState(null);
  const [perfiles, setPerfiles] = useState({});
  const [aviso, setAviso] = useState("");
  const [flotantes, setFlotantes] = useState([]);
  const [mirando, setMirando] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const canalVivo = useRef(null);
  const rowRef = useRef(null);
  rowRef.current = row;

  const cargar = async () => {
    const { data } = await supabase.from("truco_partidas").select("*").eq("id", id).maybeSingle();
    setRow(data ?? false);
    const ids = [data?.creador_id, data?.rival_id].filter(Boolean);
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, apodo, avatar_url").in("id", ids);
      setPerfiles(Object.fromEntries((ps ?? []).map((p) => [p.id, p])));
    }
  };
  useEffect(() => { cargar(); }, [id]);

  // Cambios de la partida + reacciones + espectadores, todo en vivo
  useEffect(() => {
    const ch = supabase.channel(`truco-vivo:${id}`, { config: { broadcast: { self: true }, presence: { key: userId } } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "truco_partidas", filter: `id=eq.${id}` }, ({ new: n }) => {
        if (rowRef.current && n.version < rowRef.current.version) return;
        setRow(n);
        if (n.rival_id !== rowRef.current?.rival_id) cargar();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "truco_partidas" }, ({ old }) => { if (old.id === id) setRow(false); })
      .on("broadcast", { event: "reaccion" }, ({ payload }) => {
        const k = `${Date.now()}-${Math.random()}`;
        setFlotantes((xs) => [...xs.slice(-14), { k, e: payload.e, x: 8 + Math.random() * 84 }]);
        setTimeout(() => setFlotantes((xs) => xs.filter((f) => f.k !== k)), 2600);
      })
      .on("presence", { event: "sync" }, () => setMirando(Object.keys(ch.presenceState()).length))
      .subscribe(async (estado) => { if (estado === "SUBSCRIBED") await ch.track({ en: Date.now() }); });
    canalVivo.current = ch;
    return () => { supabase.removeChannel(ch); canalVivo.current = null; };
  }, [id, userId]);

  const j = row ? (row.creador_id === userId ? 0 : row.rival_id === userId ? 1 : null) : null;
  const juego = row?.juego;
  const o = useMemo(() => (juego && j !== null ? opciones(juego, j) : null), [juego, j]);

  async function guardar(nuevo) {
    const fila = { juego: nuevo, version: row.version + 1 };
    if (nuevo.ganador !== null) {
      Object.assign(fila, { estado: "terminada", ganador_id: nuevo.ganador === 0 ? row.creador_id : row.rival_id, terminada_at: new Date().toISOString() });
    }
    const { data, error } = await supabase.from("truco_partidas").update(fila).eq("id", row.id).eq("version", row.version).select().single();
    if (error || !data) { await cargar(); return setAviso("La partida cambió mientras jugabas. Probá de nuevo."); }
    setRow(data);
  }

  async function jugar(accion) {
    setAviso("");
    const r = aplicar(row.juego, { ...accion, j });
    if (!r.ok) return setAviso(r.error);
    await guardar(r.estado);
  }

  async function sentarme() {
    const { data, error } = await supabase.rpc("truco_unirse", { p_partida: row.id });
    if (error || data?.rival_id !== userId) { await cargar(); return setAviso("Ese lugar ya se ocupó."); }
    const { data: n } = await supabase.from("truco_partidas")
      .update({ estado: "jugando", juego: crearJuego(data.puntos_meta), version: data.version + 1 })
      .eq("id", row.id).eq("version", data.version).select().single();
    await cargar();
    if (n) setRow(n);
  }

  const reaccionar = (e) => canalVivo.current?.send({ type: "broadcast", event: "reaccion", payload: { e } });
  const compartir = async () => {
    const url = `${location.origin}/?truco=${row.id}`;
    try { await navigator.clipboard.writeText(url); setCopiado(true); } catch { /* sin permiso */ }
  };
  const abandonar = async () => {
    if (!window.confirm("¿Cancelar esta partida?")) return;
    await supabase.from("truco_partidas").delete().eq("id", row.id);
    onVolver();
  };

  if (row === null) return <Cargando texto="Cargando partida…" />;
  if (row === false) return (
    <section className="space-y-3">
      <button onClick={onVolver} className="-ml-2 min-h-11 px-2 font-semibold text-cesped">Volver</button>
      <p className="text-tinta/70">Esa partida ya no existe.</p>
    </section>
  );

  const yo = j === null ? null : perfiles[j === 0 ? row.creador_id : row.rival_id];
  const nombre = (k) => perfiles[k === 0 ? row.creador_id : row.rival_id]?.apodo ?? `Jugador ${k + 1}`;
  // Vista: yo abajo. Espectadores: jugador 1 arriba, jugador 0 abajo.
  const abajo = j ?? 0;
  const arriba = 1 - abajo;
  const terminada = row.estado === "terminada";
  const esperando = row.estado === "esperando";
  const turnoDe = juego && !terminada ? (juego.canto ? 1 - juego.canto.de : juego.turno) : null;
  const cantoTexto = juego ? textoCanto(juego) : null;
  const mensaje = terminada
    ? `Ganó ${nombre(juego.ganador)}`
    : turnoDe === null ? ""
    : j === null ? `Le toca a ${nombre(turnoDe)}`
    : turnoDe === j ? (juego.canto ? `${nombre(juego.canto.de)} cantó ${cantoTexto}. ¡Respondé!` : "Es tu turno")
    : (juego.canto ? `Esperando que ${nombre(turnoDe)} responda ${cantoTexto}…` : `Esperando a ${nombre(turnoDe)}…`);

  const Boton = ({ children, accion, estilo = "bg-panel-alto" }) => (
    <button onClick={() => jugar(accion)} className={`${btn} ${estilo} px-3 py-1.5 text-sm sm:text-base`}>{children}</button>
  );

  return (
    <section className="relative space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onVolver} className="-ml-2 min-h-11 px-2 font-semibold text-cesped">Volver</button>
        <h2 className="font-display text-2xl font-extrabold">🃏 Truco a {row.puntos_meta}</h2>
        <span className="rounded-full bg-panel px-3 py-1 text-sm" aria-live="polite">👁 {Math.max(0, mirando - (esperando ? 1 : 2))} mirando</span>
      </div>

      {esperando ? (
        <div className="space-y-4 rounded-2xl bg-panel p-6 text-center">
          <Avatar perfil={perfiles[row.creador_id]} size={56} />
          <p className="text-lg font-bold">{nombre(0)} está esperando rival</p>
          <p className="text-tinta/70">Partida a {row.puntos_meta} puntos, 1 contra 1.</p>
          {j === null ? (
            <button onClick={sentarme} className={`${btn} bg-pasto text-white`}>Sentarme a jugar</button>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={compartir} className={`${btn} bg-pasto text-white`}>{copiado ? "¡Link copiado!" : "Copiar link para invitar"}</button>
              <button onClick={abandonar} className={`${btn} bg-panel-alto text-brasa`}>Cancelar partida</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <Jugador perfil={perfiles[arriba === 0 ? row.creador_id : row.rival_id]} puntos={juego.puntos[arriba]} meta={juego.meta}
            activo={turnoDe === arriba} etiqueta={juego.mano === arriba ? "Es mano" : "Es pie"} />

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-pasto/40 to-panel p-3 sm:p-5">
            <div className="flex justify-center gap-2 sm:gap-3">
              {juego.manos[arriba].map((_, i) => <Dorso key={i} />)}
            </div>
            <div className="my-3 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Cartas jugadas">
              {[0, 1, 2].map((r) => (
                <div key={r} className="flex flex-col items-center gap-2">
                  <Carta c={juego.mesa[arriba][r]} />
                  <Carta c={juego.mesa[abajo][r]} />
                </div>
              ))}
            </div>
            <div className="flex min-h-24 justify-center gap-2 sm:min-h-32 sm:gap-3">
              {j !== null
                ? juego.manos[j].map((c, i) => <Carta key={`${c.n}${c.p}`} c={c} grande onClick={() => jugar({ tipo: "carta", idx: i })} deshabilitada={!o?.carta} />)
                : juego.manos[abajo].map((_, i) => <Dorso key={i} grande />)}
            </div>
            {flotantes.map((f) => (
              <span key={f.k} aria-hidden="true" style={{ left: `${f.x}%` }} className="reaccion-flota pointer-events-none absolute bottom-2 text-4xl">{f.e}</span>
            ))}
          </div>

          <Jugador perfil={perfiles[abajo === 0 ? row.creador_id : row.rival_id]} puntos={juego.puntos[abajo]} meta={juego.meta}
            activo={turnoDe === abajo} etiqueta={j === null ? (juego.mano === abajo ? "Es mano" : "Es pie") : `Vos · ${juego.mano === abajo ? "sos mano" : "sos pie"}`} />

          <p role="status" className={`rounded-lg px-3 py-2 text-center font-semibold ${terminada ? "bg-pasto text-white" : turnoDe === j && j !== null ? "bg-naranja text-white" : "bg-panel"}`}>{mensaje}</p>

          {o && !terminada && (
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Acciones">
              {o.quiero && <><Boton accion={{ tipo: "quiero" }} estilo="bg-pasto text-white">Quiero</Boton><Boton accion={{ tipo: "no_quiero" }} estilo="bg-panel-alto text-brasa">No quiero</Boton></>}
              {o.truco && <Boton accion={{ tipo: "truco" }} estilo="bg-naranja text-white">{o.quiero ? `Quiero ${o.truco.toLowerCase()}` : o.truco}</Boton>}
              {o.envido.map((e) => <Boton key={e} accion={{ tipo: e }}>{etiquetaEnvido(e)}</Boton>)}
              {o.mazo && <Boton accion={{ tipo: "mazo" }} estilo="bg-panel-alto text-brasa">Irme al mazo</Boton>}
            </div>
          )}
          {aviso && <p role="alert" className="text-center text-sm font-semibold text-brasa">{aviso}</p>}
          {terminada && (
            <p className="rounded-2xl bg-panel p-3 text-center text-sm text-tinta/80">Esta partida ya cuenta como partido jugado para el nivel de los dos jugadores.</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Reacciones en vivo">
            {REACCIONES.map((e) => <button key={e} onClick={() => reaccionar(e)} aria-label={`Reaccionar ${e}`} className="grid size-11 place-items-center rounded-full bg-panel text-2xl hover:bg-panel-alto">{e}</button>)}
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {!esperando && (
          <Votos objetivo={`truco:${row.id}`} userId={userId} cerrado={terminada || j !== null}
            titulo={j !== null ? "Lo que opina el público" : "¿Quién va a ganar?"}
            opciones={[{ id: row.creador_id, label: nombre(0) }, { id: row.rival_id, label: nombre(1), color: "bg-celeste" }]} />
        )}
        <div className="space-y-2">
          <h3 className="font-extrabold">Chat de la partida</h3>
          <Chat canal={canalTruco(row.id)} userId={userId} onVerPerfil={onVerPerfil} alto="h-56" vacio="Escribí algo para el rival o el público." />
        </div>
      </div>

      {juego && juego.log.length > 0 && (
        <details className="rounded-2xl bg-panel p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Historial de la partida</summary>
          <ol className="mt-2 space-y-1 text-tinta/80">{[...juego.log].reverse().map((l, i) => <li key={i}>{l.replace(/Jugador (\d)/g, (_, n) => nombre(Number(n) - 1))}</li>)}</ol>
        </details>
      )}
      <span className="sr-only">{yo?.apodo}</span>
    </section>
  );
}
