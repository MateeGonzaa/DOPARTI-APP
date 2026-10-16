// Motor de Truco argentino 1 contra 1 (sin flor). Funciones puras sobre un estado JSON.
// Jugador 0 = quien creó la partida, jugador 1 = rival.
// El estado completo se guarda en truco_partidas.juego; la UI nunca muestra las cartas del otro.

export const PALOS = { E: "Espada", B: "Basto", O: "Oro", C: "Copa" };
const NUMS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// Jerarquía del truco: mayor número = carta más fuerte
export function fuerza({ n, p }) {
  if (n === 1 && p === "E") return 14;
  if (n === 1 && p === "B") return 13;
  if (n === 7 && p === "E") return 12;
  if (n === 7 && p === "O") return 11;
  if (n === 3) return 10;
  if (n === 2) return 9;
  if (n === 1) return 8;           // ancho falso (oro y copa)
  if (n === 12) return 7;
  if (n === 11) return 6;
  if (n === 10) return 5;
  if (n === 7) return 4;           // sietes falsos (copa y basto)
  return n - 3 + 0;                // 6 → 3, 5 → 2, 4 → 1
}

export const nombreCarta = (c) => `${c.n} de ${PALOS[c.p]}`;
const valorEnvido = (c) => (c.n >= 10 ? 0 : c.n);

export function puntosEnvido(cartas) {
  let mejor = 0;
  for (let i = 0; i < cartas.length; i++) {
    mejor = Math.max(mejor, valorEnvido(cartas[i]));
    for (let j = i + 1; j < cartas.length; j++) {
      if (cartas[i].p === cartas[j].p) mejor = Math.max(mejor, 20 + valorEnvido(cartas[i]) + valorEnvido(cartas[j]));
    }
  }
  return mejor;
}

const mazo = () => PALOS_LISTA.flatMap((p) => NUMS.map((n) => ({ n, p })));
const PALOS_LISTA = ["E", "B", "O", "C"];

