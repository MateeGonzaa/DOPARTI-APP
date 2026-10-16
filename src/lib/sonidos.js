// Sonidos del Truco virtual. Se sintetizan con Web Audio: no hay archivos que descargar.
// El silencio y la voz se recuerdan en el dispositivo.

let ctx = null;
const LS = { silencio: "doparti_truco_silencio", voz: "doparti_truco_voz" };

const leer = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : v === "1"; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch { /* sin permiso */ } };

let silencio = leer(LS.silencio, false);
let voz = leer(LS.voz, false); // la voz arranca apagada: es opcional

export const getSilencio = () => silencio;
export const setSilencio = (v) => { silencio = v; guardar(LS.silencio, v); if (v) window.speechSynthesis?.cancel(); };
export const getVoz = () => voz;
export const setVoz = (v) => { voz = v; guardar(LS.voz, v); if (!v) window.speechSynthesis?.cancel(); };

function audio() {
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

// Los navegadores solo dejan sonar después de un toque: lo "desbloqueamos" con la primera interacción.
if (typeof window !== "undefined") {
  const desbloquear = () => { audio(); window.removeEventListener("pointerdown", desbloquear); };
  window.addEventListener("pointerdown", desbloquear);
}

function tono({ f = 440, hasta, t = 0.15, tipo = "sine", v = 0.18, en = 0 }) {
  const a = audio();
  if (!a) return;
  const ini = a.currentTime + en;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, ini);
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, ini + t);
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(v, ini + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + t);
  o.connect(g).connect(a.destination);
  o.start(ini);
  o.stop(ini + t + 0.03);
}

// Golpe seco tipo carta sobre la mesa
function golpe({ t = 0.09, v = 0.35, f = 1800, en = 0 }) {
  const a = audio();
  if (!a) return;
  const ini = a.currentTime + en;
  const n = Math.floor(a.sampleRate * t);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filtro = a.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.value = f;
  const g = a.createGain();
  g.gain.value = v;
  src.connect(filtro).connect(g).connect(a.destination);
  src.start(ini);
}

const SONIDOS = {
  carta: () => { golpe({}); tono({ f: 140, hasta: 70, t: 0.08, v: 0.2 }); },
  repartir: () => { for (let i = 0; i < 6; i++) golpe({ t: 0.05, v: 0.2, f: 3200, en: i * 0.09 }); },
  turno: () => { tono({ f: 660, t: 0.12, v: 0.12 }); tono({ f: 880, t: 0.16, v: 0.12, en: 0.1 }); },
  canto: () => { tono({ f: 330, hasta: 440, t: 0.14, tipo: "square", v: 0.12 }); tono({ f: 523, t: 0.22, tipo: "square", v: 0.12, en: 0.13 }); },
  quiero: () => { [523, 659, 784].forEach((f, i) => tono({ f, t: 0.14, tipo: "triangle", v: 0.16, en: i * 0.08 })); },
  no_quiero: () => { [440, 349, 261].forEach((f, i) => tono({ f, t: 0.18, tipo: "sawtooth", v: 0.09, en: i * 0.1 })); },
  puntos: () => { tono({ f: 988, t: 0.09, tipo: "square", v: 0.09 }); tono({ f: 1319, t: 0.2, tipo: "square", v: 0.09, en: 0.09 }); },
  mano_ganada: () => { [392, 523, 659].forEach((f, i) => tono({ f, t: 0.16, tipo: "triangle", v: 0.15, en: i * 0.09 })); },
  mano_perdida: () => { [330, 262].forEach((f, i) => tono({ f, t: 0.22, tipo: "triangle", v: 0.13, en: i * 0.13 })); },
  tick: () => tono({ f: 1000, t: 0.05, tipo: "square", v: 0.07 }),
  alarma: () => { tono({ f: 880, t: 0.12, tipo: "square", v: 0.12 }); tono({ f: 660, t: 0.18, tipo: "square", v: 0.12, en: 0.14 }); },
  victoria: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono({ f, t: 0.2, tipo: "triangle", v: 0.18, en: i * 0.12 })); },
  derrota: () => { [392, 349, 311, 262].forEach((f, i) => tono({ f, t: 0.3, tipo: "sawtooth", v: 0.09, en: i * 0.16 })); },
  reaccion: () => tono({ f: 700, hasta: 1100, t: 0.12, v: 0.1 }),
  mensaje: () => tono({ f: 760, t: 0.08, v: 0.08 }),
};

