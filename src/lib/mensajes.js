import { cuando, cupo } from "./logica";
import { DEPORTES_COM, etiqueta } from "./modalidades";

const emoji = (p) => DEPORTES_COM[p.deporte ?? "futbol"]?.emoji ?? "⚽";

const lugar = (p) => [`📍 ${p.sede}${p.sede_direccion ? ` (${p.sede_direccion})` : ""}`];
const unir = (lineas) => lineas.filter((l) => l !== "" && l !== false && l != null).join("\n");

export const convocatoria = (p, anotados) =>
  unir([`${emoji(p)} ${etiqueta(p)}`, `📅 ${cuando(p)}`, ...lugar(p), `Anotados: ${anotados}/${cupo(p)}`]);

export const faltanMsg = (p, anotados) =>
  unir([`🚨 Faltan ${cupo(p) - anotados} jugadores para ${etiqueta(p)}`, `📅 ${cuando(p)}`, ...lugar(p), "¿Te sumás? Anotate en DOPARTI."]);

export function equiposMsg(p, nombre) {
  const lista = (ids) => ids.map((id) => `• ${nombre(id)}`).join("\n");
  return [
    unir([`${emoji(p)} ¡Equipos armados! ${etiqueta(p)}`, `📅 ${cuando(p)}`, ...lugar(p)]),
    `🟠 Pechera naranja\n${lista(p.equipos.A)}`,
    `🔵 Pechera celeste\n${lista(p.equipos.B)}`,
  ].join("\n\n");
}
