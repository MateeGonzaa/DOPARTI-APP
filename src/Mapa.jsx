import { useEffect, useRef } from "react";
import { cargarMaps } from "./lib/maps";

export default function Mapa({ lat, lng, nombre }) {
  const ref = useRef(null);
  useEffect(() => {
    let cancelado = false;
    cargarMaps()
      .then(async () => {
        const { Map } = await window.google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
        if (cancelado || !ref.current) return;
        const mapa = new Map(ref.current, {
          center: { lat, lng }, zoom: 16, mapId: "DEMO_MAP_ID", disableDefaultUI: true, zoomControl: true,
        });
        new AdvancedMarkerElement({ map: mapa, position: { lat, lng }, title: nombre });
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [lat, lng]);
  return <div ref={ref} className="h-48 w-full sm:h-64 overflow-hidden rounded-2xl bg-panel" />;
}
