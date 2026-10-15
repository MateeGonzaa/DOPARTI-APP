
export const CENTRO = { lat: -33.1307, lng: -64.3499 };

let promesa;
export function cargarMaps() {
  if (!promesa) {
    promesa = new Promise((ok, fallo) => {
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
      if (!key) return fallo(new Error("Falta VITE_GOOGLE_MAPS_KEY"));
      window.__mapsListo = () => ok(window.google.maps);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&v=weekly&callback=__mapsListo`;
      s.onerror = () => fallo(new Error("No se pudo cargar Google Maps"));
      document.head.append(s);
    });
  }
  return promesa;
}
