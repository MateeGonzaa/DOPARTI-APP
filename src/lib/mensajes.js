import { cuando, cupo } from "./logica";
import { DEPORTES_COM, etiqueta } from "./modalidades";

const emoji = (p) => DEPORTES_COM[p.deporte ?? "futbol"]?.emoji ?? "⚽";

const lugar = (p) => [`📍 ${p.sede}${p.sede_direccion ? ` (${p.sede_direccion})` : ""}`];
const unir = (lineas) => lineas.filter((l) => l !== "" && l !== false && l != null).join("\n");

// Link para que alguien que todavía no está en DOPARTI pueda registrarse y anotarse:
// si el partido pertenece a una comunidad, el link de invitación de esa comunidad (se une sola al entrar);
// si no, el link de la app.
export function linkParaSumarse(p, origen = location.origin) {
  const codigo = p.comunidades?.codigo_invitacion;
  return codigo ? { tipo: "comunidad", url: `${origen}/?invitacion=${codigo}` } : { tipo: "app", url: origen };
}

const invitacion = (p) => {
  const l = linkParaSumarse(p);
  return l.tipo === "comunidad"
    ? [`👉 Si no tenés cuenta, registrate gratis y sumate a ${p.comunidades?.nombre ?? "la comunidad"} desde acá:`, l.url]
    : ["👉 Si no tenés cuenta, registrate gratis y anotate desde acá:", l.url];
};

export const convocatoria = (p, anotados) =>
  unir([`${emoji(p)} ${etiqueta(p)}`, `📅 ${cuando(p)}`, ...lugar(p), `Anotados: ${anotados}/${cupo(p)}`, "", ...invitacion(p)]);

export const faltanMsg = (p, anotados) =>
  unir([`🚨 Faltan ${cupo(p) - anotados} jugadores para ${etiqueta(p)}`, `📅 ${cuando(p)}`, ...lugar(p), "¿Te sumás?", "", ...invitacion(p)]);

export function equiposMsg(p, nombre) {
  const lista = (ids) => ids.map((id) => `• ${nombre(id)}`).join("\n");
  return [
    unir([`${emoji(p)} ¡Equipos armados! ${etiqueta(p)}`, `📅 ${cuando(p)}`, ...lugar(p)]),
    `🟠 Pechera naranja\n${lista(p.equipos.A)}`,
    `🔵 Pechera celeste\n${lista(p.equipos.B)}`,
  ].join("\n\n");
}

// Invitación a una mesa de Truco virtual. Si la mesa es de una comunidad se suma el link de esa comunidad.
export function trucoMsg({ partida, comunidad, origen = location.origin }) {
  const linkMesa = `${origen}/?truco=${partida.id}`;
  const jugadores = partida.jugadores_equipo ?? 1;
  return unir([
    `🃏 Te espero en una mesa de Truco ${jugadores} contra ${jugadores}, a ${partida.puntos_meta} puntos.`,
    `Sentate acá: ${linkMesa}`,
    "",
    comunidad?.codigo_invitacion
      ? `¿No tenés cuenta? Registrate y sumate a ${comunidad.nombre}: ${origen}/?invitacion=${comunidad.codigo_invitacion}`
      : `¿No tenés cuenta? Registrate gratis en DOPARTI: ${origen}`,
  ]);
}
