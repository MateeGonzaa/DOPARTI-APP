import { cuando, cupo } from "./logica";

const mapa = (p) => (p.sede_lat != null ? `https://www.google.com/maps/search/?api=1&query=${p.sede_lat},${p.sede_lng}` : "");
const lugar = (p) => [`📍 ${p.sede}${p.sede_direccion ? ` (${p.sede_direccion})` : ""}`, mapa(p) && `🗺️ ${mapa(p)}`];
const unir = (lineas) => lineas.filter((l) => l !== "" && l !== false && l != null).join("\n");

export const convocatoria = (p, anotados) =>
  unir([`⚽ Partido de fútbol ${p.tipo}`, `📅 ${cuando(p)}`, ...lugar(p), `Anotados: ${anotados}/${cupo(p)}`]);

export const faltanMsg = (p, anotados) =>
  unir([`🚨 Faltan ${cupo(p) - anotados} jugadores para el fútbol ${p.tipo}`, `📅 ${cuando(p)}`, ...lugar(p), "¿Te sumás? Anotate en DOPARTI."]);

export function equiposMsg(p, nombre) {
  const lista = (ids) => ids.map((id) => `• ${nombre(id)}`).join("\n");
  return [
    unir([`⚽ ¡Equipos armados! Fútbol ${p.tipo}`, `📅 ${cuando(p)}`, ...lugar(p)]),
    `🟠 Pechera naranja\n${lista(p.equipos.A)}`,
    `🔵 Pechera celeste\n${lista(p.equipos.B)}`,
  ].join("\n\n");
}
