export const PAIS_BASE = "Argentina";

const BANDERAS = {
  Argentina: "🇦🇷", Uruguay: "🇺🇾", Chile: "🇨🇱", Paraguay: "🇵🇾", Bolivia: "🇧🇴", Brasil: "🇧🇷", Perú: "🇵🇪",
  Colombia: "🇨🇴", Ecuador: "🇪🇨", Venezuela: "🇻🇪", México: "🇲🇽", España: "🇪🇸", Italia: "🇮🇹",
  "Estados Unidos": "🇺🇸", "Reino Unido": "🇬🇧", Alemania: "🇩🇪", Francia: "🇫🇷", Portugal: "🇵🇹", Canadá: "🇨🇦",
};
export const bandera = (pais) => BANDERAS[pais ?? PAIS_BASE] ?? "🌎";

const porNombre = (a, b) => a.localeCompare(b, "es");
const paisDe = (z) => z.pais ?? PAIS_BASE;

export const nombreZona = (z) =>
  z ? `${z.nombre}, ${z.provincia}${paisDe(z) !== PAIS_BASE ? `, ${paisDe(z)}` : ""}` : "";

// Argentina primero, el resto en orden alfabético
export const paisesDe = (zonas) =>
  [...new Set(zonas.map(paisDe))].sort((a, b) => (a === PAIS_BASE ? -1 : b === PAIS_BASE ? 1 : porNombre(a, b)));
export const provinciasDe = (zonas, pais) =>
  [...new Set(zonas.filter((z) => paisDe(z) === pais).map((z) => z.provincia))].sort(porNombre);
export const ciudadesDe = (zonas, pais, provincia) =>
  zonas.filter((z) => paisDe(z) === pais && z.provincia === provincia).sort((a, b) => porNombre(a.nombre, b.nombre));

// Distancia en línea recta entre dos puntos (fórmula de haversine)
export function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
export const formatoKm = (km) =>
  km < 1 ? "a menos de 1 km" : km < 10 ? `a ${km.toFixed(1).replace(".", ",")} km` : `a ${Math.round(km).toLocaleString("es-AR")} km`;
