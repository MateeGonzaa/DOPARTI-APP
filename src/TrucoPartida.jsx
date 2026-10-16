import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import Chat from "./Chat";
import Votos from "./Votos";
import { Carta, Confeti } from "./CartasTruco";
import { accionPorTiempo, aplicarConReloj, crearJuego, etiquetaEnvido, opciones, pendiente, textoCanto } from "./lib/truco";
import { cantar, getSilencio, getVoz, setSilencio, setVoz, sonar, vozEsArgentina } from "./lib/sonidos";
import { trucoMsg } from "./lib/mensajes";
import { canalDm, canalTruco } from "./lib/chat";
import TrucoEquiposPartida from "./TrucoEquiposPartida";

const REACCIONES = ["👏", "😂", "😡", "🔥", "🧉"];
const GRACIA_RIVAL_MS = 4000; // si el rival no movió, su tiempo se da por vencido recién 4 s después (cubre desfasajes de reloj)

// Crea una mesa. Si todavía no se ejecutó la migración 9, reintenta sin el campo del reloj.
async function insertarMesa(campos) {
  let r = await supabase.from("truco_partidas").insert(campos).select().single();
  if (r.error && "segundos_turno" in campos) {
    const { segundos_turno: _omitido, ...sinReloj } = campos;
    r = await supabase.from("truco_partidas").insert(sinReloj).select().single();
  }
  return r;
}

