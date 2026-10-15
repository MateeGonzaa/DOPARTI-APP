export const DEPORTES_COM = {
  futbol: { nombre: "Fútbol", emoji: "⚽", preset: [5, 7, 11], formato: (t) => `Fútbol ${t}` },
  basket: { nombre: "Básquet", emoji: "🏀", preset: [3, 5], formato: (t) => `Básquet ${t}x${t}` },
  voley: { nombre: "Vóley", emoji: "🏐", preset: [2, 4, 6], formato: (t) => `Vóley ${t}x${t}` },
  padel: { nombre: "Pádel", emoji: "🎾", preset: [1, 2], formato: (t) => (t === 1 ? "Pádel singles" : t === 2 ? "Pádel dobles" : `Pádel ${t}x${t}`) },
};
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
