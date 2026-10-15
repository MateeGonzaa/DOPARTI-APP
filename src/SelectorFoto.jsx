import { useEffect, useRef, useState } from "react";
import { btn, Avatar } from "./ui";

// Avatar con botón de cámara y vista previa de la foto elegida.
export default function SelectorFoto({ perfil, archivo, onElegir, etiqueta = "Foto de perfil", size = 80 }) {
  const ref = useRef(null);
  const [previa, setPrevia] = useState(null);

  useEffect(() => {
    if (!archivo) return setPrevia(null);
    const url = URL.createObjectURL(archivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const abrir = () => ref.current?.click();

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={abrir} aria-label="Elegir foto de perfil" className="relative shrink-0 rounded-full">
        <Avatar perfil={previa ? { ...perfil, avatar_url: previa } : perfil} size={size} />
        <span className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-pasto text-white ring-2 ring-fondo" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">{etiqueta}</p>
        <button type="button" onClick={abrir} className={`${btn} bg-panel py-1 text-sm`}>
          {previa ? "Elegir otra foto" : "Elegir foto"}
        </button>
        {previa && <p className="text-xs text-tinta/60">Se guarda al confirmar el formulario.</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => onElegir(e.target.files[0] ?? null)} />
    </div>
  );
}
