import { useEffect, useRef, useState } from "react";
import { cargarMaps, CENTRO } from "./lib/maps";
import { input } from "./ui";


export default function SelectorLugar({ onElegir, centro = CENTRO }) {
  const caja = useRef(null);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let el;
    cargarMaps()
      .then(async () => {
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");
        if (cancelado) return;
        el = new PlaceAutocompleteElement({
          includedRegionCodes: ["ar"],
          locationBias: { center: centro, radius: 30000 },
        });
        el.addEventListener("gmp-select", async ({ placePrediction }) => {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
          onElegir({
            nombre: place.displayName,
            direccion: place.formattedAddress ?? "",
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
        });
        caja.current?.append(el);
      })
      .catch(() => setManual(true));
    return () => { cancelado = true; el?.remove(); };
  }, []);

  if (manual) {
    return (
      <input className={input} placeholder="Nombre de la cancha (el buscador de Maps no está disponible)"
        onChange={(e) => onElegir({ nombre: e.target.value, direccion: "", lat: null, lng: null })} />
    );
  }
  return <div ref={caja} />;
}
