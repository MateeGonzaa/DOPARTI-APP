export const DEPORTES = {
  futbol: {
    nombre: "Fútbol", emoji: "⚽", formatos: [5, 7, 11], defecto: 7,
    equipos: ["Pechera naranja", "Pechera celeste"],
    posiciones: ["Arquero", "Defensor", "Mediocampista", "Delantero"],
  },
  padel: {
    nombre: "Pádel", emoji: "🎾", formatos: [2], defecto: 2,
    equipos: ["Pareja naranja", "Pareja celeste"],
    posiciones: ["Drive", "Revés"],
  },
  basquet: {
    nombre: "Básquet", emoji: "🏀", formatos: [3, 5], defecto: 5,
    equipos: ["Equipo naranja", "Equipo celeste"],
    posiciones: ["Base", "Escolta", "Alero", "Ala-pívot", "Pívot"],
  },
  voley: {
    nombre: "Vóley", emoji: "🏐", formatos: [4, 6], defecto: 6,
    equipos: ["Equipo naranja", "Equipo celeste"],
    posiciones: ["Armador", "Punta", "Central", "Opuesto", "Líbero"],
  },
  ea_fc: {
    nombre: "EA Sports FC", emoji: "🎮", formatos: [1, 2], defecto: 1, usaMano: false,
    equipos: ["Equipo naranja", "Equipo celeste"],
    posiciones: ["Delantero", "Mediocampista", "Defensor", "Arquero"],
  },
  efootball: {
    nombre: "eFootball (PES)", emoji: "🕹️", formatos: [1, 2], defecto: 1, usaMano: false,
    equipos: ["Equipo naranja", "Equipo celeste"],
    posiciones: ["Delantero", "Mediocampista", "Defensor", "Arquero"],
  },
  cs: {
    nombre: "Counter-Strike", emoji: "💣", formatos: [2, 5], defecto: 5, usaMano: false,
    equipos: ["Equipo naranja", "Equipo celeste"],
    posiciones: ["Entry", "AWPer", "Support", "Lurker", "IGL"],
  },
  lol: {
    nombre: "League of Legends", emoji: "🛡️", formatos: [1, 2, 5], defecto: 5, usaMano: false,
    equipos: ["Equipo naranja", "Equipo celeste"],
    posiciones: ["Top", "Jungla", "Mid", "ADC", "Support"],
  },
  truco: {
    nombre: "Truco", emoji: "🃏", formatos: [1, 2, 3], defecto: 2, usaMano: false,
    equipos: ["Pareja naranja", "Pareja celeste"],
    posiciones: ["Mano", "Pie"],
  },
};
export const LISTA = Object.keys(DEPORTES);

export const deporteDe = (p) => DEPORTES[p?.deporte] ?? DEPORTES.futbol;
export const emojiDe = (p) => deporteDe(p).emoji;
export const equiposDe = (p) => deporteDe(p).equipos;

export function formatoNombre(deporte, t) {
  if (deporte === "padel") return "Pádel dobles";
  if (deporte === "basquet" || deporte === "voley") return `${DEPORTES[deporte].nombre} ${t}x${t}`;
  if (deporte !== "futbol" && DEPORTES[deporte]) return `${DEPORTES[deporte].nombre} ${t}v${t}`;
  return `Fútbol ${t}`;
}
export const titulo = (p) => formatoNombre(p?.deporte ?? "futbol", p.tipo);

export const GENEROS = [["hombre", "Hombre"], ["mujer", "Mujer"], ["no_binario", "No binario"], ["prefiero_no_decir", "Prefiero no decir"]];
export const PIES = [["diestro", "Diestro"], ["zurdo", "Zurdo"], ["ambidiestro", "Ambidiestro"], ["ninguno", "Ninguno, pata de palo 🪵"]];
export const MANOS = [["diestro", "Diestra"], ["zurdo", "Zurda"], ["ambidiestro", "Ambidiestra"], ["ninguno", "Ninguna, manos de manteca 🧈"]];
export const etiqueta = (lista, v) => lista.find(([k]) => k === v)?.[1];


export const estadoJugador = (perfil) => ({
  edad: perfil?.edad ?? "",
  genero: perfil?.genero ?? "prefiero_no_decir",
  deportes: perfil?.deportes?.length ? perfil.deportes : ["futbol"],
  pie: perfil?.pie ?? "diestro",
  mano: perfil?.mano ?? "diestro",
  posiciones: perfil?.posiciones ?? (perfil?.posicion ? { futbol: perfil.posicion } : {}),
});


export const camposParaGuardar = (f) => ({
  edad: f.edad === "" ? null : Number(f.edad),
  genero: f.genero,
  deportes: f.deportes,
  pie: f.deportes.includes("futbol") ? f.pie : null,
  mano: f.deportes.some((d) => d !== "futbol" && DEPORTES[d]?.usaMano !== false) ? f.mano : null,
  posiciones: Object.fromEntries(Object.entries(f.posiciones).filter(([d, v]) => v && f.deportes.includes(d))),
});
