import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando, Nivel, nombrePie } from "./ui";
import InvitarAPartido from "./InvitarAPartido";
import Comentarios from "./Comentarios";
import { DEPORTES, MANOS } from "./lib/deportes";
import { REDES, urlDe } from "./lib/redes";

function Seccion({ titulo, extra, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Personas({ lista, onVer, limite = 8 }) {
  const [todos, setTodos] = useState(false);
  const visibles = todos ? lista : lista.slice(0, limite);
  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {visibles.map((p) => (
          <li key={p.id}>
            <button onClick={() => onVer(p.id)}
              className="flex min-h-11 items-center gap-2 rounded-full bg-panel py-1 pl-1 pr-3 text-sm font-semibold hover:bg-panel-alto">
              <Avatar perfil={p} size={32} />{p.apodo}
            </button>
          </li>
        ))}
      </ul>
      {lista.length > limite && (
        <button onClick={() => setTodos(!todos)} className="min-h-11 text-sm font-semibold text-cesped">
          {todos ? "Ver menos" : `Ver los ${lista.length}`}
        </button>
      )}
    </>
  );
}

function Dato({ valor, titulo, color = "" }) {
  return (
    <div className="rounded-2xl bg-panel p-3 text-center">
      <p className={`font-display text-2xl font-extrabold tabular-nums ${color}`}>{valor}</p>
      <p className="text-xs text-tinta/70">{titulo}</p>
    </div>
  );
}

export default function PerfilPublico({ id, userId, onVolver, onEditar, onVerPerfil, onMensaje }) {
  const [perfil, setPerfil] = useState(undefined);
  const [jugados, setJugados] = useState(0);
  const [stats, setStats] = useState(null);
  const [amigos, setAmigos] = useState(null);
  const [amistad, setAmistad] = useState(undefined);
  const [comunes, setComunes] = useState([]);
  const [invitando, setInvitando] = useState(false);
  const esMio = id === userId;

  const cargarAmistad = async () => {
    if (esMio) return;
    const { data } = await supabase.from("amistades").select("id, solicitante_id, estado")
      .or(`and(solicitante_id.eq.${userId},destinatario_id.eq.${id}),and(solicitante_id.eq.${id},destinatario_id.eq.${userId})`)
      .maybeSingle();
    setAmistad(data ?? null);
  };
  const pedirAmistad = async () => { await supabase.from("amistades").insert({ solicitante_id: userId, destinatario_id: id }); cargarAmistad(); };
  const responder = async (aceptar) => { await supabase.rpc("responder_solicitud", { p_id: amistad.id, p_aceptar: aceptar }); cargarAmistad(); };
  const quitarAmistad = async () => {
    if (amistad.estado === "aceptada" && !window.confirm(`¿Quitar a ${perfil.apodo} de tus amigos?`)) return;
    await supabase.from("amistades").delete().eq("id", amistad.id);
    cargarAmistad();
  };

  useEffect(() => {
    let vigente = true;
    setPerfil(undefined); setAmistad(undefined); setComunes([]); setAmigos(null); setStats(null); setJugados(0);
    window.scrollTo({ top: 0 });
    cargarAmistad();
    if (!esMio) supabase.rpc("amigos_en_comun", { p_uid: id }).then(({ data }) => vigente && setComunes(data ?? []));
    supabase.from("profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => vigente && setPerfil(data ?? null));
    supabase.rpc("partidos_jugados", { p_uid: id }).then(({ data }) => vigente && setJugados(data ?? 0));
    supabase.rpc("estadisticas_jugador", { p_uid: id }).then(({ data }) => vigente && setStats(data?.[0] ?? null));
    supabase.rpc("amigos_de", { p_uid: id }).then(({ data, error }) => vigente && setAmigos(error ? null : data ?? []));
    return () => { vigente = false; };
  }, [id]);

  if (perfil === undefined) return <Cargando texto="Cargando perfil…" />;
  if (perfil === null) {
    return (
      <div className="space-y-4">
        <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
        <p className="text-tinta/70">No encontramos este perfil.</p>
      </div>
    );
  }

  const usaFutbol = !perfil.deportes?.length || perfil.deportes.includes("futbol");
  const mano = MANOS.find(([k]) => k === perfil.mano)?.[1];
  const datos = [
    perfil.edad && `${perfil.edad} años`,
    ...(perfil.deportes?.length
      ? perfil.deportes.filter((d) => DEPORTES[d]).map((d) => `${DEPORTES[d].emoji} ${DEPORTES[d].nombre}${perfil.posiciones?.[d] ? ` · ${perfil.posiciones[d]}` : ""}`)
      : [perfil.posicion]),
    usaFutbol && nombrePie(perfil.pie),
    perfil.deportes?.some((d) => d !== "futbol") && mano && `Mano ${mano.toLowerCase()}`,
  ].filter(Boolean);

  const redes = Object.entries(perfil.redes ?? {}).map(([k, v]) => [k, urlDe(k, v)]).filter(([, u]) => u);
  const faltan = [!perfil.avatar_url && "foto", !perfil.descripcion && "descripción", !redes.length && "redes"].filter(Boolean);
  const desde = perfil.creado_en
    ? new Date(perfil.creado_en).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : null;
  const listaPrivada = !esMio && perfil.mostrar_amigos === false && amistad?.estado !== "aceptada";

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>

      <header className="flex items-center gap-4">
        <Avatar perfil={perfil} size={80} />
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-extrabold">{perfil.apodo}</h2>
          <p className="truncate text-tinta/70">{perfil.nombre_completo}</p>
          {desde && <p className="text-sm text-tinta/60">Miembro desde {desde}</p>}
        </div>
      </header>

      {esMio && (
        <div className="space-y-2">
          <button onClick={onEditar} className={`${btn} bg-panel`}>Editar perfil</button>
          {faltan.length > 0 && (
            <p className="text-sm text-tinta/70">Completá tu perfil: te falta {faltan.join(", ")}. Un perfil completo hace que tus amigos te reconozcan más rápido.</p>
          )}
        </div>
      )}

      {perfil.descripcion ? (
        <p className="whitespace-pre-line break-words rounded-2xl bg-panel p-4">{perfil.descripcion}</p>
      ) : esMio && (
        <p className="rounded-2xl border border-dashed border-tinta/25 p-4 text-sm text-tinta/70">
          Todavía no escribiste una descripción. Contá cómo jugás desde “Editar perfil”.
        </p>
      )}

      {datos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {datos.map((d) => <li key={d} className="rounded-full bg-panel px-3 py-1 text-sm font-semibold">{d}</li>)}
        </ul>
      )}

      {redes.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Redes">
          {redes.map(([k, url]) => (
            <li key={k}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full bg-panel px-4 text-sm font-semibold text-cesped hover:bg-panel-alto">
                {REDES[k]?.nombre ?? k}
              </a>
            </li>
          ))}
        </ul>
      )}

      {!esMio && amistad !== undefined && (
        <div className="space-y-2">
          {onMensaje && <button onClick={() => onMensaje(id)} className={`${btn} bg-panel`}>Mensaje</button>}
          {amistad === null && <button onClick={pedirAmistad} className={`${btn} bg-pasto text-white`}>Agregar amigo</button>}
          {amistad?.estado === "aceptada" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-cesped">Son amigos</span>
              <button onClick={() => setInvitando(true)} className={`${btn} bg-pasto text-white`}>Invitar a un partido</button>
              <button onClick={quitarAmistad} className="min-h-11 px-2 text-sm font-semibold text-brasa">Quitar</button>
            </div>
          )}
          {amistad?.estado === "pendiente" && amistad.solicitante_id === userId && (
            <div className="flex items-center gap-3">
              <span className="text-tinta/70">Solicitud enviada</span>
              <button onClick={quitarAmistad} className="min-h-11 px-2 text-sm font-semibold text-brasa">Cancelar</button>
            </div>
          )}
          {amistad?.estado === "pendiente" && amistad.solicitante_id !== userId && (
            <div className="flex gap-2">
              <button onClick={() => responder(true)} className={`${btn} bg-pasto text-white`}>Aceptar solicitud</button>
              <button onClick={() => responder(false)} className={`${btn} bg-panel text-brasa`}>Rechazar</button>
            </div>
          )}
        </div>
      )}

      <Nivel jugados={jugados} />

      {stats?.con_resultado > 0 && (
        <Seccion titulo="Récord" extra={<span className="text-sm text-tinta/70">{stats.con_resultado} {stats.con_resultado === 1 ? "partido con resultado" : "partidos con resultado"}</span>}>
          <div className="grid grid-cols-3 gap-2">
            <Dato valor={stats.ganados} titulo="Ganados" color="text-cesped" />
            <Dato valor={stats.empatados} titulo="Empatados" />
            <Dato valor={stats.perdidos} titulo="Perdidos" color="text-brasa" />
          </div>
        </Seccion>
      )}

      {!esMio && comunes.length > 0 && (
        <Seccion titulo={`Amigos en común (${comunes.length})`}>
          <Personas lista={comunes} onVer={onVerPerfil} />
        </Seccion>
      )}

      {(esMio || amistad !== undefined) && amigos !== null && (
        <Seccion titulo={listaPrivada ? "Amigos" : `Amigos (${amigos.length})`}>
          {listaPrivada ? (
            <p className="text-sm text-tinta/70">{perfil.apodo} mantiene su lista de amigos privada.</p>
          ) : amigos.length === 0 ? (
            <p className="text-sm text-tinta/70">{esMio ? "Todavía no tenés amigos. Buscalos desde el menú, en “Amigos”." : `${perfil.apodo} todavía no tiene amigos.`}</p>
          ) : (
            <Personas lista={amigos} onVer={onVerPerfil} />
          )}
        </Seccion>
      )}

      <Comentarios key={id} perfilId={id} apodo={perfil.apodo} userId={userId} esMio={esMio} onVerPerfil={onVerPerfil} />
      {invitando && <InvitarAPartido amigo={perfil} userId={userId} onCerrar={() => setInvitando(false)} />}
    </div>
  );
}
