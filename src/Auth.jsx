import { useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Logo } from "./ui";
import CamposJugador from "./CamposJugador";
import SelectorFoto from "./SelectorFoto";
import { redimensionar } from "./lib/imagen";
import { GENEROS, MANOS } from "./lib/deportes";

export default function Auth({ onPerfilActualizado, invitado = false }) {
  const [registro, setRegistro] = useState(invitado);
  const [f, setF] = useState({ nombre: "", apodo: "", edad: "", genero: GENEROS[0][0], deportes: ["futbol"], pie: "diestro", mano: MANOS[0][0], posiciones: {}, email: "", password: "" });
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    if (!registro) {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) setError("Email o contraseña incorrectos.");
      return setCargando(false);
    }
    const edad = Number(f.edad);
    const { data, error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: { data: { nombre_completo: f.nombre, apodo: f.apodo, edad, pie: f.pie, posicion: f.posiciones.futbol ?? null } },
    });
    if (error) { setError(error.message); return setCargando(false); }
    if (!data.session) {
      setError("Te mandamos un email para confirmar la cuenta. Confirmala y después iniciá sesión.");
      return setCargando(false);
    }
    const cambios = { edad, genero: f.genero, deportes: f.deportes, pie: f.pie, mano: f.mano, posiciones: f.posiciones, posicion: f.posiciones.futbol ?? null };
    if (foto) {
      const ruta = `${data.user.id}/avatar`;
      const blob = await redimensionar(foto);
      const up = await supabase.storage.from("avatars").upload(ruta, blob, { upsert: true, contentType: blob.type });
      if (!up.error) cambios.avatar_url = supabase.storage.from("avatars").getPublicUrl(ruta).data.publicUrl + `?v=${Date.now()}`;
    }
    await supabase.from("profiles").update(cambios).eq("id", data.user.id);
    onPerfilActualizado();
  }

  return (
    <form onSubmit={enviar} className="mx-auto mt-10 max-w-sm space-y-3 p-5">
      <h1 className="text-4xl font-extrabold"><Logo /></h1>
      {invitado && (
        <p role="status" className="rounded-2xl bg-panel p-3 text-sm font-semibold text-cesped">
          🎉 Te invitaron a DOPARTI. {registro ? "Creá tu cuenta y entrás directo a lo que te compartieron." : "Entrá y vas directo a lo que te compartieron."}
        </p>
      )}
      <p className="text-tinta/70">{registro ? "Creá tu cuenta para armar partidos con tu grupo." : "Entrá para ver tus partidos."}</p>
      {registro && (
        <>
          <input className={input} placeholder="Nombre completo" required value={f.nombre} onChange={set("nombre")} />
          <input className={input} placeholder="Apodo" required value={f.apodo} onChange={set("apodo")} />
          <CamposJugador f={f} setF={setF} />
          <SelectorFoto perfil={{ apodo: f.apodo }} archivo={foto} onElegir={setFoto} etiqueta="Foto de perfil (opcional)" />
        </>
      )}
      <input className={input} type="email" placeholder="Email (Gmail)" required value={f.email} onChange={set("email")} />
      <input className={input} type="password" placeholder="Contraseña" minLength={6} required value={f.password} onChange={set("password")} />
      {error && <p className="text-sm font-semibold text-brasa">{error}</p>}
      <button disabled={cargando} className={`${btn} w-full bg-pasto text-white disabled:opacity-50`}>
        {registro ? "Crear cuenta" : "Entrar"}
      </button>
      <button type="button" onClick={() => { setRegistro(!registro); setError(""); }} className="w-full text-sm font-semibold text-cesped">
        {registro ? "Ya tengo cuenta" : "No tengo cuenta"}
      </button>
    </form>
  );
}