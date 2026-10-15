import { useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar } from "./ui";
import CamposJugador from "./CamposJugador";
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
  });
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError("");
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
    };
    if (foto) {
      const ruta = `${perfil.id}/avatar`;
      const up = await supabase.storage.from("avatars").upload(ruta, foto, { upsert: true, contentType: foto.type });
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
      <div className="flex items-center gap-3">
        <Avatar perfil={perfil} size={56} />
        <label className="text-sm font-semibold">
          Cambiar foto
          <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={(e) => setFoto(e.target.files[0] ?? null)} />
        </label>
      </div>
      <label className="block text-sm font-semibold">Nombre completo
        <input className={input} required value={f.nombre} onChange={set("nombre")} />
      </label>
      <label className="block text-sm font-semibold">Apodo
        <input className={input} required value={f.apodo} onChange={set("apodo")} />
      </label>
      <CamposJugador f={f} setF={setF} />
      <label className="block text-sm font-semibold">Nueva contraseña (opcional)
        <input className={input} type="password" minLength={6} placeholder="Dejala vacía para no cambiarla" value={f.password} onChange={set("password")} />
      </label>
      {error && <p className="text-sm font-semibold text-brasa">{error}</p>}
      <button disabled={guardando} className={`${btn} bg-pasto text-white disabled:opacity-50`}>Guardar cambios</button>
    </form>
  );
}
