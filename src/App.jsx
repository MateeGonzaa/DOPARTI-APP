import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./Auth";
import Comunidades from "./Comunidades";
import Comunidad from "./Comunidad";
import Detalle from "./Detalle";
import Perfil from "./Perfil";
import { Cargando, Logo } from "./ui";
import Menu from "./Menu";

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [listo, setListo] = useState(false);
  const [comunidad, setComunidad] = useState(null);
  const [partidoId, setPartidoId] = useState(null);
  const [verPerfil, setVerPerfil] = useState(false);
  const [menu, setMenu] = useState(false);

  const cargarPerfil = async (uid) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setPerfil(data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Al iniciar sesión: cargar perfil y, si venía con link de invitación, unirse.
  useEffect(() => {
    if (!sesion) { setPerfil(null); setListo(false); return; }
    cargarPerfil(sesion.user.id);
    const codigo = new URLSearchParams(location.search).get("invitacion");
    if (!codigo) return setListo(true);
    supabase.rpc("unirse_a_comunidad", { p_codigo: codigo }).then(() => {
      history.replaceState(null, "", location.pathname);
      setListo(true);
    });
  }, [sesion]);

  if (sesion === undefined) return <Cargando />;
  if (!sesion) return <Auth onPerfilActualizado={() => supabase.auth.getUser().then(({ data }) => cargarPerfil(data.user.id))} />;

  const inicio = () => { setComunidad(null); setPartidoId(null); setVerPerfil(false); };

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 pb-10 sm:space-y-6 sm:p-5">
      <header className="sticky top-[env(safe-area-inset-top)] z-40 -mx-4 -mt-4 flex items-center justify-between border-b border-white/10 bg-fondo/80 px-4 py-2 backdrop-blur-md sm:-mx-5 sm:-mt-5 sm:px-5">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          <button onClick={inicio} aria-label="DOPARTI, ir al inicio" className="rounded-lg"><Logo /></button>
        </h1>
        <button onClick={() => setMenu(true)} aria-label="Abrir menú" aria-expanded={menu} aria-controls="menu"
          className="-mr-2 grid size-11 place-items-center rounded-lg">
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 3h18M8 9h12M2 15h18" />
          </svg>
        </button>
      </header>

      {!listo ? <Cargando /> : verPerfil ? (
        <Perfil perfil={perfil} onCerrar={() => setVerPerfil(false)}
          onGuardado={() => { cargarPerfil(sesion.user.id); setVerPerfil(false); }} />
      ) : partidoId ? (
        <Detalle id={partidoId} userId={sesion.user.id} onVolver={() => setPartidoId(null)} />
      ) : comunidad ? (
        <Comunidad comunidad={comunidad} userId={sesion.user.id} onCambio={setComunidad} onVolver={() => setComunidad(null)} onAbrirPartido={setPartidoId} />
      ) : (
        <Comunidades onAbrir={setComunidad} />
      )}

      <Menu abierto={menu} onCerrar={() => setMenu(false)} perfil={perfil}
        items={[
          { texto: "Mis comunidades", onClick: inicio },
          { texto: "Mi perfil", onClick: () => setVerPerfil(true) },
          { texto: "Salir", onClick: () => supabase.auth.signOut(), peligro: true },
        ]} />
    </div>
  );
}
