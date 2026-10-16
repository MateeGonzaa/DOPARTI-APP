import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./Auth";
import Comunidades from "./Comunidades";
import Comunidad from "./Comunidad";
import Detalle from "./Detalle";
import Perfil from "./Perfil";
import PerfilPublico from "./PerfilPublico";
import Amigos from "./Amigos";
import Invitaciones from "./Invitaciones";
import Actividad from "./Actividad";
import Notificaciones from "./Notificaciones";
import { Cargando, Logo } from "./ui";
import Menu from "./Menu";
import Explorar from "./Explorar";
import Footer from "./Footer";
import Mensajes from "./Mensajes";
import Truco from "./Truco";
import TrucoPartida from "./TrucoPartida";
import { Avatar } from "./ui";

// Si alguien abre un link de invitación (comunidad, partido o mesa de Truco) sin tener cuenta, el código se recuerda
// hasta que se registre o inicie sesión (también si tiene que confirmar el email y vuelve después).
const PENDIENTE = "doparti_pendiente";
const CLAVES_LINK = ["invitacion", "partido", "truco"];
function guardarPendiente() {
  try {
    const qs = new URLSearchParams(location.search);
    const p = Object.fromEntries(CLAVES_LINK.filter((k) => qs.get(k)).map((k) => [k, qs.get(k)]));
    if (Object.keys(p).length) localStorage.setItem(PENDIENTE, JSON.stringify(p));
  } catch { /* sin almacenamiento */ }
}
const leerPendiente = () => { try { return JSON.parse(localStorage.getItem(PENDIENTE)) ?? {}; } catch { return {}; } };
const borrarPendiente = () => { try { localStorage.removeItem(PENDIENTE); } catch { /* nada */ } };
guardarPendiente();