export function sonar(nombre) {
  if (silencio) return;
  try { SONIDOS[nombre]?.(); } catch { /* el audio nunca debe romper el juego */ }
}

// ---------- Voz ----------
// Se usa la voz del dispositivo. Para que suene lo más argentina y lo menos robótica posible:
//  1) se prefiere una voz es-AR; si no hay, una latinoamericana; y la de España queda de último recurso.
//  2) se prefieren las voces "naturales" (neuronales), que son las que suenan como una persona.
//  3) se dicen frases de cancha con variantes, y se varía un poco el ritmo y el tono en cada canto.
let vozElegida = null;
let buscada = false;

const LATAM = ["es-uy", "es-cl", "es-419", "es-us", "es-mx", "es-co", "es-pe", "es-ve", "es-py", "es-bo"];

function puntaje(v) {
  const l = (v.lang || "").replace("_", "-").toLowerCase();
  let p;
  if (l === "es-ar") p = 120;
  else if (l === "es-uy") p = 70;
  else if (LATAM.includes(l)) p = 60;
  else if (l.startsWith("es")) p = 20;
  else return -1;
  if (/natural|neural|online|enhanced|premium/i.test(v.name)) p += 40; // son las menos robóticas
  if (/google/i.test(v.name)) p += 10;
  if (/diego|isabela|tom[aá]s|elena|paola/i.test(v.name)) p += 5; // voces es-AR conocidas
  return p;
}

function elegirVoz() {
  const lista = window.speechSynthesis?.getVoices?.() ?? [];
  if (!lista.length) return null;
  buscada = true;
  vozElegida = lista.map((v) => [puntaje(v), v]).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0])[0]?.[1] ?? null;
  return vozElegida;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Los navegadores cargan las voces de a poco: se vuelve a elegir cuando aparecen
  window.speechSynthesis.addEventListener?.("voiceschanged", () => { buscada = false; elegirVoz(); });
}

// Nombre de la voz que se está usando (para mostrarlo en pantalla)
export const nombreVoz = () => (vozElegida ?? (buscada ? null : elegirVoz()))?.name ?? null;
export const vozEsArgentina = () => /^es[-_]ar$/i.test((vozElegida ?? elegirVoz())?.lang ?? "");

export function hablar(texto, { rapido = 1 } = {}) {
  if (silencio || !voz || !("speechSynthesis" in window)) return;
  try {
    const v = vozElegida ?? elegirVoz();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = v?.lang ?? "es-AR";
    if (v) u.voice = v;
    u.rate = (1.02 + Math.random() * 0.1) * rapido; // un poco de variación para que no suene siempre igual
    u.pitch = 0.95 + Math.random() * 0.12;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch { /* sin voz disponible */ }
}

const elegir = (xs) => xs[Math.floor(Math.random() * xs.length)];

const FRASES = {
  truco: ["¡Truco!", "¡Truco, che!", "¡Truco, loco!", "¡Truco, dale!"],
  retruco: ["¡Quiero retruco!", "¡Retruco!", "¡Y retruco, che!"],
  vale_cuatro: ["¡Quiero vale cuatro!", "¡Vale cuatro!", "¡Vale cuatro, che!"],
  envido: ["¡Envido!", "¡Envido, che!", "¡Envido, dale!"],
  real_envido: ["¡Real envido!", "¡Real envido, che!"],
  falta_envido: ["¡Falta envido!", "¡Falta envido, dale!", "¡Falta envido, che!"],
  quiero: ["¡Quiero!", "¡Quiero, dale!", "¡Quiero, quiero!", "¡Quiero, che!"],
  no_quiero: ["No quiero.", "No, no quiero.", "Eh... no quiero.", "Paso, no quiero."],
  mazo: ["Me voy al mazo.", "¡Al mazo!", "Al mazo, che."],
  victoria: ["¡Ganamos, che!", "¡Qué groso, ganaste!", "¡Vamos, che, ganaste!"],
  derrota: ["Uh, qué lástima. ¡Pedí la revancha!", "Se escapó, che. ¡Revancha!"],
  probar: ["¡Dale, que empiece el truco!", "¡Buenas! ¿Jugamos un truco?"],
};

export function cantar(clave) {
  const f = FRASES[clave];
  if (f) hablar(elegir(f));
}
