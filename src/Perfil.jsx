import { useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input } from "./ui";
import SelectorFoto from "./SelectorFoto";
import { redimensionar } from "./lib/imagen";
import CamposJugador from "./CamposJugador";
import { REDES, normalizarRed } from "./lib/redes";
import { GENEROS, MANOS } from "./lib/deportes";

export default function Perfil({ perfil, onCerrar, onGuardado }) {
  const [f, setF] = useState({
    nombre: perfil?.nombre_completo ?? "",
    apodo: perfil?.apodo ?? "",
    edad: perfil?.edad ?? "",
    pie: perfil?.pie ?? "diestro",
    genero: perfil?.genero ?? GENEROS[0][0],
    deportes: perfil?.deportes?.length ? perfil.deportes : ["futbol"],
    mano: perfil?.mano ?? MANOS[0][0],
    posiciones: perfil?.posiciones ?? (perfil?.posicion ? { futbol: perfil.posicion } : {}),
    password: "",
    descripcion: perfil?.descripcion ?? "",
    mostrar_amigos: perfil?.mostrar_amigos ?? true,
    instagram: perfil?.redes?.instagram ?? "",
    whatsapp: perfil?.redes?.whatsapp ?? "",
    tiktok: perfil?.redes?.tiktok ?? "",
    twitter: perfil?.redes?.twitter ?? "",
  });
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const redes = {};
    for (const [k, r] of Object.entries(REDES)) {
      const n = normalizarRed(k, f[k]);
      if (!n.ok) return setError(`Revisá tu ${r.nombre}: ${k === "whatsapp" ? "poné el número con código de país, solo números" : "usuario o link inválido"}.`);
      if (n.valor) redes[k] = n.valor;
    }
    setGuardando(true);
    const cambios = {
      nombre_completo: f.nombre.trim(),
      apodo: f.apodo.trim(),
      edad: f.edad === "" ? null : Number(f.edad),
      pie: f.pie,
      genero: f.genero,
      deportes: f.deportes,
      mano: f.mano,
      posiciones: f.posiciones,
      posicion: f.posiciones.futbol ?? null,
      descripcion: f.descripcion.trim() || null,
      mostrar_amigos: f.mostrar_amigos,
      redes,
    };
    if (foto) {
      const ruta = `${perfil.id}/avatar`;
      const blob = await redimensionar(foto);
      const up = await supabase.storage.from("avatars").upload(ruta, blob, { upsert: true, contentType: blob.type });
      if (up.error) { setError("No se pudo subir la foto."); return setGuardando(false); }
      cambios.avatar_url = supabase.storage.from("avatars").getPublicUrl(ruta).data.publicUrl + `?v=${Date.now()}`;
    }
    const { error: e1 } = await supabase.from("profiles").update(cambios).eq("id", perfil.id);
    if (e1) { setError(e1.message); return setGuardando(false); }
    if (f.password) {
      const { error: e2 } = await supabase.auth.updateUser({ password: f.password });
      if (e2) { setError(e2.message); return setGuardando(false); }
    }
    setGuardando(false);
    onGuardado();
  }

  return (
    <form onSubmit={guardar} className="space-y-4">
      <button type="button" onClick={onCerrar} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Cancelar</button>
      <h2 className="text-3xl font-extrabold">Editar perfil</h2>
      <SelectorFoto perfil={{ ...perfil, apodo: f.apodo }} archivo={foto} onElegir={setFoto} />
      <label className="block text-sm font-semibold">Nombre completo
        <input className={input} required value={f.nombre} onChange={set("nombre")} />
      </label>
      <label className="block text-sm font-semibold">Apodo
        <input className={input} required value={f.apodo} onChange={set("apodo")} />
      </label>
      <CamposJugador f={f} setF={setF} />
      <label className="block text-sm font-semibold">Descripción
        <textarea className={`${input} min-h-24`} maxLength={300} placeholder="Contá algo sobre vos: cómo jugás, tu equipo, cuándo te prendés..."
          value={f.descripcion} onChange={set("descripcion")} />
        <span className="mt-1 block text-right text-sm font-normal text-tinta/70">{f.descripcion.length}/300</span>
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Redes</legend>
        {Object.entries(REDES).map(([k, r]) => (
          <label key={k} className="block text-sm font-semibold">{r.nombre}
            <input className={input} inputMode={k === "whatsapp" ? "tel" : "text"} autoCapitalize="none" autoCorrect="off" placeholder={r.ejemplo} value={f[k]} onChange={set(k)} />
          </label>
        ))}
        <p className="text-sm text-tinta/70">Poné tu usuario o pegá el link: a los demás les aparece un botón que lleva a tu perfil. Ojo: tu número de WhatsApp lo puede ver cualquier usuario de DOPARTI.</p>
      </fieldset>
      <label className="flex items-start gap-3 rounded-lg bg-panel p-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-pasto" checked={f.mostrar_amigos}
          onChange={(e) => setF({ ...f, mostrar_amigos: e.target.checked })} />
        <span>
          <b className="block">Mostrar mi lista de amigos</b>
          <span className="text-tinta/70">Si la desactivás, solo la ven tus amigos. Los amigos en común se siguen mostrando.</span>
        </span>
      </label>
      <label className="block text-sm font-semibold">Nueva contraseña (opcional)
        <input className={input} type="password" minLength={6} placeholder="Dejala vacía para no cambiarla" value={f.password} onChange={set("password")} />
      </label>
      {error && <p className="text-sm font-semibold text-brasa">{error}</p>}
      <button disabled={guardando} className={`${btn} bg-pasto text-white disabled:opacity-50`}>Guardar cambios</button>
    </form>
  );
}