function mezclar(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

const otro = (j) => 1 - j;
const nuevaMano = (s, mano) => {
  const m = mezclar(mazo());
  const orig = [m.slice(0, 3), m.slice(3, 6)];
  return {
    ...s,
    mano,
    manos: [[...orig[0]], [...orig[1]]],
    orig,
    mesa: [[null, null, null], [null, null, null]],
    ronda: 0,
    bazas: [],
    turno: mano,
    truco: { nivel: 0, duenio: null },
    canto: null,
    trucoEspera: null,
    envidoJugado: false,
  };
};

export function crearJuego(meta = 15) {
  const s = { meta, puntos: [0, 0], numMano: 1, log: [], resumen: null, ganador: null, tiempos: [0, 0] };
  return nuevaMano(s, 0);
}

const agregarLog = (s, t) => ({ ...s, log: [...s.log, t].slice(-30) });

// ---------- Reglas de puntos ----------
const valorTruco = (nivel) => nivel + 1;                 // truco querido vale 2, retruco 3, vale cuatro 4 (sin cantar: 1)
const NOMBRE_TRUCO = ["", "Truco", "Retruco", "Vale cuatro"];
const NOMBRE_ENVIDO = { envido: "Envido", real_envido: "Real envido", falta_envido: "Falta envido" };

function siguientesEnvido(cantos) {
  const ultimo = cantos[cantos.length - 1];
  if (ultimo === "falta_envido") return [];
  if (ultimo === "real_envido") return ["falta_envido"];
  const cuantosEnvido = cantos.filter((c) => c === "envido").length;
  return [...(cuantosEnvido < 2 ? ["envido"] : []), "real_envido", "falta_envido"];
}

function puntosCantos(s, cantos) {
  const faltan = s.meta - Math.max(...s.puntos);
  let total = 0;
  for (const c of cantos) {
    if (c === "falta_envido") return faltan;
    total += c === "envido" ? 2 : 3;
  }
  return total;
}

function sumar(s, jugador, puntos) {
  const p = [...s.puntos];
  p[jugador] = Math.min(s.meta, p[jugador] + puntos);
  const termino = p[jugador] >= s.meta;
  return { ...s, puntos: p, ganador: termino ? jugador : null };
}

function terminarMano(s, ganador, puntos, razon) {
  let n = sumar(s, ganador, puntos);
  n = agregarLog(n, `Mano ${s.numMano}: ${razon} (+${puntos})`);
  n.resumen = { num: s.numMano, ganador, puntos, razon, mesa: s.mesa, orig: s.orig };
  if (n.ganador !== null) return n;
  return { ...nuevaMano({ ...n, numMano: s.numMano + 1 }, otro(s.mano)) };
}

function resolverEnvido(s, quiso) {
  const c = s.canto;
  const quien = c.de;                         // el último que cantó
  let n = s;
  if (!quiso) {
    const previos = c.cantos.slice(0, -1);
    const pts = previos.length ? puntosCantos(s, previos) : 1;
    n = sumar(n, quien, pts);
    n = agregarLog(n, `${NOMBRE_ENVIDO[c.cantos.at(-1)]}: no quiso (+${pts})`);
  } else {
    const pts = puntosCantos(s, c.cantos);
    const e = [puntosEnvido(s.orig[0]), puntosEnvido(s.orig[1])];
    const gana = e[0] === e[1] ? s.mano : e[0] > e[1] ? 0 : 1;
    n = sumar(n, gana, pts);
    n = agregarLog(n, `Envido: ${e[0]} contra ${e[1]} (+${pts} al jugador ${gana + 1})`);
    n.envidoInfo = { e, gana, pts };
  }
  n = { ...n, envidoJugado: true, canto: n.trucoEspera, trucoEspera: null };
  return n;
}

function resolverBaza(s) {
  const r = s.ronda;
  const f0 = fuerza(s.mesa[0][r]);
  const f1 = fuerza(s.mesa[1][r]);
  const ganaBaza = f0 === f1 ? "p" : f0 > f1 ? 0 : 1;
  const bazas = [...s.bazas, ganaBaza];
  let n = { ...s, bazas };

  const gano = (j) => bazas.filter((b) => b === j).length;
  let ganadorMano = null;
  if (gano(0) === 2) ganadorMano = 0;
  else if (gano(1) === 2) ganadorMano = 1;
  else if (bazas.length === 2) {
    const [b1, b2] = bazas;
    if (b1 === "p" && b2 !== "p") ganadorMano = b2;       // parda en la primera: decide la segunda
    else if (b1 !== "p" && b2 === "p") ganadorMano = b1;  // parda en la segunda: decide la primera
  } else if (bazas.length === 3) {
    const [b1, b2, b3] = bazas;
    if (b3 !== "p") ganadorMano = b3;
    else ganadorMano = b1 !== "p" ? b1 : b2 !== "p" ? b2 : s.mano;
  }

  if (ganadorMano !== null) {
    return terminarMano(n, ganadorMano, valorTruco(s.truco.nivel), "ganó la mano");
  }
  return { ...n, ronda: r + 1, turno: ganaBaza === "p" ? s.mano : ganaBaza };
}

// ---------- Acciones ----------
// accion: { tipo, j, idx? }. Devuelve { ok: true, estado } o { ok: false, error }.
export function aplicar(s, a) {
  const j = a.j;
  if (s.ganador !== null) return { ok: false, error: "La partida ya terminó." };
  const fallo = (error) => ({ ok: false, error });

  // --- Hay un canto esperando respuesta ---
  if (s.canto) {
    const resp = otro(s.canto.de);
    if (j !== resp) return fallo("Esperá la respuesta del rival.");
    const c = s.canto;

    if (a.tipo === "quiero" || a.tipo === "no_quiero") {
      const quiso = a.tipo === "quiero";
      if (c.tipo === "envido") return { ok: true, estado: resolverEnvido(s, quiso) };
      // truco
      if (quiso) {
        let n = { ...s, truco: { nivel: c.nivel, duenio: resp }, canto: null };
        n = agregarLog(n, `${NOMBRE_TRUCO[c.nivel]}: quiero`);
        return { ok: true, estado: n };
      }
      return { ok: true, estado: terminarMano(agregarLog(s, `${NOMBRE_TRUCO[c.nivel]}: no quiero`), c.de, c.nivel, `no quiso el ${NOMBRE_TRUCO[c.nivel].toLowerCase()}`) };
    }

    if (a.tipo === "truco" && c.tipo === "truco") {       // "quiero retruco" / "quiero vale cuatro"
      if (c.nivel >= 3) return fallo("No se puede subir más.");
      let n = { ...s, truco: { nivel: c.nivel, duenio: resp }, canto: { tipo: "truco", de: resp, nivel: c.nivel + 1 } };
      n = agregarLog(n, `${NOMBRE_TRUCO[c.nivel + 1]}!`);
      return { ok: true, estado: n };
    }

    if (["envido", "real_envido", "falta_envido"].includes(a.tipo)) {
      if (c.tipo === "envido") {
        if (!siguientesEnvido(c.cantos).includes(a.tipo)) return fallo("Ese canto no se puede ahora.");
        const n = agregarLog({ ...s, canto: { tipo: "envido", de: resp, cantos: [...c.cantos, a.tipo] } }, `${NOMBRE_ENVIDO[a.tipo]}!`);
        return { ok: true, estado: n };
      }
      // el envido "está primero": se puede cantar en respuesta a un truco si todavía no se jugó
      if (c.nivel === 1 && s.ronda === 0 && !s.envidoJugado && s.mesa[j][0] === null) {
        const n = agregarLog({ ...s, trucoEspera: c, canto: { tipo: "envido", de: resp, cantos: [a.tipo] } }, `${NOMBRE_ENVIDO[a.tipo]}! (el envido está primero)`);
        return { ok: true, estado: n };
      }
      return fallo("Ya no se puede cantar envido.");
    }
    return fallo("Tenés que responder el canto.");
  }

  // --- Sin cantos pendientes: solo mueve quien tiene el turno ---
  if (j !== s.turno) return fallo("No es tu turno.");

  if (a.tipo === "carta") {
    const carta = s.manos[j][a.idx];
    if (!carta) return fallo("Esa carta no existe.");
    const mesa = s.mesa.map((m) => [...m]);
    mesa[j][s.ronda] = carta;
    const manos = s.manos.map((m, i) => (i === j ? m.filter((_, k) => k !== a.idx) : m));
    let n = { ...s, mesa, manos };
    n = agregarLog(n, `Jugador ${j + 1}: ${nombreCarta(carta)}`);
    if (mesa[otro(j)][s.ronda]) return { ok: true, estado: resolverBaza(n) };
    return { ok: true, estado: { ...n, turno: otro(j) } };
  }

  if (a.tipo === "truco") {
    const t = s.truco;
    if (t.nivel >= 3) return fallo("Ya está en vale cuatro.");
    if (t.duenio !== null && t.duenio !== j) return fallo("Le toca subir al otro jugador.");
    const nivel = t.nivel + 1;
    return { ok: true, estado: agregarLog({ ...s, canto: { tipo: "truco", de: j, nivel } }, `${NOMBRE_TRUCO[nivel]}!`) };
  }

  if (["envido", "real_envido", "falta_envido"].includes(a.tipo)) {
    if (!puedeEnvido(s, j)) return fallo("Ya no se puede cantar envido.");
    return { ok: true, estado: agregarLog({ ...s, canto: { tipo: "envido", de: j, cantos: [a.tipo] } }, `${NOMBRE_ENVIDO[a.tipo]}!`) };
  }

  if (a.tipo === "mazo") {
    const pts = valorTruco(s.truco.nivel);
    return { ok: true, estado: terminarMano(agregarLog(s, `Jugador ${j + 1} se fue al mazo`), otro(j), pts, "se fue al mazo") };
  }
  return fallo("Acción desconocida.");
}

export const puedeEnvido = (s, j) =>
  !s.canto && s.turno === j && s.ronda === 0 && !s.envidoJugado && s.truco.nivel === 0 && s.mesa[j][0] === null;

// Qué puede hacer el jugador j ahora mismo (para habilitar botones)
export function opciones(s, j) {
  const o = { carta: false, truco: null, envido: [], quiero: false, mazo: false };
  if (s.ganador !== null) return o;
  if (s.canto) {
    if (j !== otro(s.canto.de)) return o;
    o.quiero = true;
    if (s.canto.tipo === "truco") {
      if (s.canto.nivel < 3) o.truco = NOMBRE_TRUCO[s.canto.nivel + 1];
      if (s.canto.nivel === 1 && s.ronda === 0 && !s.envidoJugado && s.mesa[j][0] === null) o.envido = ["envido", "real_envido", "falta_envido"];
    } else {
      o.envido = siguientesEnvido(s.canto.cantos);
    }
    return o;
  }
  if (j !== s.turno) return o;
  o.carta = true;
  o.mazo = true;
  if (s.truco.nivel < 3 && (s.truco.duenio === null || s.truco.duenio === j)) o.truco = NOMBRE_TRUCO[s.truco.nivel + 1];
  if (puedeEnvido(s, j)) o.envido = ["envido", "real_envido", "falta_envido"];
  return o;
}

export const etiquetaEnvido = (t) => NOMBRE_ENVIDO[t];
export const textoCanto = (s) => {
  if (!s?.canto) return null;
  return s.canto.tipo === "truco"
    ? NOMBRE_TRUCO[s.canto.nivel]
    : s.canto.cantos.map((c) => NOMBRE_ENVIDO[c]).join(" + ");
};

// ---------- Reloj de turno (tiempo de tolerancia) ----------
// Quien tiene que mover ahora: responder el canto pendiente o jugar su turno.
export const pendiente = (s) => (s.canto ? otro(s.canto.de) : s.turno);

// Se usa en lugar de `aplicar` cuando juega una persona: además, le borra el "castigo" por demora.
export function aplicarConReloj(s, a) {
  const r = aplicar(s, a);
  if (!r.ok) return r;
  const tiempos = [...(s.tiempos ?? [0, 0])];
  tiempos[a.j] = 0;
  return { ok: true, estado: { ...r.estado, tiempos } };
}

// Se usa cuando se agota el tiempo de quien tenía que mover.
// 1ª demora seguida: pierde la mano (se va al mazo o no quiere el canto).
// 2ª demora seguida: pierde la partida por abandono.
export const DEMORAS_PARA_ABANDONO = 2;
export function accionPorTiempo(s) {
  if (s.ganador !== null) return { ok: false, error: "La partida ya terminó." };
  const j = pendiente(s);
  const tiempos = [...(s.tiempos ?? [0, 0])];
  tiempos[j] += 1;
  if (tiempos[j] >= DEMORAS_PARA_ABANDONO) {
    const puntos = [...s.puntos];
    puntos[otro(j)] = s.meta;
    return {
      ok: true, j, abandono: true,
      estado: agregarLog({ ...s, tiempos, puntos, ganador: otro(j) }, `Jugador ${j + 1} abandonó por falta de tiempo`),
    };
  }
  const r = aplicar(s, { tipo: s.canto ? "no_quiero" : "mazo", j });
  if (!r.ok) return r;
  return { ok: true, j, abandono: false, estado: agregarLog({ ...r.estado, tiempos }, `Jugador ${j + 1} se quedó sin tiempo`) };
}
