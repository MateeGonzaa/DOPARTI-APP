import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar, Cargando, Nivel, nombrePie } from "./ui";
import InvitarAPartido from "./InvitarAPartido";
import Comentarios from "./Comentarios";
import { DEPORTES, MANOS } from "./lib/deportes";

export default function PerfilPublico({ id, userId, onVolver, onEditar, onVerPerfil }) {
  const [perfil, setPerfil] = useState(undefined);
  const [jugados, setJugados] = useState(0);
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
    cargarAmistad();
    if (!esMio) supabase.rpc("amigos_en_comun", { p_uid: id }).then(({ data }) => setComunes(data ?? []));
    supabase.from("profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => setPerfil(data ?? null));
    supabase.rpc("partidos_jugados", { p_uid: id }).then(({ data }) => setJugados(data ?? 0));
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

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <header className="flex items-center gap-4">
        <Avatar perfil={perfil} size={72} />
        <div className="min-w-0">
          <h2 className="truncate text-3xl font-extrabold">{perfil.apodo}</h2>
          <p className="truncate text-tinta/70">{perfil.nombre_completo}</p>
        </div>
      </header>

      {esMio && <button onClick={onEditar} className={`${btn} bg-panel`}>Editar perfil</button>}

      {datos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {datos.map((d) => <li key={d} className="rounded-full bg-panel px-3 py-1 text-sm font-semibold">{d}</li>)}
        </ul>
      )}

      {!esMio && amistad !== undefined && (
        <div className="space-y-2">
          {amistad === null && <button onClick={pedirAmistad} className={`${btn} bg-pasto text-white`}>Agregar amigo</button>}
          {amistad?.estado === "aceptada" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-cesped">Son amigos</span>
              <button onClick={() => setInvitando(true)} className={`${btn} bg-pasto text-white`}>Invitar a un partido</button>
              <button onClick={quitarAmistad} className="text-sm font-semibold text-brasa">Quitar</button>
            </div>
          )}
          {amistad?.estado === "pendiente" && amistad.solicitante_id === userId && (
            <div className="flex items-center gap-3">
              <span className="text-tinta/70">Solicitud enviada</span>
              <button onClick={quitarAmistad} className="text-sm font-semibold text-brasa">Cancelar</button>
            </div>
          )}
          {amistad?.estado === "pendiente" && amistad.solicitante_id !== userId && (
            <div className="flex gap-2">
              <button onClick={() => responder(true)} className={`${btn} bg-pasto text-white`}>Aceptar solicitud</button>
              <button onClick={() => responder(false)} className={`${btn} bg-panel text-brasa`}>Rechazar</button>
            </div>
          )}
          {comunes.length > 0 && (
            <p className="text-sm text-tinta/70">
              {comunes.length} {comunes.length === 1 ? "amigo en común" : "amigos en común"}: {comunes.map((c) => c.apodo).join(", ")}
            </p>
          )}
        </div>
      )}

      <Nivel jugados={jugados} />

      <Comentarios key={id} perfilId={id} apodo={perfil.apodo} userId={userId} esMio={esMio} onVerPerfil={onVerPerfil} />
      {invitando && <InvitarAPartido amigo={perfil} userId={userId} onCerrar={() => setInvitando(false)} />}
    </div>
  );
}
