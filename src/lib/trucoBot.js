import { aplicar, fuerza, opciones, puntosEnvido } from './truco';

export const DIFICULTADES = [
  { id: 'noob', nombre: 'Noob', descripcion: 'Principiante · decisiones simples' },
  { id: 'retro', nombre: 'Retro', descripcion: 'Intermedio · conoce las cartas' },
  { id: 'canchero', nombre: 'Canchero', descripcion: 'Difícil · administra sus mejores cartas' },
  { id: 'chad', nombre: 'Chad', descripcion: 'Experto · calcula riesgos y recuerda jugadas' },
];
const azar = (n) => Math.random() < n;
const idCarta = (c) => `${c.n}${c.p}`;
function estimarVictoria(s, cartas, nivel) {
  const usadas = s.mesa.flat().filter(Boolean);
  const propias = s.orig[1];
  const conocidas = new Set([...usadas, ...propias].map(idCarta));
  const universo = ['E','B','O','C'].flatMap(p => [1,2,3,4,5,6,7,10,11,12].map(n => ({n,p}))).filter(c => !conocidas.has(idCarta(c)));
  return cartas.map(c => {
    const rivales = universo.length ? universo : [{n:4,p:'O'}];
    const superior = rivales.filter(x => fuerza(c) > fuerza(x)).length / rivales.length;
    const empate = rivales.filter(x => fuerza(c) === fuerza(x)).length / rivales.length;
    return superior + empate * .5 + (nivel === 3 ? fuerza(c) / 250 : 0);
  });
}
export function decidirBot(s, dificultad = 'retro') {
  const nivel = Math.max(0, DIFICULTADES.findIndex(d => d.id === dificultad));
  const o = opciones(s, 1);
  const cartas = s.manos[1];
  const envido = puntosEnvido(s.orig[1]);
  const fuerzas = cartas.map(fuerza);
  const calidad = s.orig[1].reduce((t,c) => t + Math.max(0, fuerza(c)-7), 0);
  if (o.quiero) {
    if (s.canto.tipo === 'envido') {
      const umbral = [22, 25, 27, 28][nivel];
      const apuesta = s.canto.cantos.includes('falta_envido') ? 5 : s.canto.cantos.includes('real_envido') ? 2 : 0;
      if (nivel >= 2 && envido >= 30 && o.envido.includes('real_envido') && azar(.28)) return {tipo:'real_envido'};
      return {tipo: envido + (nivel === 0 ? Math.random()*12-6 : 0) >= umbral + apuesta ? 'quiero':'no_quiero'};
    }
    const nivelCanto = s.canto.nivel;
    const riesgo = [0, 3, 6, 9][nivelCanto] ?? 9;
    if (nivel >= 2 && o.truco && calidad >= 15 + riesgo && azar(nivel === 3 ? .55 : .25)) return {tipo:'truco'};
    return {tipo: calidad + (nivel === 0 ? Math.random()*15 : 3* nivel) >= 5 + riesgo ? 'quiero':'no_quiero'};
  }
  if (o.envido.length && envido >= [32, 29, 27, 26][nivel] && azar([.15,.35,.65,.8][nivel])) {
    return {tipo: nivel >= 2 && envido >= 31 && azar(.25) ? 'real_envido':'envido'};
  }
  if (o.truco && calidad >= [25, 17, 12, 10][nivel] && azar([.05,.25,.5,.65][nivel])) return {tipo:'truco'};
  if (!o.carta || !cartas.length) return {tipo:'mazo'};
  if (nivel === 0 && azar(.75)) return {tipo:'carta',idx:Math.floor(Math.random()*cartas.length)};
  const rival = s.mesa[0][s.ronda];
  const orden = cartas.map((c,idx) => ({idx, f:fuerza(c)})).sort((a,b)=>a.f-b.f);
  if (rival) {
    const ganadoras = orden.filter(x => x.f > fuerza(rival));
    if (ganadoras.length) return {tipo:'carta',idx: nivel >= 1 ? ganadoras[0].idx : ganadoras.at(-1).idx};
    return {tipo:'carta',idx:orden[0].idx};
  }
  if (nivel === 1) return {tipo:'carta',idx:orden[Math.floor(orden.length/2)].idx};
  const probabilidades = estimarVictoria(s,cartas,nivel);
  const ronda = s.ronda;
  const bazas = s.bazas;
  const necesitaGanar = bazas.includes(0) || (bazas[0] === 'p' && ronda > 0);
  const ranking = cartas.map((c,idx)=>({idx, score: probabilidades[idx]})).sort((a,b)=>a.score-b.score);
  if (necesitaGanar) return {tipo:'carta',idx:ranking.at(-1).idx};
  if (nivel === 3 && ronda === 0 && ranking.length > 1 && ranking.at(-1).score > .8) return {tipo:'carta',idx:ranking.at(-1).idx};
  return {tipo:'carta',idx:ranking[0].score > .55 ? ranking[0].idx : ranking.at(-1).idx};
}
export function ejecutarBot(s, dificultad) {
  const accion = decidirBot(s,dificultad);
  return aplicar(s,{...accion,j:1});
}