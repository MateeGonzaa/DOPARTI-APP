import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import Chat from "./Chat";
import { Carta } from "./CartasTruco";
import { accionPorTiempo, aplicarConReloj, opciones, pendiente, textoCanto, etiquetaEnvido } from "./lib/truco";
import { canalTruco } from "./lib/chat";

const GRACIA_RIVAL_MS = 4000;
const NOMBRE_EQUIPO = ["Equipo naranja", "Equipo celeste"];

export default function TrucoEquiposPartida({ id, userId, onVolver, onVerPerfil }) {
  const [p, setP] = useState(undefined);
  const [perfiles, setPerfiles] = useState({});
  const [ahora, setAhora] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const enviando = useRef(false);
  const vivo = useRef(true);

  const fusionar = (fila) => setP((x) => (x && fila.version < x.version ? x : { ...x, ...fila }));
  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.from("truco_partidas")
      .select("*, comunidades(nombre, codigo_invitacion)").eq("id", id).maybeSingle();
    if (e || !data) return setP((x) => (x === undefined ? null : x));
    fusionar(data);
  }, [id]);

  useEffect(() => {
    vivo.current = true;
    cargar();
    const sub = supabase.channel(`truco-equipos:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "truco_partidas", filter: `id=eq.${id}` }, ({ new: fila }) => fusionar(fila))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "truco_partidas", filter: `id=eq.${id}` }, () => setP(null))
      .subscribe();
    const respaldo = setInterval(cargar, 6000);
    return () => { vivo.current = false; clearInterval(respaldo); supabase.removeChannel(sub); };
  }, [id, cargar]);

  useEffect(() => {
    const i = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const t0 = Date.now();
    supabase.rpc("truco_ahora").then(({ data, error: e }) => {
      if (!e && data) setOffset(new Date(data).getTime() - (t0 + Date.now()) / 2);
    });
  }, []);

  const asientos = p?.asientos ?? [p?.creador_id, p?.rival_id];
  const ids = asientos.filter(Boolean);
  useEffect(() => {
    const faltan = ids.filter((x) => !perfiles[x]);
    if (!faltan.length) return;
    supabase.from("profiles").select("id, apodo, avatar_url").in("id", faltan).then(({ data }) =>
      setPerfiles((x) => ({ ...x, ...Object.fromEntries((data ?? []).map((q) => [q.id, q])) })));
  }, [ids.join("|")]);

  const yo = asientos.indexOf(userId);
  const s = p?.juego ?? null;
  const enJuego = p?.estado === "jugando" && !!s;
  const terminada = p?.estado === "terminada" || !!s && s.ganador !== null;
  const pend = enJuego && !terminada ? pendiente(s) : null;
  const seg = p?.segundos_turno ?? 60;
  const restanteMs = enJuego && p?.ultima_jugada_at
    ? new Date(p.ultima_jugada_at).getTime() + seg * 1000 - (ahora + offset) : null;
  const segundos = restanteMs === null ? null : Math.max(0, Math.ceil(restanteMs / 1000));

  async function sentarme() {
    setError("");
    const { error: e } = await supabase.rpc("truco_sentarse", { p_partida: id });
    if (e) setError(e.message?.includes("llena") ? "Ya se ocuparon todos los lugares." : "No se pudo sentar en la mesa.");
    await cargar();
  }

  async function cancelarMesa() {
    const { data, error: e } = await supabase.from("truco_partidas").delete()
      .eq("id", id).eq("creador_id", userId).eq("estado", "esperando").select("id").maybeSingle();
    if (e) return setError("No se pudo cancelar la mesa.");
    if (!data) return setError("La mesa ya empezó o ya fue cancelada.");
    onVolver();
  }

  async function guardar(estado) {
    const cambios = { juego: estado, version: p.version + 1 };
    if (estado.ganador !== null) {
      const equipo = estado.ganador;
      cambios.estado = "terminada";
      cambios.ganador_equipo = equipo;
      cambios.ganador_id = asientos.find((_, i) => i % 2 === equipo) ?? null;
      cambios.terminada_at = new Date().toISOString();
    }
    const { data, error: e } = await supabase.from("truco_partidas").update(cambios)
      .eq("id", p.id).eq("version", p.version).eq("estado", "jugando").select("*").maybeSingle();
    if (e) { setError("No se pudo enviar la jugada. Revisá tu conexión."); return false; }
    if (!data) { await cargar(); return false; }
    fusionar(data);
    return true;
  }

  async function jugar(accion) {
    if (enviando.current || !enJuego || yo < 0) return;
    enviando.current = true;
    setError("");
    const r = aplicarConReloj(s, { ...accion, j: yo });
    if (!r.ok) setError(r.error);
    else await guardar(r.estado);
    enviando.current = false;
  }

  useEffect(() => {
    if (pend === null || yo < 0 || restanteMs === null || enviando.current) return;
    if (restanteMs > (pend === yo ? 0 : -GRACIA_RIVAL_MS)) return;
    enviando.current = true;
    (async () => {
      const r = accionPorTiempo(s);
      if (r.ok) await guardar(r.estado);
      enviando.current = false;
    })();
  }, [ahora]);

  if (p === undefined) return <Cargando texto="Abriendo la mesa…" />;
  if (p === null) return (
    <section className="space-y-4 py-10 text-center">
      <p className="text-4xl" aria-hidden="true">🃏</p>
      <p className="font-bold">Esta mesa no existe o fue cancelada.</p>
      <button onClick={onVolver} className={`${btn} bg-pasto text-white`}>Volver al Truco</button>
    </section>
  );

  const limite = (p.jugadores_equipo ?? 2) * 2;
  const ocupados = ids.length;
  const nombre = (j) => perfiles[asientos[j]]?.apodo ?? (asientos[j] ? "Jugador" : "Lugar libre");
  const enlace = `${location.origin}/?truco=${p.id}`;
  const msg = `🃏 Te espero en una mesa de Truco ${p.jugadores_equipo} contra ${p.jugadores_equipo}, a ${p.puntos_meta} puntos.\nSumate acá: ${enlace}`;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(msg); setError("Invitación copiada."); }
    catch { setError("No pudimos copiar la invitación."); }
  };
  const jugadoresDeEquipo = (equipo) => asientos.map((_, j) => j).filter((j) => j % 2 === equipo);
  const o = enJuego ? opciones(s, yo) : null;
  const miTurno = pend === yo && yo >= 0;

  const jugador = (j) => {
    const mano = s?.manos?.[j] ?? [];
    return (
      <div key={j} className={`min-w-0 rounded-xl p-2 ${j === yo ? "bg-white/10 ring-1 ring-white/20" : "bg-black/10"}`}>
        <div className="flex min-h-9 items-center gap-2">
          <Avatar perfil={perfiles[asientos[j]]} size={28} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{j === yo ? "Vos" : nombre(j)}{s?.mano === j && !terminada ? " · mano" : ""}</span>
          <span className="text-xs text-white/70">{j % 2 === 0 ? "Naranja" : "Celeste"}</span>
        </div>
        {s && <div className="my-1 flex min-h-9 justify-center gap-1">
          {j === yo ? mano.map((c, i) => (
            <Carta key={`${s.numMano}-${c.n}${c.p}`} c={c} chica onClick={() => jugar({ tipo: "carta", idx: i })} deshabilitada={!o?.carta} />
          )) : Array.from({ length: mano.length }, (_, i) => <Carta key={`${s.numMano}-${j}-${i}`} oculta chica />)}
        </div>}
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((r) => {
            const c = s?.mesa?.[j]?.[r];
            const equipoGano = s?.bazas?.[r] === j % 2;
            return <div key={r} className={`grid h-[4.2rem] w-11 place-items-center rounded-lg border border-dashed sm:h-[5.1rem] sm:w-[3.4rem] ${equipoGano ? "border-cesped bg-cesped/10" : "border-white/15"}`}>
              {c && <Carta c={c} chica />}
            </div>;
          })}
        </div>
      </div>
    );
  };

  if (p.estado === "esperando") return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onVolver} className="min-h-11 px-1 font-semibold text-cesped">← Volver</button>
        <h2 className="font-display text-xl font-extrabold">🃏 Truco {p.jugadores_equipo} contra {p.jugadores_equipo}</h2>
      </div>
      <div className="space-y-4 rounded-3xl bg-panel p-5 text-center">
        <p className="text-lg font-extrabold">Faltan {limite - ocupados} jugadores</p>
        <p className="text-sm text-tinta/70">A {p.puntos_meta} puntos. Los lugares alternan entre los dos equipos.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map((equipo) => <div key={equipo} className="space-y-1 rounded-2xl bg-panel-alto p-3">
            <h3 className="font-bold">{NOMBRE_EQUIPO[equipo]}</h3>
            {jugadoresDeEquipo(equipo).map((j) => <p key={j} className="truncate text-sm">{asientos[j] ? nombre(j) : "Esperando jugador…"}</p>)}
          </div>)}
        </div>
        {yo < 0 && ocupados < limite && <button onClick={sentarme} className={`${btn} bg-pasto text-white`}>Sentarme a jugar</button>}
        {yo >= 0 && <p className="text-sm font-semibold text-cesped">Ya estás en la mesa. Compartí la invitación para completar los equipos.</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => navigator.share ? navigator.share({ text: msg }).catch(() => {}) : copiar()} className={`${btn} bg-panel-alto`}>Invitar a jugar</button>
          <button onClick={copiar} className={`${btn} bg-panel-alto`}>Copiar invitación</button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
        {userId === p.creador_id && <button onClick={cancelarMesa} className="min-h-11 text-sm font-semibold text-brasa">Cancelar mesa</button>}
      </div>
      <Chat canal={canalTruco(p.id)} userId={userId} onVerPerfil={onVerPerfil} alto="h-44" vacio="Escribile a los que se sumen a la mesa." />
    </section>
  );

  if (!s) return <Cargando texto="Repartiendo las cartas…" />;
  const frac = restanteMs === null ? null : Math.min(1, Math.max(0, restanteMs / (seg * 1000)));
  const equipoGanador = s.ganador;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onVolver} className="min-h-11 px-1 font-semibold text-cesped">← Volver</button>
        <h2 className="font-display text-xl font-extrabold">🃏 Truco {p.jugadores_equipo} contra {p.jugadores_equipo} · Mano {s.numMano}</h2>
      </div>
      <div className="flex items-center justify-around gap-3 rounded-2xl bg-panel p-3 text-center">
        {[0, 1].map((equipo) => <div key={equipo} className="flex-1">
          <p className="text-sm font-bold">{NOMBRE_EQUIPO[equipo]}</p>
          <p className="font-display text-3xl font-extrabold">{s.puntos[equipo]} <span className="text-sm font-semibold text-tinta/60">/ {s.meta}</span></p>
        </div>)}
      </div>
      {frac !== null && !terminada && <div>
        <div className="mb-1 flex items-center justify-between text-sm font-semibold">
          <span>{miTurno ? "⏱️ Te toca a vos" : pend === null ? "" : `⏳ Esperando a ${nombre(pend)}`}</span><span>{segundos} s</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-tinta/15" role="timer" aria-label={`Quedan ${segundos} segundos`}>
          <div className={`h-full transition-[width] duration-200 ${frac > .5 ? "bg-cesped" : frac > .2 ? "bg-amber-400" : "bg-brasa"}`} style={{ width: `${frac * 100}%` }} />
        </div>
      </div>}

      <div className="space-y-2 overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d3b22] to-[#0a2a19] p-3 ring-1 ring-white/10">
        {[0, 1].map((equipo) => <div key={equipo} className="space-y-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wide text-white/65">{NOMBRE_EQUIPO[equipo]}</p>
          <div className="grid gap-2 sm:grid-cols-2">{jugadoresDeEquipo(equipo).map(jugador)}</div>
        </div>)}
        {s.canto && !terminada && <div className="rounded-2xl bg-naranja px-4 py-2 text-center text-white shadow-lg">
          <p className="text-xs font-semibold opacity-80">{s.canto.de === yo ? "Cantaste" : `${nombre(s.canto.de)} canta`}</p>
          <p className="font-display text-2xl font-extrabold uppercase">¡{textoCanto(s)}!</p>
        </div>}
      </div>

      {!terminada && yo >= 0 && !miTurno && <p className="text-center text-sm text-tinta/70">Esperando a {nombre(pend)}…</p>}
      {!terminada && yo >= 0 && <div className="flex flex-wrap justify-center gap-2" aria-live="polite">
        {o.quiero && <>
          <button onClick={() => jugar({ tipo: "quiero" })} className={`${btn} bg-pasto text-white`}>Quiero</button>
          <button onClick={() => jugar({ tipo: "no_quiero" })} className={`${btn} bg-panel-alto text-brasa`}>No quiero</button>
        </>}
        {o.truco && <button onClick={() => jugar({ tipo: "truco" })} className={`${btn} bg-naranja text-white`}>{o.quiero ? `Quiero ${o.truco.toLowerCase()}` : o.truco}</button>}
        {o.envido.map((t) => <button key={t} onClick={() => jugar({ tipo: t })} className={`${btn} bg-celeste text-white`}>{etiquetaEnvido(t)}</button>)}
        {o.mazo && <button onClick={() => jugar({ tipo: "mazo" })} className={`${btn} bg-panel-alto`}>Al mazo</button>}
      </div>}
      {!terminada && yo < 0 && <p className="text-center text-sm text-tinta/60">Estás mirando la partida en vivo.</p>}
      {terminada && <div className="space-y-2 rounded-3xl bg-panel p-5 text-center">
        <p className="text-4xl" aria-hidden="true">🏆</p>
        <h3 className="text-2xl font-extrabold">Ganó {NOMBRE_EQUIPO[equipoGanador ?? p.ganador_equipo ?? 0]}</h3>
        <p className="text-tinta/70">{s.puntos[0]} a {s.puntos[1]}{s.log.at(-1)?.includes("abandonó") ? " · por falta de tiempo" : ""}</p>
        <button onClick={onVolver} className={`${btn} bg-panel-alto`}>Volver al Truco</button>
      </div>}
      {error && <p role="alert" className="text-center text-sm font-semibold text-brasa">{error}</p>}
      <Chat canal={canalTruco(p.id)} userId={userId} onVerPerfil={onVerPerfil} alto="h-56" />
    </section>
  );
}