export default function TrucoPartida({ id, userId, onVolver, onVerPerfil, onAbrir }) {
  const [p, setP] = useState(undefined); // undefined = cargando, null = no existe
  const [perfiles, setPerfiles] = useState({});
  const [offset, setOffset] = useState(0); // hora del servidor − hora de este dispositivo
  const [ahora, setAhora] = useState(Date.now());
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [silencio, setSil] = useState(getSilencio());
  const [voz, setVozUi] = useState(getVoz());
  const [toast, setToast] = useState(null);
  const [reacciones, setReacciones] = useState([]);
  const [festejo, setFestejo] = useState(false);
  const [pulso, setPulso] = useState({ 0: 0, 1: 0 });

  const enviando = useRef(false);
  const prev = useRef(null);
  const vistoEspera = useRef(false);
  const vivo = useRef(true);
  const canalReac = useRef(null);
  const luego = (fn, ms) => setTimeout(() => { if (vivo.current) fn(); }, ms);

  const fusionar = (fila) => setP((x) => (x && fila.version < x.version ? x : { ...x, ...fila }));

  const cargar = useCallback(async () => {
    const { data, error: e } = await supabase.from("truco_partidas").select("*, comunidades(nombre, codigo_invitacion)").eq("id", id).maybeSingle();
    if (e || !data) return setP((x) => (x === undefined ? null : x));
    fusionar(data);
  }, [id]);

  // Carga + tiempo real + respaldo por si se pierde una señal
  useEffect(() => {
    vivo.current = true;
    cargar();
    const sub = supabase.channel(`truco-mesa:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "truco_partidas", filter: `id=eq.${id}` }, ({ new: fila }) => fusionar(fila))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "truco_partidas", filter: `id=eq.${id}` }, () => setP(null))
      .subscribe();
    const respaldo = setInterval(cargar, 6000);
    return () => { vivo.current = false; clearInterval(respaldo); supabase.removeChannel(sub); };
  }, [id, cargar]);

  // Reloj del servidor, para que el tiempo restante sea el mismo para los dos
  useEffect(() => {
    const t0 = Date.now();
    supabase.rpc("truco_ahora").then(({ data, error: e }) => {
      if (e || !data) return;
      setOffset(new Date(data).getTime() - (t0 + Date.now()) / 2);
    });
  }, []);

  useEffect(() => {
    const i = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  // Perfiles de los jugadores
  useEffect(() => {
    const ids = [p?.creador_id, p?.rival_id].filter((x) => x && !perfiles[x]);
    if (!ids.length) return;
    supabase.from("profiles").select("id, apodo, avatar_url").in("id", ids).then(({ data }) =>
      setPerfiles((x) => ({ ...x, ...Object.fromEntries((data ?? []).map((q) => [q.id, q])) })));
  }, [p?.creador_id, p?.rival_id]);

  // Reacciones en vivo (emoji que sube por la mesa), las ven jugadores y espectadores
  useEffect(() => {
    const ch = supabase.channel(`truco-reac:${id}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "reaccion" }, ({ payload }) => {
        const r = { k: `${Date.now()}${Math.random()}`, emoji: payload.emoji, x: 10 + Math.random() * 75 };
        setReacciones((xs) => [...xs.slice(-8), r]);
        sonar("reaccion");
        luego(() => setReacciones((xs) => xs.filter((q) => q.k !== r.k)), 2600);
      })
      .subscribe();
    canalReac.current = ch;
    return () => { canalReac.current = null; supabase.removeChannel(ch); };
  }, [id]);

  // ---------- Datos derivados ----------
  const s = p?.juego ?? null;
  const jugando = p?.estado === "jugando" && !!s;
  const yo = !p ? -1 : userId === p.creador_id ? 0 : userId === p.rival_id ? 1 : -1;
  const abajo = yo >= 0 ? yo : 0;
  const arriba = 1 - abajo;
  const idDe = (j) => (j === 0 ? p?.creador_id : p?.rival_id);
  const apodo = (j) => perfiles[idDe(j)]?.apodo ?? "…";
  const quien = (j) => (yo === j ? "Vos" : apodo(j));

  const seg = p?.segundos_turno ?? 60;
  const tieneReloj = jugando && !!p?.ultima_jugada_at && p?.segundos_turno != null;
  const restanteMs = tieneReloj ? new Date(p.ultima_jugada_at).getTime() + seg * 1000 - (ahora + offset) : null;
  const pend = jugando && s.ganador === null ? pendiente(s) : null;

  // ---------- Empezar la partida cuando hay dos jugadores ----------
  useEffect(() => {
    const asientos = p?.asientos ?? [p?.creador_id, p?.rival_id];
    const requeridos = (p?.jugadores_equipo ?? 1) * 2;
    if (!p || p.estado !== "esperando" || asientos.filter(Boolean).length < requeridos || !asientos.includes(userId)) return;
    (async () => {
      const { data } = await supabase.from("truco_partidas")
        .update({ estado: "jugando", juego: crearJuego(p.puntos_meta, p.jugadores_equipo ?? 1), version: 1 })
        .eq("id", p.id).eq("estado", "esperando").not("rival_id", "is", null)
        .select("*").maybeSingle();
      if (data) fusionar(data); else cargar();
    })();
  }, [p?.estado, p?.rival_id, p?.asientos?.join("|"), p?.jugadores_equipo, userId]);

  // ---------- Guardar una jugada (con control de versión: si el rival movió primero, se recarga) ----------
  async function guardar(estado) {
    const cambios = { juego: estado, version: p.version + 1 };
    if (estado.ganador !== null) {
      cambios.estado = "terminada";
      cambios.ganador_id = estado.ganador === 0 ? p.creador_id : p.rival_id;
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
    if (enviando.current || !jugando || yo < 0) return;
    enviando.current = true;
    setError("");
    const r = aplicarConReloj(s, { ...accion, j: yo });
    if (!r.ok) setError(r.error);
    else await guardar(r.estado);
    enviando.current = false;
  }

  // ---------- Tiempo de tolerancia ----------
  // Si a quien le toca se le acaba el tiempo, su propio dispositivo juega por él. Si no está (cerró la app),
  // el dispositivo del rival lo hace unos segundos después. Primera vez: pierde la mano. Segunda seguida: pierde la partida.
  useEffect(() => {
    if ((p?.jugadores_equipo ?? 1) > 1) return;
    if (pend === null || yo < 0 || restanteMs === null || enviando.current) return;
    if (restanteMs > (pend === yo ? 0 : -GRACIA_RIVAL_MS)) return;
    enviando.current = true;
    (async () => {
      const r = accionPorTiempo(p.juego);
      if (r.ok) await guardar(r.estado);
      enviando.current = false;
    })();
  }, [ahora]);

  // Cuenta regresiva sonora en los últimos 10 segundos de tu turno
  const segundosQuedan = restanteMs === null ? null : Math.max(0, Math.ceil(restanteMs / 1000));
  useEffect(() => {
    if (pend !== yo || yo < 0 || segundosQuedan === null || segundosQuedan === 0) return;
    if (segundosQuedan <= 10) sonar(segundosQuedan <= 3 ? "alarma" : "tick");
  }, [segundosQuedan, pend]);

  // ---------- Sonidos y avisos cuando cambia el juego ----------
  useEffect(() => {
    if (p?.estado === "esperando") vistoEspera.current = true;
    const a = prev.current;
    prev.current = s;
    if (!s) return;
    if ((p?.jugadores_equipo ?? 1) > 1) return;
    if (!a) { if (vistoEspera.current) sonar("repartir"); return; }
    if (s === a) return;

    const cuenta = (x) => x.mesa.flat().filter(Boolean).length;
    const ultima = s.log.at(-1);
    const nuevaLinea = ultima && ultima !== a.log.at(-1);
    const manoNueva = s.numMano !== a.numMano;
    const termino = s.ganador !== null && a.ganador === null;

    if (cuenta(s) > cuenta(a)) sonar("carta");
    if (s.canto && JSON.stringify(s.canto) !== JSON.stringify(a.canto)) {
      sonar("canto");
      cantar(s.canto.tipo === "truco" ? ["truco", "retruco", "vale_cuatro"][s.canto.nivel - 1] : s.canto.cantos.at(-1));
    } else if (nuevaLinea && /no quiso|: no quiero/.test(ultima)) { sonar("no_quiero"); cantar("no_quiero"); }
    else if (nuevaLinea && /: quiero$/.test(ultima)) { sonar("quiero"); cantar("quiero"); }
    else if (nuevaLinea && /al mazo/.test(ultima)) cantar("mazo");

    const cambioPuntos = s.puntos[0] !== a.puntos[0] || s.puntos[1] !== a.puntos[1];
    if (cambioPuntos) {
      luego(() => sonar("puntos"), 250);
      setPulso((x) => ({ 0: x[0] + (s.puntos[0] !== a.puntos[0] ? 1 : 0), 1: x[1] + (s.puntos[1] !== a.puntos[1] ? 1 : 0) }));
    }

    // Mensaje flotante
    let texto = null;
    if (manoNueva && s.resumen) {
      const g = s.resumen.ganador;
      const para = g === yo ? "vos" : apodo(g);
      texto = s.resumen.razon === "ganó la mano"
        ? (g === yo ? `¡Ganaste la mano! +${s.resumen.puntos}` : `${apodo(g)} ganó la mano +${s.resumen.puntos}`)
        : `+${s.resumen.puntos} para ${para} (${s.resumen.razon})`;
      luego(() => sonar(yo < 0 || g === yo ? "mano_ganada" : "mano_perdida"), 350);
      if (!termino) luego(() => sonar("repartir"), 1100);
    } else if (nuevaLinea && ultima.startsWith("Envido:") && s.envidoInfo) {
      const { e, gana, pts } = s.envidoInfo;
      texto = `Envido: ${e[abajo]} a ${e[arriba]} · +${pts} para ${gana === yo ? "vos" : apodo(gana)}`;
    } else if (nuevaLinea && !/ de (Espada|Basto|Oro|Copa)$/.test(ultima)) {
      texto = ultima.replace(/Jugador (\d)/g, (_, n) => apodo(Number(n) - 1));
    }
    if (texto) { const k = Date.now(); setToast({ texto, k }); luego(() => setToast((t) => (t?.k === k ? null : t)), 3200); }

    if (termino) {
      luego(() => {
        sonar(yo < 0 || s.ganador === yo ? "victoria" : "derrota");
        if (s.ganador === yo) setFestejo(true);
        if (yo >= 0) luego(() => cantar(s.ganador === yo ? "victoria" : "derrota"), 1400);
      }, 600);
    } else if (pendiente(s) === yo && yo >= 0 && (pendiente(a) !== yo || manoNueva)) {
      luego(() => sonar("turno"), manoNueva ? 1300 : 450);
    }
  }, [p?.juego]);

  // Si entrás a una partida que ya terminó siendo ganador, también hay festejo
  useEffect(() => {
    if ((p?.jugadores_equipo ?? 1) === 1 && p?.estado === "terminada" && p.ganador_id === userId && !prev.current) setFestejo(true);
  }, [p?.estado, p?.jugadores_equipo]);

  // ---------- Acciones de la mesa ----------
  const reaccionar = (emoji) => canalReac.current?.send({ type: "broadcast", event: "reaccion", payload: { emoji } });
  const alternarSonido = () => { setSilencio(!silencio); setSil(!silencio); };
  const alternarVoz = () => {
    const nueva = !voz;
    setVoz(nueva);
    setVozUi(nueva);
    if (nueva) {
      cantar("probar");
      setAviso(vozEsArgentina() ? "Voz argentina activada." : "Voz activada. Si tu dispositivo tiene una voz de español de Argentina, se usa sola; si no, se usa la más parecida.");
      setTimeout(() => setAviso(""), 5000);
    }
  };

  async function sentarme() {
    setError("");
    const { error: e } = await supabase.rpc("truco_unirse", { p_partida: id });
    if (e) setError("No se pudo sentar en la mesa.");
    cargar();
  }

  async function cancelarMesa() {
    const { data, error: e } = await supabase.from("truco_partidas").delete()
      .eq("id", id).eq("creador_id", userId).eq("estado", "esperando").select("id").maybeSingle();
    if (e) return setError("No se pudo cancelar la mesa.");
    if (!data) return setError("La mesa ya empezó o ya fue cancelada.");
    onVolver();
  }

  async function revancha() {
    const { data, error: e } = await insertarMesa({ puntos_meta: p.puntos_meta, segundos_turno: p.segundos_turno ?? 60, comunidad_id: p.comunidad_id });
    if (e) return setError("No se pudo crear la revancha.");
    const otroId = idDe(1 - yo);
    if (otroId) {
      await supabase.from("mensajes").insert({ canal: canalDm(userId, otroId), texto: `🃏 ¡Revancha! Sentate acá: ${location.origin}/?truco=${data.id}` });
    }
    onAbrir?.(data.id);
  }

  // ---------- Pantallas ----------
  if (p === undefined) return <Cargando texto="Abriendo la mesa…" />;
  if (p === null) {
    return (
      <section className="space-y-4 py-10 text-center">
        <p className="text-4xl" aria-hidden="true">🃏</p>
        <p className="font-bold">Esta mesa no existe o fue cancelada.</p>
        <button onClick={onVolver} className={`${btn} bg-pasto text-white`}>Volver al Truco</button>
      </section>
    );
  }

  if ((p.jugadores_equipo ?? 1) > 1) {
    return <TrucoEquiposPartida id={id} userId={userId} onVolver={onVolver} onVerPerfil={onVerPerfil} />;
  }

  const Cabecera = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button onClick={onVolver} className="min-h-11 px-1 font-semibold text-cesped">← Volver</button>
      <h2 className="font-display text-xl font-extrabold">🃏 Truco a {p.puntos_meta}</h2>
      <div className="flex gap-1">
        <button onClick={alternarSonido} aria-pressed={!silencio} aria-label={silencio ? "Activar sonido" : "Silenciar"} className={`${btn} px-3 ${silencio ? "bg-panel" : "bg-panel-alto"}`}>{silencio ? "🔇" : "🔊"}</button>
        {!silencio && <button onClick={alternarVoz} aria-pressed={voz} aria-label="Voz que canta el truco" title="Voz que canta el truco" className={`${btn} px-3 ${voz ? "bg-pasto text-white" : "bg-panel"}`}>🗣️</button>}
      </div>
    </div>
  );

  // --- Sala de espera ---
  if (p.estado === "esperando" && !p.rival_id) {
    const soyCreador = userId === p.creador_id;
    const msg = trucoMsg({ partida: p, comunidad: p.comunidades });
    const link = `${location.origin}/?truco=${p.id}`;
    const copiar = async () => { try { await navigator.clipboard.writeText(msg); setAviso("Mensaje copiado. Pegalo donde quieras."); } catch { setAviso("No pudimos copiar el mensaje."); } };
    const compartir = async () => {
      if (navigator.share) { try { return await navigator.share({ text: msg }); } catch { return; } }
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    };
    return (
      <section className="space-y-5">
        {Cabecera}
        <div className="space-y-4 rounded-3xl bg-panel p-6 text-center">
          <div className="mesa-espera mx-auto grid size-20 place-items-center rounded-full bg-pasto/30 text-4xl" aria-hidden="true">🃏</div>
          {soyCreador ? (
            <>
              <h3 className="text-xl font-extrabold">Mesa lista. Falta tu rival.</h3>
              <p className="text-tinta/70">Compartí el link: quien no tenga cuenta se registra y se sienta directo en tu mesa.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={compartir} className={`${btn} bg-pasto text-white`}>Invitar a jugar</button>
                <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} className={`${btn} bg-panel-alto`}>Enviar por WhatsApp</a>
                <button onClick={copiar} className={`${btn} bg-panel-alto`}>Copiar mensaje</button>
              </div>
              <p className="break-all text-xs text-tinta/60">{link}</p>
              <button onClick={cancelarMesa} className="min-h-11 text-sm font-semibold text-brasa">Cancelar mesa</button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-extrabold">{apodo(0)} te espera para jugar al Truco</h3>
              <p className="text-tinta/70">1 contra 1 · a {p.puntos_meta} puntos{p.segundos_turno ? ` · ${p.segundos_turno} s por jugada` : ""}</p>
              <button onClick={sentarme} className={`${btn} bg-pasto text-white`}>Sentarme a jugar</button>
            </>
          )}
          {aviso && <p role="status" className="text-sm font-semibold text-cesped">{aviso}</p>}
          {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
        </div>
        <Chat canal={canalTruco(p.id)} userId={userId} onVerPerfil={onVerPerfil} alto="h-44" vacio="Escribile al que se sume a la mesa." />
      </section>
    );
  }

  if (!s) return <Cargando texto="Repartiendo las cartas…" />;

  // --- Partida en curso o terminada ---
  const o = opciones(s, yo);
  const terminada = s.ganador !== null || p.estado === "terminada";
  const gane = terminada && s.ganador === yo;
  const miTurno = pend === yo && yo >= 0;
  const respondiendo = !!s.canto && yo >= 0 && o.quiero;
  const frac = restanteMs === null ? null : Math.min(1, Math.max(0, restanteMs / (seg * 1000)));
  const urgente = frac !== null && segundosQuedan <= 10;
  const demoras = pend !== null ? (s.tiempos?.[pend] ?? 0) : 0;

  const marcador = (j) => (
    <button onClick={() => idDe(j) && onVerPerfil?.(idDe(j))} className="flex min-w-0 items-center gap-2 rounded-lg px-1 text-left">
      <Avatar perfil={perfiles[idDe(j)]} size={36} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{quien(j)}{s.mano === j && !terminada ? " · mano" : ""}</span>
        <span key={pulso[j]} className={`inline-block font-display text-3xl font-extrabold ${pulso[j] ? "puntos-salta" : ""}`}>{s.puntos[j]}</span>
        <span className="text-sm text-tinta/60"> / {s.meta}</span>
      </span>
    </button>
  );

  const filaMesa = (j) => (
    <div className="flex justify-center gap-2">
      {[0, 1, 2].map((r) => {
        const c = s.mesa[j][r];
        return (
          <div key={r} className={`grid h-[5.1rem] w-[3.4rem] place-items-center rounded-xl border border-dashed sm:h-24 sm:w-16 ${s.bazas[r] === j ? "border-cesped bg-cesped/10" : "border-white/15"}`}>
            {c && <Carta key={`${s.numMano}-${j}-${r}`} c={c} chica className={j === abajo ? "carta-juega-yo" : "carta-juega-rival"} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="space-y-4">
      {festejo && <Confeti />}
      {Cabecera}

      {/* Marcador */}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-panel p-3">
        {marcador(abajo)}
        <span className="text-sm font-semibold text-tinta/60">Mano {s.numMano}</span>
        {marcador(arriba)}
      </div>

      {/* Reloj */}
      {frac !== null && !terminada && (
        <div className={urgente && miTurno ? "reloj-urgente" : ""}>
          <div className="mb-1 flex items-center justify-between text-sm font-semibold">
            <span>{miTurno ? "⏱️ Te toca a vos" : pend === null ? "" : `⏳ Esperando a ${quien(pend)}`}</span>
            <span className={urgente ? "text-brasa" : "text-tinta/70"}>{segundosQuedan} s</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-tinta/15" role="timer" aria-label={`Quedan ${segundosQuedan} segundos`}>
            <div className={`h-full rounded-full transition-[width] duration-200 ${frac > 0.5 ? "bg-cesped" : frac > 0.2 ? "bg-amber-400" : "bg-brasa"}`} style={{ width: `${frac * 100}%` }} />
          </div>
          {demoras > 0 && (
            <p className="mt-1 text-xs font-semibold text-brasa">
              ⚠️ {miTurno ? "Ya te quedaste sin tiempo una vez" : `${quien(pend)} ya se quedó sin tiempo una vez`}: si pasa de nuevo, {miTurno ? "perdés" : "pierde"} la partida
              .
            </p>
          )}
        </div>
      )}

      {/* Mesa */}
      <div className="relative space-y-3 overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d3b22] to-[#0a2a19] p-3 ring-1 ring-white/10">
        <div className="flex justify-center gap-1" aria-label={`Cartas de ${apodo(arriba)}`}>
          {Array.from({ length: s.manos[arriba].length }, (_, i) => (
            <Carta key={`${s.numMano}-r-${i}`} oculta chica className="carta-reparte" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>

        {filaMesa(arriba)}

        <div className="grid min-h-14 place-items-center">
          {s.canto && !terminada ? (
            <div key={textoCanto(s) + s.canto.de} className="canto-pop rounded-2xl bg-naranja px-4 py-2 text-center text-white shadow-lg">
              <p className="text-xs font-semibold opacity-80">{s.canto.de === yo ? "Cantaste" : `${apodo(s.canto.de)} canta`}</p>
              <p className="font-display text-2xl font-extrabold uppercase">¡{textoCanto(s)}!</p>
            </div>
          ) : toast ? (
            <p key={toast.k} role="status" className="toast-entra rounded-full bg-black/40 px-4 py-1.5 text-center text-sm font-semibold">{toast.texto}</p>
          ) : null}
        </div>

        {filaMesa(abajo)}

        <div className={`flex min-h-[7rem] justify-center gap-2 rounded-2xl p-1 sm:min-h-[9rem] ${miTurno && !s.canto ? "tu-turno" : ""}`}>
          {s.manos[abajo].map((c, i) => (
            yo >= 0
              ? <Carta key={`${s.numMano}-${c.n}${c.p}`} c={c} onClick={() => jugar({ tipo: "carta", idx: i })} deshabilitada={!o.carta} className="carta-reparte" style={{ animationDelay: `${i * 0.1}s` }} />
              : <Carta key={`${s.numMano}-e-${i}`} oculta className="carta-reparte" />
          ))}
        </div>

        {/* Reacciones flotantes */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {reacciones.map((r) => <span key={r.k} className="reaccion-flota absolute bottom-6 text-4xl" style={{ left: `${r.x}%` }}>{r.emoji}</span>)}
        </div>
      </div>

      {/* Botones de juego */}
      {!terminada && yo >= 0 && (
        <div className="space-y-2" aria-live="polite">
          {!miTurno && <p className="text-center text-sm text-tinta/70">{respondiendo ? "" : `Esperando a ${apodo(arriba)}…`}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {o.quiero && (
              <>
                <button onClick={() => jugar({ tipo: "quiero" })} className={`${btn} bg-pasto text-white`}>Quiero</button>
                <button onClick={() => jugar({ tipo: "no_quiero" })} className={`${btn} bg-panel-alto text-brasa`}>No quiero</button>
              </>
            )}
            {o.truco && (
              <button onClick={() => jugar({ tipo: "truco" })} className={`${btn} bg-naranja text-white`}>
                {respondiendo ? `Quiero ${o.truco.toLowerCase()}` : o.truco}
              </button>
            )}
            {o.envido.map((t) => <button key={t} onClick={() => jugar({ tipo: t })} className={`${btn} bg-celeste text-white`}>{etiquetaEnvido(t)}</button>)}
            {o.mazo && <button onClick={() => jugar({ tipo: "mazo" })} className={`${btn} bg-panel-alto`}>Al mazo</button>}
          </div>
        </div>
      )}

      {aviso && <p role="status" className="text-center text-sm font-semibold text-cesped">{aviso}</p>}
      {error && <p role="alert" className="text-center text-sm font-semibold text-brasa">{error}</p>}

      {/* Resultado */}
      {terminada && (
        <div className="space-y-3 rounded-3xl bg-panel p-5 text-center">
          <p className="text-5xl" aria-hidden="true">{yo < 0 ? "🏆" : gane ? "🏆" : "🃏"}</p>
          <h3 className="text-2xl font-extrabold">
            {yo < 0 ? `Ganó ${quien(s.ganador ?? 0)}` : gane ? "¡Ganaste la partida!" : `Ganó ${apodo(s.ganador)}`}
          </h3>
          <p className="text-tinta/70">{s.puntos[abajo]} a {s.puntos[arriba]}{s.log.at(-1)?.includes("abandonó") ? " · por falta de tiempo" : ""}</p>
          {yo >= 0 && <p className="text-sm text-tinta/70">{gane ? "Esta victoria suma como partido jugado." : "En el Truco solo las victorias suman nivel. ¡Pedí la revancha!"}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {yo >= 0 && <button onClick={revancha} className={`${btn} bg-pasto text-white`}>Pedir revancha</button>}
            <button onClick={onVolver} className={`${btn} bg-panel-alto`}>Volver al Truco</button>
          </div>
        </div>
      )}

      {/* Reacciones */}
      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Reacciones">
        {REACCIONES.map((e) => <button key={e} onClick={() => reaccionar(e)} aria-label={`Reaccionar con ${e}`} className={`${btn} bg-panel px-3 text-2xl`}>{e}</button>)}
      </div>

      {/* Espectadores: votan quién gana */}
      {yo < 0 && p.rival_id && (
        <Votos objetivo={`truco:${p.id}`} userId={userId} cerrado={terminada}
          opciones={[{ id: p.creador_id, label: apodo(0) }, { id: p.rival_id, label: apodo(1), color: "bg-celeste" }]} />
      )}
      {yo < 0 && <p className="text-center text-sm text-tinta/60">Estás mirando la partida en vivo.</p>}

      <details className="rounded-2xl bg-panel p-3" open={yo < 0}>
        <summary className="min-h-11 cursor-pointer py-2 font-bold">💬 Chat de la mesa</summary>
        <div className="pt-2"><Chat canal={canalTruco(p.id)} userId={userId} onVerPerfil={onVerPerfil} alto="h-56" /></div>
      </details>
    </section>
  );
}