// Navegación fija a la izquierda, solo en pantallas grandes (en el celular se usa el menú hamburguesa)
function BarraLateral({ items, perfil, onInicio }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-1 py-8 lg:flex">
      <h1 className="mb-4 text-3xl font-extrabold"><button onClick={onInicio} aria-label="DOPARTI, ir al inicio" className="rounded-lg"><Logo /></button></h1>
      <nav aria-label="Navegación principal" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((it) => (
          <button key={it.texto} onClick={it.onClick} aria-current={it.activa ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-lg px-3 text-left font-semibold hover:bg-panel-alto ${it.activa ? "bg-panel text-cesped" : ""} ${it.peligro ? "mt-auto text-brasa" : ""}`}>
            {it.texto}
            {it.insignia > 0 && <span className="ml-2 rounded-full bg-naranja px-2 text-sm text-white">{it.insignia}</span>}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <Avatar perfil={perfil} size={40} />
        <div className="min-w-0"><p className="truncate font-semibold">{perfil?.apodo}</p><p className="truncate text-xs text-tinta/70">{perfil?.nombre_completo}</p></div>
      </div>
    </aside>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [listo, setListo] = useState(false);
  const [comunidad, setComunidad] = useState(null);
  const [partidoId, setPartidoId] = useState(null);
  const [perfilId, setPerfilId] = useState(null);
  const [verPerfil, setVerPerfil] = useState(false);
  const [menu, setMenu] = useState(false);
  const [verAmigos, setVerAmigos] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [verInvitaciones, setVerInvitaciones] = useState(false);
  const [invitPend, setInvitPend] = useState(0);
  const [verActividad, setVerActividad] = useState(false);
  const [actPend, setActPend] = useState(0);
  const [verNotif, setVerNotif] = useState(false);
  const [verExplorar, setVerExplorar] = useState(false);
  const [explorarDeporte, setExplorarDeporte] = useState("");
  const [verTruco, setVerTruco] = useState(false);
  const [trucoId, setTrucoId] = useState(null);
  const [verMensajes, setVerMensajes] = useState(false);
  const [mensajesCon, setMensajesCon] = useState(null);

  const cargarPerfil = async (uid) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setPerfil(data);
  };

  const cargarPendientes = async (uid = sesion?.user.id) => {
    if (!uid) return;
    const [a, b, c] = await Promise.all([
      supabase.from("amistades").select("id", { count: "exact", head: true }).eq("destinatario_id", uid).eq("estado", "pendiente"),
      supabase.from("invitaciones").select("id", { count: "exact", head: true }).eq("para_id", uid).eq("estado", "pendiente"),
      supabase.from("notificaciones").select("id", { count: "exact", head: true }).eq("usuario_id", uid).eq("leida", false),
    ]);
    setPendientes(a.count ?? 0);
    setInvitPend(b.count ?? 0);
    setActPend(c.count ?? 0);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);


  // Cuando llega un aviso nuevo, se actualizan los contadores al instante
  useEffect(() => {
    if (!sesion) return;
    const uid = sesion.user.id;
    const sub = supabase.channel(`avisos:${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${uid}` }, () => cargarPendientes(uid))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [sesion]);

  useEffect(() => {
    if (!sesion) { setPerfil(null); setListo(false); return; }
    cargarPerfil(sesion.user.id);
    cargarPendientes(sesion.user.id);
    const qs = new URLSearchParams(location.search);
    const guardado = leerPendiente();
    const codigo = qs.get("invitacion") ?? guardado.invitacion;
    const codPartido = qs.get("partido") ?? guardado.partido;
    const codTruco = qs.get("truco") ?? guardado.truco;
    if (!codigo && !codPartido && !codTruco) return setListo(true);
    borrarPendiente();
    (async () => {
      if (codigo) await supabase.rpc("unirse_a_comunidad", { p_codigo: codigo });
      if (codPartido) {
        const { data } = await supabase.rpc("abrir_partido_por_codigo", { p_codigo: codPartido });
        if (data) setPartidoId(data);
      }
      if (codTruco) setTrucoId(codTruco);
      history.replaceState(null, "", location.pathname);
      setListo(true);
    })();
  }, [sesion]);

  if (sesion === undefined) return <Cargando />;
  if (!sesion) return (
    <>
      <Auth invitado={CLAVES_LINK.some((k) => leerPendiente()[k])} onPerfilActualizado={() => supabase.auth.getUser().then(({ data }) => cargarPerfil(data.user.id))} />
      <div className="mx-auto max-w-xl px-4 pb-10"><Footer /></div>
    </>
  );

  const limpiar = () => { setPerfilId(null); setVerPerfil(false); setVerAmigos(false); setVerInvitaciones(false); setVerActividad(false); setVerNotif(false); setVerExplorar(false); setVerTruco(false); setTrucoId(null); setVerMensajes(false); setMensajesCon(null); };
  const inicio = () => { limpiar(); setComunidad(null); setPartidoId(null); };
  const irMensajes = (con = null) => { limpiar(); setComunidad(null); setPartidoId(null); setMensajesCon(con); setVerMensajes(true); };
  const irTruco = (id = null) => { limpiar(); setComunidad(null); setPartidoId(null); setVerTruco(true); setTrucoId(id); };
  const totalPend = pendientes + invitPend + actPend;
  const abrirAviso = async (n) => {
    const r = n.ref ?? {};
    limpiar(); setComunidad(null); setPartidoId(null);
    if (n.tipo === "invitacion") return setVerInvitaciones(true);
    if (n.tipo === "amistad_solicitud") return setVerAmigos(true);
    if (n.tipo === "amistad_aceptada") return setPerfilId(r.perfil ?? n.de_id);
    if (n.tipo === "mensaje") return irMensajes(r.con ?? n.de_id);
    if ((n.tipo === "recordatorio" || n.tipo === "partido_nuevo") && r.partido) return setPartidoId(r.partido);
    if (n.tipo === "truco_rival" || n.tipo === "truco_fin") return irTruco(r.truco ?? null);
    if (n.tipo === "comunidad_nuevo_miembro" && r.comunidad) {
      const { data } = await supabase.from("comunidades").select("*, zonas(nombre, provincia, pais, lat, lng)").eq("id", r.comunidad).maybeSingle();
      return data ? setComunidad(data) : undefined;
    }
    if (n.perfil_id) return setPerfilId(n.perfil_id);
    if (n.tipo === "sistema") return setVerNotif(true);
  };
  const irExplorar = (deporte = "") => { limpiar(); setComunidad(null); setPartidoId(null); setExplorarDeporte(deporte); setVerExplorar(true); };
  const arriba = (fn) => () => { fn(); window.scrollTo({ top: 0 }); };
  const seccionesFooter = [
    { texto: "Mis comunidades", onClick: arriba(inicio) },
    { texto: "Explorar", onClick: arriba(() => irExplorar()) },
    { texto: "Truco virtual", onClick: arriba(() => irTruco()) },
    { texto: "Mensajes", onClick: arriba(() => irMensajes()) },
    { texto: "Amigos", onClick: arriba(() => { limpiar(); setVerAmigos(true); }) },
    { texto: "Invitaciones", onClick: arriba(() => { limpiar(); setVerInvitaciones(true); }) },
    { texto: "Actividad", onClick: arriba(() => { limpiar(); setVerActividad(true); }) },
    { texto: "Notificaciones", onClick: arriba(() => { limpiar(); setVerNotif(true); }) },
    { texto: "Mi perfil", onClick: arriba(() => { limpiar(); setPerfilId(sesion.user.id); }) },
  ];

  const items = [
    { texto: "Mis comunidades", activa: !comunidad && !partidoId && !verPerfil && !perfilId && !verAmigos && !verInvitaciones && !verExplorar && !verActividad && !verNotif && !verTruco && !trucoId && !verMensajes, onClick: inicio },
    { texto: "Explorar comunidades", activa: verExplorar, onClick: () => irExplorar() },
    { texto: "Truco virtual", activa: verTruco || !!trucoId, onClick: () => irTruco() },
    { texto: "Mensajes", activa: verMensajes, onClick: () => irMensajes() },
    { texto: "Mi perfil", activa: perfilId === sesion.user.id, onClick: () => { limpiar(); setPerfilId(sesion.user.id); } },
    { texto: "Amigos", insignia: pendientes, activa: verAmigos, onClick: () => { limpiar(); setVerAmigos(true); } },
    { texto: "Invitaciones", insignia: invitPend, activa: verInvitaciones, onClick: () => { limpiar(); setVerInvitaciones(true); } },
    { texto: "Actividad", insignia: actPend, activa: verActividad, onClick: () => { limpiar(); setVerActividad(true); } },
    { texto: "Notificaciones", activa: verNotif, onClick: () => { limpiar(); setVerNotif(true); } },
    { texto: "Salir", onClick: () => supabase.auth.signOut(), peligro: true },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8">
      <BarraLateral items={items} perfil={perfil} onInicio={inicio} />
      <div className="mx-auto w-full max-w-xl space-y-5 p-4 pb-10 sm:space-y-6 sm:p-5 md:max-w-2xl lg:max-w-4xl lg:px-0 lg:py-8">
      <header className="sticky top-[env(safe-area-inset-top)] z-40 lg:hidden -mx-4 -mt-4 flex items-center justify-between border-b border-white/10 bg-fondo/80 px-4 py-2 backdrop-blur-md sm:-mx-5 sm:-mt-5 sm:px-5">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          <button onClick={inicio} aria-label="DOPARTI, ir al inicio" className="rounded-lg"><Logo /></button>
        </h1>
        <button onClick={() => { cargarPendientes(); setMenu(true); }} aria-label={`Abrir menú${totalPend ? `, ${totalPend} pendientes` : ""}`} aria-expanded={menu} aria-controls="menu"
          className="relative -mr-2 grid size-11 place-items-center rounded-lg">
          {totalPend > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-3 rounded-full bg-naranja ring-2 ring-fondo" />}
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 3h18M8 9h12M2 15h18" />
          </svg>
        </button>
      </header>

      {!listo ? <Cargando /> : trucoId ? (
        <TrucoPartida id={trucoId} userId={sesion.user.id} onVolver={() => irTruco()} onAbrir={setTrucoId} onVerPerfil={(id) => { limpiar(); setPerfilId(id); }} />
      ) : verTruco ? (
        <Truco userId={sesion.user.id} onAbrir={setTrucoId} onVolver={inicio} />
      ) : verMensajes ? (
        <Mensajes key={mensajesCon ?? "bandeja"} userId={sesion.user.id} conId={mensajesCon} onVolver={inicio} onVerPerfil={(id) => { limpiar(); setPerfilId(id); }} />
      ) : verPerfil ? (
        <Perfil perfil={perfil} onCerrar={() => setVerPerfil(false)}
          onGuardado={() => { cargarPerfil(sesion.user.id); setVerPerfil(false); }} />
      ) : perfilId ? (
        <PerfilPublico id={perfilId} userId={sesion.user.id} onVolver={() => setPerfilId(null)} onEditar={() => setVerPerfil(true)} onVerPerfil={setPerfilId} onMensaje={irMensajes} />
      ) : verAmigos ? (
        <Amigos userId={sesion.user.id} onVolver={() => setVerAmigos(false)} onVerPerfil={setPerfilId} onCambio={cargarPendientes} />
      ) : verInvitaciones ? (
        <Invitaciones userId={sesion.user.id} onVolver={() => setVerInvitaciones(false)} onCambio={cargarPendientes}
          onAbrirPartido={(id) => { setVerInvitaciones(false); setPartidoId(id); }} />
      ) : verExplorar ? (
        <Explorar key={explorarDeporte} deporteInicial={explorarDeporte} onVolver={() => setVerExplorar(false)} onAbrir={(c) => { limpiar(); setPartidoId(null); setComunidad(c); }} onCrear={() => { limpiar(); setComunidad(null); }} />
      ) : verNotif ? (
        <Notificaciones userId={sesion.user.id} email={sesion.user.email} perfil={perfil} onVolver={() => setVerNotif(false)} />
      ) : verActividad ? (
        <Actividad userId={sesion.user.id} onVolver={() => setVerActividad(false)} onAbrir={abrirAviso}
          onConfigurar={() => { limpiar(); setVerNotif(true); }} onCambio={cargarPendientes} />
      ) : partidoId ? (
        <Detalle id={partidoId} userId={sesion.user.id} onVolver={() => setPartidoId(null)} onVerPerfil={setPerfilId} />
      ) : comunidad ? (
        <Comunidad comunidad={comunidad} userId={sesion.user.id} onCambio={setComunidad} onVolver={() => setComunidad(null)}
          onAbrirPartido={setPartidoId} onVerPerfil={setPerfilId} onAbrirTruco={irTruco} />
      ) : (
        <Comunidades onAbrir={setComunidad} userId={sesion.user.id} onAbrirPartido={setPartidoId} onExplorar={() => irExplorar()} />
      )}

      <Menu abierto={menu} onCerrar={() => setMenu(false)} perfil={perfil} items={items} />

      <Footer secciones={seccionesFooter} onDeporte={(d) => { irExplorar(d); window.scrollTo({ top: 0 }); }} />
      </div>
    </div>
  );
}
