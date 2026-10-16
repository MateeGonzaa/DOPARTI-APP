// Deportes, eSports y juegos que se pueden organizar en una comunidad.
// "tipo" = jugadores por equipo (1 = uno contra uno).
// "grupo" decide en qué filtro aparece: "deportes" o "esports" (eSports y más: videojuegos y juegos de mesa).
export const DEPORTES_COM = {
  // ---- Deportes ----
  futbol: { nombre: "Fútbol", emoji: "⚽", grupo: "deportes", preset: [5, 7, 11], formato: (t) => `Fútbol ${t}` },
  basket: { nombre: "Básquet", emoji: "🏀", grupo: "deportes", preset: [3, 5], formato: (t) => `Básquet ${t}x${t}` },
  voley: { nombre: "Vóley", emoji: "🏐", grupo: "deportes", preset: [2, 4, 6], formato: (t) => `Vóley ${t}x${t}` },
  padel: { nombre: "Pádel", emoji: "🎾", grupo: "deportes", preset: [1, 2], formato: (t) => (t === 1 ? "Pádel singles" : t === 2 ? "Pádel dobles" : `Pádel ${t}x${t}`) },
  tenis: { nombre: "Tenis", emoji: "🥎", grupo: "deportes", preset: [1, 2], formato: (t) => (t === 1 ? "Tenis singles" : t === 2 ? "Tenis dobles" : `Tenis ${t}x${t}`) },
  rugby: { nombre: "Rugby", emoji: "🏉", grupo: "deportes", preset: [7, 15], formato: (t) => `Rugby ${t}` },
  hockey: { nombre: "Hockey", emoji: "🏑", grupo: "deportes", preset: [5, 11], formato: (t) => `Hockey ${t}x${t}` },
  handball: { nombre: "Handball", emoji: "🤾", grupo: "deportes", preset: [5, 7], formato: (t) => `Handball ${t}x${t}` },

  // ---- eSports y más ----
  ea_fc: { nombre: "EA Sports FC (FIFA)", emoji: "🎮", grupo: "esports", esport: true, preset: [1, 2], formato: (t) => `EA FC ${t}v${t}` },
  efootball: { nombre: "eFootball (PES)", emoji: "🕹️", grupo: "esports", esport: true, preset: [1, 2], formato: (t) => `eFootball ${t}v${t}` },
  cs: { nombre: "Counter-Strike", emoji: "💣", grupo: "esports", esport: true, preset: [2, 5], formato: (t) => `CS ${t}v${t}` },
  lol: { nombre: "League of Legends", emoji: "🛡️", grupo: "esports", esport: true, preset: [1, 2, 5], formato: (t) => `LoL ${t}v${t}` },
  valorant: { nombre: "Valorant", emoji: "🎯", grupo: "esports", esport: true, preset: [1, 2, 5], formato: (t) => `Valorant ${t}v${t}` },
  fortnite: { nombre: "Fortnite", emoji: "🪂", grupo: "esports", esport: true, preset: [1, 2, 4], formato: (t) => (t === 1 ? "Fortnite solo" : t === 2 ? "Fortnite dúo" : t === 4 ? "Fortnite escuadra" : `Fortnite ${t}v${t}`) },
  rocket_league: { nombre: "Rocket League", emoji: "🚀", grupo: "esports", esport: true, preset: [1, 2, 3], formato: (t) => `Rocket League ${t}v${t}` },
  free_fire: { nombre: "Free Fire", emoji: "🔥", grupo: "esports", esport: true, preset: [1, 2, 4], formato: (t) => (t === 1 ? "Free Fire solo" : t === 2 ? "Free Fire dúo" : t === 4 ? "Free Fire escuadra" : `Free Fire ${t}v${t}`) },
  cod: { nombre: "Call of Duty", emoji: "🔫", grupo: "esports", esport: true, preset: [1, 2, 4], formato: (t) => `Call of Duty ${t}v${t}` },
  // Juegos de mesa y de bar (no son videojuegos, pero viven en el mismo filtro)
  truco: { nombre: "Truco presencial", emoji: "🃏", grupo: "esports", preset: [1, 2, 3], formato: (t) => (t === 1 ? "Truco 1 contra 1" : t === 2 ? "Truco en parejas" : `Truco ${t}x${t}`) },
  ajedrez: { nombre: "Ajedrez", emoji: "♟️", grupo: "esports", preset: [1], formato: () => "Ajedrez 1 contra 1" },
  pool: { nombre: "Pool / Billar", emoji: "🎱", grupo: "esports", preset: [1, 2], formato: (t) => (t === 1 ? "Pool 1 contra 1" : `Pool ${t}v${t}`) },
};

export const GRUPOS = [
  { id: "deportes", nombre: "Deportes", icono: "🏟️" },
  { id: "esports", nombre: "eSports y más", icono: "🎮" },
].map((g) => ({ ...g, lista: Object.keys(DEPORTES_COM).filter((d) => DEPORTES_COM[d].grupo === g.id) }));

export const ESPORTS = Object.keys(DEPORTES_COM).filter((d) => DEPORTES_COM[d].esport);
export const ORDEN = Object.keys(DEPORTES_COM);


export function configDe(c) {
  const activos = (c?.deportes ?? []).filter((d) => DEPORTES_COM[d]);
  const deportes = activos.length ? ORDEN.filter((d) => activos.includes(d)) : ["futbol"];
  const modalidades = Object.fromEntries(deportes.map((d) => {
    const m = c?.modalidades?.[d];
    return [d, Array.isArray(m) && m.length ? [...m].sort((a, b) => a - b) : DEPORTES_COM[d].preset];
  }));
  return { deportes, modalidades };
}

export const deporteDe = (p) => DEPORTES_COM[p?.deporte] ?? DEPORTES_COM.futbol;
export const etiqueta = (p) => deporteDe(p).formato(p.tipo);
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
