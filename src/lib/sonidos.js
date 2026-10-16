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

export function hablar(texto) {
  if (silencio || !voz || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-AR";
    u.rate = 1.1;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  } catch { /* sin voz disponible */ }
}
