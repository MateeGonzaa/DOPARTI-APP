import { useEffect, useRef, useState } from "react";
import { btn, Avatar } from "./ui";
import { Carta, Confeti } from "./CartasTruco";
import { aplicar, crearJuego, etiquetaEnvido, opciones, pendiente, textoCanto } from "./lib/truco";
import { DIFICULTADES, ejecutarBot } from "./lib/trucoBot";
import { cantar, getSilencio, getVoz, setSilencio, setVoz, sonar, vozEsArgentina } from "./lib/sonidos";

export default function TrucoPractica({ onVolver }) {
  const [dificultad, setDificultad] = useState("retro");
  const [meta, setMeta] = useState(15);
  const [juego, setJuego] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [silencio, setSil] = useState(getSilencio());
  const [voz, setVozUi] = useState(getVoz());
  const [pensando, setPensando] = useState(false);
  const prev = useRef(null);
  const temporizadores = useRef(new Set());
  const bot = DIFICULTADES.find((d) => d.id === dificultad)?.nombre ?? "Retro";

  const luego = (fn, ms) => {
    const timer = setTimeout(() => {
      temporizadores.current.delete(timer);
      fn();
    }, ms);
    temporizadores.current.add(timer);
  };

  useEffect(() => () => {
    temporizadores.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const anterior = prev.current;
    prev.current = juego;
    if (!juego) return;
    if (!anterior) { sonar("repartir"); return; }
    if (juego === anterior) return;

    const cuenta = (s) => s.mesa.flat().filter(Boolean).length;
    const ultima = juego.log.at(-1);
    const nuevaLinea = ultima && ultima !== anterior.log.at(-1);
    const manoNueva = juego.numMano !== anterior.numMano;
    const termino = juego.ganador !== null && anterior.ganador === null;

    if (cuenta(juego) > cuenta(anterior)) sonar("carta");
    if (juego.canto && JSON.stringify(juego.canto) !== JSON.stringify(anterior.canto)) {
      sonar("canto");
      cantar(juego.canto.tipo === "truco" ? ["truco", "retruco", "vale_cuatro"][juego.canto.nivel - 1] : juego.canto.cantos.at(-1));
    } else if (nuevaLinea && /no quiso|: no quiero/.test(ultima)) { sonar("no_quiero"); cantar("no_quiero"); }
    else if (nuevaLinea && /: quiero$/.test(ultima)) { sonar("quiero"); cantar("quiero"); }
    else if (nuevaLinea && /al mazo/.test(ultima)) cantar("mazo");

    const cambioPuntos = juego.puntos[0] !== anterior.puntos[0] || juego.puntos[1] !== anterior.puntos[1];
    if (cambioPuntos) luego(() => sonar("puntos"), 250);

    if (manoNueva && juego.resumen) {
      luego(() => sonar(juego.resumen.ganador === 0 ? "mano_ganada" : "mano_perdida"), 350);
      if (!termino) luego(() => sonar("repartir"), 1100);
    }

    if (termino) {
      luego(() => {
        sonar(juego.ganador === 0 ? "victoria" : "derrota");
        luego(() => cantar(juego.ganador === 0 ? "victoria" : "derrota"), 1400);
      }, 600);
    } else if (pendiente(juego) === 0 && (pendiente(anterior) !== 0 || manoNueva)) {
      luego(() => sonar("turno"), manoNueva ? 1300 : 450);
    }
  }, [juego]);

  useEffect(() => {
    if (!juego || juego.ganador !== null || pendiente(juego) !== 1) return;
    setPensando(true);
    const timer = setTimeout(() => {
      setJuego((actual) => {
        if (!actual || actual.ganador !== null || pendiente(actual) !== 1) return actual;
        const r = ejecutarBot(actual, dificultad);
        if (!r.ok) { setError(r.error); return actual; }
        return r.estado;
      });
      setPensando(false);
    }, dificultad === "noob" ? 500 : 850);
    return () => { clearTimeout(timer); setPensando(false); };
  }, [juego, dificultad]);

  function jugar(tipo, idx) {
    if (!juego || juego.ganador !== null || pendiente(juego) !== 0 || pensando) return;
    const r = aplicar(juego, { tipo, idx, j: 0 });
    if (!r.ok) setError(r.error);
    else { setError(""); setJuego(r.estado); }
  }

  function nuevaPartida() {
    prev.current = null;
    setJuego(crearJuego(meta));
    setError("");
  }

  const alternarSonido = () => { setSilencio(!silencio); setSil(!silencio); };
  const alternarVoz = () => {
    const nueva = !voz;
    setVoz(nueva);
    setVozUi(nueva);
    if (nueva) {
      cantar("probar");
      setAviso(vozEsArgentina() ? "Voz argentina activada." : "Voz activada. Si tu dispositivo tiene una voz de español de Argentina, se usa sola; si no, se usa la más parecida.");
      luego(() => setAviso(""), 5000);
    }
  };

  if (!juego) return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold">🃏 Practicar Truco</h2>
        <button className="min-h-11 px-2 font-semibold text-cesped" onClick={onVolver}>Volver</button>
      </div>
      <div className="space-y-4 rounded-2xl bg-panel p-4">
        <h3 className="font-extrabold">Elegí tu rival</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {DIFICULTADES.map((d) => (
            <button key={d.id} aria-pressed={dificultad === d.id} onClick={() => setDificultad(d.id)}
              className={`${btn} flex flex-col items-start gap-1 ${dificultad === d.id ? "bg-pasto text-white" : "bg-panel-alto"}`}>
              <strong>{d.nombre}</strong><span className="text-sm">{d.descripcion}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2" role="group" aria-label="Puntos de la partida">
          {[15, 30].map((n) => (
            <button key={n} aria-pressed={meta === n} onClick={() => setMeta(n)}
              className={`${btn} ${meta === n ? "bg-pasto text-white" : "bg-panel-alto"}`}>A {n} puntos</button>
          ))}
        </div>
        <button className={`${btn} bg-pasto text-white`} onClick={nuevaPartida}>Empezar entrenamiento</button>
        <p className="text-sm text-tinta/70">Práctica individual sin conexión a una mesa ni cambios en el ranking.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
    </section>
  );

  const o = opciones(juego, 0);
  const terminada = juego.ganador !== null;
  const miTurno = pendiente(juego) === 0;
  const filaMesa = (j) => (
    <div className="flex justify-center gap-2">
      {[0, 1, 2].map((r) => {
        const c = juego.mesa[j][r];
        return (
          <div key={r} className={`grid h-[5.1rem] w-[3.4rem] place-items-center rounded-xl border border-dashed sm:h-24 sm:w-16 ${juego.bazas[r] === j ? "border-cesped bg-cesped/10" : "border-white/15"}`}>
            {c && <Carta key={`${juego.numMano}-${j}-${r}`} c={c} chica className={j === 0 ? "carta-juega-yo" : "carta-juega-rival"} />}
          </div>
        );
      })}
    </div>
  );
  const marcador = (j) => (
    <div className="flex min-w-0 items-center gap-2 rounded-lg px-1">
      <Avatar perfil={{ apodo: j === 0 ? "Vos" : `Bot ${bot}` }} size={36} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{j === 0 ? "Vos" : `Bot ${bot}`}{juego.mano === j && !terminada ? " · mano" : ""}</span>
        <span className="inline-block font-display text-3xl font-extrabold">{juego.puntos[j]}</span>
        <span className="text-sm text-tinta/60"> / {juego.meta}</span>
      </span>
    </div>
  );

  return (
    <section className="space-y-4">
      {terminada && juego.ganador === 0 && <Confeti />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onVolver} className="min-h-11 px-1 font-semibold text-cesped">← Volver</button>
        <h2 className="font-display text-xl font-extrabold">🃏 Truco a {juego.meta}</h2>
        <div className="flex items-center gap-1">
          <button onClick={alternarSonido} aria-pressed={!silencio} aria-label={silencio ? "Activar sonido" : "Silenciar"} className={`${btn} px-3 ${silencio ? "bg-panel" : "bg-panel-alto"}`}>{silencio ? "🔇" : "🔊"}</button>
          {!silencio && <button onClick={alternarVoz} aria-pressed={voz} aria-label="Voz que canta el truco" title="Voz que canta el truco" className={`${btn} px-3 ${voz ? "bg-pasto text-white" : "bg-panel"}`}>🗣️</button>}
          <span className="rounded-full bg-panel px-3 py-1 text-sm font-semibold">🤖 {bot}</span>
        </div>
      </div>

      {aviso && <p role="status" className="text-center text-sm font-semibold text-cesped">{aviso}</p>}

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-panel p-3">
        {marcador(0)}
        <span className="text-center text-sm font-semibold text-tinta/60">Mano {juego.numMano}<br />{pensando ? "Bot pensando…" : miTurno ? "Tu turno" : "Turno del bot"}</span>
        {marcador(1)}
      </div>

      <div className="relative space-y-3 overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d3b22] to-[#0a2a19] p-3 ring-1 ring-white/10">
        <div className="flex justify-center gap-1" aria-label={`Cartas de Bot ${bot}`}>
          {Array.from({ length: juego.manos[1].length }, (_, i) => <Carta key={`${juego.numMano}-bot-${i}`} oculta chica className="carta-reparte" style={{ animationDelay: `${i * 0.08}s` }} />)}
        </div>

        {filaMesa(1)}

        <div className="grid min-h-14 place-items-center">
          {juego.canto && !terminada && (
            <div className="canto-pop rounded-2xl bg-naranja px-4 py-2 text-center text-white shadow-lg">
              <p className="text-xs font-semibold opacity-80">{juego.canto.de === 1 ? `Bot ${bot} canta` : "Cantaste"}</p>
              <p className="font-display text-2xl font-extrabold uppercase">¡{textoCanto(juego)}!</p>
            </div>
          )}
        </div>

        {filaMesa(0)}

        <div className={`flex min-h-[7rem] justify-center gap-2 rounded-2xl p-1 sm:min-h-[9rem] ${miTurno && !juego.canto ? "tu-turno" : ""}`}>
          {juego.manos[0].map((c, i) => (
            <Carta key={`${juego.numMano}-${c.n}${c.p}`} c={c} onClick={() => jugar("carta", i)}
              deshabilitada={!o.carta || pensando} className="carta-reparte" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>

      {!terminada && <div className="space-y-2" aria-live="polite">
        {!miTurno && <p className="text-center text-sm text-tinta/70">{pensando ? `Bot ${bot} está pensando…` : `Esperando a Bot ${bot}…`}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          {o.quiero && <>
            <button className={`${btn} bg-pasto text-white`} onClick={() => jugar("quiero")}>Quiero</button>
            <button className={`${btn} bg-panel-alto text-brasa`} onClick={() => jugar("no_quiero")}>No quiero</button>
          </>}
          {o.truco && <button className={`${btn} bg-naranja text-white`} onClick={() => jugar("truco")}>{o.quiero ? `Quiero ${o.truco.toLowerCase()}` : o.truco}</button>}
          {o.envido.map((t) => <button key={t} className={`${btn} bg-celeste text-white`} onClick={() => jugar(t)}>{etiquetaEnvido(t)}</button>)}
          {o.mazo && <button className={`${btn} bg-panel-alto`} onClick={() => jugar("mazo")}>Al mazo</button>}
        </div>
      </div>}

      {error && <p role="alert" className="text-center text-sm font-semibold text-brasa">{error}</p>}
      {terminada && <div className="space-y-3 rounded-3xl bg-panel p-5 text-center">
        <p className="text-5xl" aria-hidden="true">{juego.ganador === 0 ? "🏆" : "🃏"}</p>
        <h3 className="text-2xl font-extrabold">{juego.ganador === 0 ? "¡Ganaste la partida!" : `Ganó Bot ${bot}`}</h3>
        <p className="text-tinta/70">{juego.puntos[0]} a {juego.puntos[1]}</p>
        <button className={`${btn} bg-pasto text-white`} onClick={nuevaPartida}>Revancha</button>
      </div>}

      {juego.resumen && <p className="rounded-2xl bg-panel p-3 text-sm">Última mano: {juego.resumen.ganador === 0 ? "ganaste" : `ganó Bot ${bot}`} · {juego.resumen.razon} (+{juego.resumen.puntos})</p>}
      <details className="rounded-2xl bg-panel p-3">
        <summary className="min-h-11 cursor-pointer py-2 font-bold">📜 Historial de jugadas</summary>
        <div className="space-y-1 pt-2">{juego.log.slice(-7).reverse().map((l, i) => (
          <p key={`${i}-${l}`} className="text-sm text-tinta/70">{l.replace(/Jugador 1/g, "Vos").replace(/Jugador 2/g, `Bot ${bot}`)}</p>
        ))}</div>
      </details>
      <button className={`${btn} bg-panel-alto`} onClick={() => setJuego(null)}>Cambiar dificultad / Nueva partida</button>
    </section>
  );
}