import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Avatar, Cargando } from "./ui";
import { cupo, cuando, sortear } from "./lib/logica";
import { convocatoria, equiposMsg, faltanMsg } from "./lib/mensajes";
import Mapa from "./Mapa";
import Votos from "./Votos";
import { DEPORTES_COM, etiqueta, cap } from "./lib/modalidades";

function Equipo({ nombre, color, ids, quien }) {
  return (
    <div className={`equipo-entra rounded-2xl p-4 text-white ${color}`}>
      <h4 className="mb-2 text-lg font-extrabold">{nombre}</h4>
      <ul className="space-y-1">{ids.map((id) => <li key={id}>{quien(id)?.apodo}</li>)}</ul>
    </div>
  );
}

export default function Detalle({ id, userId, onVolver, onVerPerfil }) {
  const [p, setP] = useState(null);
  const [nueva, setNueva] = useState({ fecha: "", hora: "" });
  const [aviso, setAviso] = useState("");
  const [amigos, setAmigos] = useState([]);
  const [invitados, setInvitados] = useState(new Set());
  const [copiado, setCopiado] = useState(false);
  const [res, setRes] = useState({ a: "", b: "" });

  const cargar = async () => {
    const { data } = await supabase
      .from("partidos")
      .select("*, comunidades(whatsapp_link, nombre, codigo_invitacion), inscripciones(id, usuario_id, created_at, profiles(apodo, avatar_url))")
      .eq("id", id)
      .single();
    if (data) data.inscripciones.sort((a, b) => a.created_at.localeCompare(b.created_at));
    setP(data);
  };
  useEffect(() => { cargar(); }, [id]);
  useEffect(() => {
    supabase.from("amistades")
      .select("solicitante_id, solicitante:profiles!solicitante_id(id, apodo, avatar_url), destinatario:profiles!destinatario_id(id, apodo, avatar_url)")
      .eq("estado", "aceptada").then(({ data }) => {
        setAmigos((data ?? []).map((a) => (a.solicitante_id === userId ? a.destinatario : a.solicitante)).filter(Boolean));
      });
  }, [userId]);
  useEffect(() => {
    supabase.from("invitaciones").select("para_id").eq("partido_id", id).eq("de_id", userId)
      .then(({ data }) => setInvitados(new Set((data ?? []).map((x) => x.para_id))));
  }, [id, userId]);
  const amigosIds = new Set(amigos.map((a) => a.id));
  if (!p) return <Cargando texto="Cargando partido…" />;

  const ins = p.inscripciones;
  const titulares = ins.slice(0, cupo(p));
  const suplentes = ins.slice(cupo(p));
  const completo = titulares.length === cupo(p);
  const yo = ins.find((i) => i.usuario_id === userId);
  const quien = (uid) => ins.find((i) => i.usuario_id === uid)?.profiles;
  const guardarEquipos = (equipos) => supabase.rpc("guardar_equipos", { p_partido: p.id, p_equipos: equipos });

  async function anotarme() {
    await supabase.from("inscripciones").insert({ partido_id: p.id });
    if (ins.length + 1 >= cupo(p) && !p.equipos) {
      await guardarEquipos(sortear([...ins.map((i) => i.usuario_id), userId], p.tipo));
    }
    cargar();
  }

  // Si se baja un titular, entra el primer suplente en su mismo equipo.
  async function bajarme() {
    const idx = ins.findIndex((i) => i.usuario_id === userId);
    // Primero se actualizan los equipos (todavía estoy anotado) y después me borro.
    if (p.equipos && idx < cupo(p)) {
      const sup = ins[cupo(p)];
      const cambiar = (l) => l.map((x) => (x === userId ? sup.usuario_id : x));
      await guardarEquipos(sup ? { A: cambiar(p.equipos.A), B: cambiar(p.equipos.B) } : null);
    }
    await supabase.from("inscripciones").delete().eq("id", yo.id);
    cargar();
  }

  async function eliminar() {
    await supabase.from("partidos").delete().eq("id", p.id);
    onVolver();
  }

  const disponibles = amigos.filter((a) => !ins.some((i) => i.usuario_id === a.id));
  async function invitar(uid) {
    const { error } = await supabase.from("invitaciones").insert({ partido_id: p.id, de_id: userId, para_id: uid });
    if (error && error.code !== "23505") return setAviso("No se pudo enviar la invitación.");
    setAviso("");
    setInvitados(new Set([...invitados, uid]));
  }
  const wa = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
  async function definirFecha() {
    await supabase.from("partidos").update({ fecha: nueva.fecha, hora: nueva.hora, a_coordinar: false }).eq("id", p.id);
    cargar();
  }

  function compartir(texto) {
    const grupo = p.comunidades?.whatsapp_link;
    if (!grupo) return window.open(wa(texto), "_blank", "noopener");
    navigator.clipboard.writeText(texto)
      .then(() => setAviso("Mensaje copiado. Pegalo en el grupo."))
      .catch(() => setAviso("No pudimos copiar el mensaje."));
    window.open(grupo, "_blank", "noopener");
  }
  const nombre = (uid) => quien(uid)?.apodo ?? "?";
  const palabra = p.deporte === "padel" || p.deporte === "truco" ? "Pareja" : (p.deporte ?? "futbol") === "futbol" ? "Pechera" : "Equipo";
  const guardarResultado = async () => {
    await supabase.from("partidos").update({ resultado_a: Number(res.a), resultado_b: Number(res.b) }).eq("id", p.id);
    cargar();
  };
  const borrarResultado = async () => {
    await supabase.from("partidos").update({ resultado_a: null, resultado_b: null }).eq("id", p.id);
    setRes({ a: "", b: "" });
    cargar();
  };
  const linkPartido = p.codigo ? `${location.origin}/?partido=${p.codigo}` : "";
  const copiarLink = async () => { try { await navigator.clipboard.writeText(linkPartido); setCopiado(true); } catch { /* sin permiso */ } };
  const alternarAbierto = async () => { await supabase.from("partidos").update({ abierto: !p.abierto }).eq("id", p.id); setCopiado(false); cargar(); };
  const Fila = ({ i, n }) => (
    <li>
      <button onClick={() => onVerPerfil(i.usuario_id)} className="flex w-full items-center gap-2 rounded-lg bg-panel px-3 py-2 text-left hover:bg-panel-alto">
        <Avatar perfil={i.profiles} size={28} />{n}. {i.profiles?.apodo}
        {amigosIds.has(i.usuario_id) && <span className="ml-auto rounded-full bg-pasto/30 px-2 text-xs font-semibold text-cesped">Amigo</span>}
      </button>
    </li>
  );

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <header>
        <h2 className="text-3xl font-extrabold">{DEPORTES_COM[p.deporte ?? "futbol"]?.emoji} {etiqueta(p)}</h2>
        <p>{cap(cuando(p))}</p>
        <p>{p.sede}{p.sede_direccion && ` — ${p.sede_direccion}`}</p>
      </header>

      {p.sede_lat != null && (
        <div className="space-y-2">
          <Mapa lat={p.sede_lat} lng={p.sede_lng} nombre={p.sede} />
          <a target="_blank" rel="noreferrer" className="text-sm font-semibold text-cesped"
            href={`https://www.google.com/maps/search/?api=1&query=${p.sede_lat},${p.sede_lng}`}>Cómo llegar</a>
        </div>
      )}

      {p.a_coordinar && p.creado_por === userId && (
        <div className="space-y-2 rounded-2xl bg-panel p-4">
          <p className="text-sm font-semibold">Cuando lo coordinen, definí la fecha y hora:</p>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <input type="date" aria-label="Fecha" className={input} value={nueva.fecha} onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })} />
            <input type="time" aria-label="Hora" className={input} value={nueva.hora} onChange={(e) => setNueva({ ...nueva, hora: e.target.value })} />
          </div>
          <button disabled={!nueva.fecha || !nueva.hora} onClick={definirFecha} className={`${btn} bg-pasto text-white disabled:opacity-40`}>Definir fecha y hora</button>
        </div>
      )}

      <div>
        <div className="mb-1 flex justify-between text-sm font-semibold">
          <span>{titulares.length} de {cupo(p)} anotados</span>
          {completo && <span className="cupo-completo rounded-full px-2 text-cesped">Cupo completo</span>}
        </div>
        <div className="h-2 rounded-full bg-tinta/15">
          <div className="h-2 rounded-full bg-cesped shadow-[0_0_12px_var(--color-cesped)] transition-[width] duration-700" style={{ width: `${(titulares.length / cupo(p)) * 100}%` }} />
        </div>
      </div>

      {yo ? (
        <button onClick={bajarme} className={`${btn} w-full bg-panel text-brasa sm:w-auto`}>Bajarme del partido</button>
      ) : (
        <button onClick={anotarme} className={`${btn} w-full bg-pasto text-white sm:w-auto`}>{completo ? "Anotarme de suplente" : "Anotarme"}</button>
      )}

      <section>
        <h3 className="mb-2 font-extrabold">Titulares</h3>
        {titulares.length === 0
          ? <p className="text-tinta/70">Todavía no se anotó nadie. Sé el primero.</p>
          : <ol className="space-y-1">{titulares.map((i, k) => <Fila key={i.id} i={i} n={k + 1} />)}</ol>}
      </section>

      {suplentes.length > 0 && (
        <section>
          <h3 className="mb-2 font-extrabold">Suplentes</h3>
          <ol className="space-y-1">{suplentes.map((i, k) => <Fila key={i.id} i={i} n={k + 1} />)}</ol>
        </section>
      )}

      {disponibles.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-extrabold">Invitar amigos</h3>
          <ul className="space-y-1">
            {disponibles.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2">
                <Avatar perfil={a} size={28} />
                <span className="min-w-0 flex-1 truncate">{a.apodo}</span>
                {invitados.has(a.id)
                  ? <span className="px-2 text-sm font-semibold text-cesped">Invitado</span>
                  : <button onClick={() => invitar(a.id)} className={`${btn} min-h-9 bg-pasto px-3 py-1 text-sm text-white`}>Invitar</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.equipos && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold">Equipos</h3>
            {p.creado_por === userId && (
              <button onClick={async () => { await guardarEquipos(sortear(titulares.map((i) => i.usuario_id), p.tipo)); cargar(); }} className="text-sm font-semibold text-cesped">Volver a sortear</button>
            )}
          </div>
          <div key={JSON.stringify(p.equipos)} className="grid gap-3 sm:grid-cols-2">
            <Equipo nombre={`${palabra} naranja`} color="bg-naranja" ids={p.equipos.A} quien={quien} />
            <Equipo nombre={`${palabra} celeste`} color="bg-celeste" ids={p.equipos.B} quien={quien} />
          </div>
        </section>
      )}

      {p.equipos && (p.abierto || p.resultado_a != null) && (
        <Votos objetivo={`partido:${p.id}`} userId={userId} cerrado={p.resultado_a != null}
          titulo={p.resultado_a != null ? "Lo que votó la gente" : "¿Qué equipo va a ganar?"}
          opciones={[{ id: "A", label: `${palabra} naranja`, color: "bg-naranja" }, { id: "B", label: `${palabra} celeste`, color: "bg-celeste" }]} />
      )}

      {(p.resultado_a != null || (p.creado_por === userId && p.equipos)) && (
        <section className="space-y-2 rounded-2xl bg-panel p-4">
          <h3 className="font-extrabold">Resultado</h3>
          {p.resultado_a != null ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-extrabold tabular-nums">{p.resultado_a} <span className="text-tinta/50">-</span> {p.resultado_b}</p>
                <p className="text-sm text-tinta/70">{palabra} naranja - {palabra.toLowerCase()} celeste</p>
              </div>
              {p.creado_por === userId && <button onClick={borrarResultado} className="px-2 py-2 text-sm font-semibold text-brasa">Borrar</button>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" min={0} max={999} aria-label="Resultado naranja" className={`${input} text-center`} value={res.a} onChange={(e) => setRes({ ...res, a: e.target.value })} />
              <span aria-hidden="true">-</span>
              <input type="number" inputMode="numeric" min={0} max={999} aria-label="Resultado celeste" className={`${input} text-center`} value={res.b} onChange={(e) => setRes({ ...res, b: e.target.value })} />
              <button disabled={res.a === "" || res.b === ""} onClick={guardarResultado} className={`${btn} shrink-0 bg-pasto text-white disabled:opacity-40`}>Guardar</button>
            </div>
          )}
        </section>
      )}

      {(p.abierto || p.creado_por === userId) && (
        <section className="space-y-3 rounded-2xl bg-panel p-4">
          <h3 className="font-extrabold">Partido entre comunidades</h3>
          {p.abierto ? (
            <>
              <p className="text-sm text-tinta/70">Cualquiera con este link y una cuenta puede ver el partido y anotarse, sea de tu comunidad o de otra.</p>
              <input readOnly className={input} value={linkPartido} onFocus={(e) => e.target.select()} />
              <div className="flex flex-wrap gap-2">
                <button onClick={copiarLink} className={`${btn} bg-pasto text-white`}>{copiado ? "Link copiado" : "Copiar link"}</button>
                <a target="_blank" rel="noreferrer" className={`${btn} bg-panel-alto`}
                  href={wa(`Sumate al partido de ${etiqueta(p)} (${cuando(p)}) en DOPARTI: ${linkPartido}`)}>Enviar por WhatsApp</a>
              </div>
            </>
          ) : (
            <p className="text-sm text-tinta/70">Ahora lo ven solo tu comunidad y quienes inviten. Abrilo para que otras comunidades se sumen con un link.</p>
          )}
          {p.creado_por === userId && (
            <button onClick={alternarAbierto} className={`${btn} ${p.abierto ? "bg-panel-alto text-brasa" : "bg-pasto text-white"}`}>
              {p.abierto ? "Cerrar a otras comunidades" : "Abrir a otras comunidades"}
            </button>
          )}
        </section>
      )}

      <div className="grid gap-2 pt-2 sm:flex sm:flex-wrap">
        <button onClick={() => compartir(convocatoria(p, titulares.length))} className={`${btn} bg-pasto text-white`}>Compartir convocatoria</button>
        {!completo && <button onClick={() => compartir(faltanMsg(p, titulares.length))} className={`${btn} bg-panel`}>Avisar que faltan jugadores</button>}
        {p.equipos && <button onClick={() => compartir(equiposMsg(p, nombre))} className={`${btn} bg-pasto text-white`}>Compartir equipos</button>}
        <button onClick={cargar} className={`${btn} bg-panel`}>Actualizar</button>
        {p.creado_por === userId && <button onClick={eliminar} className={`${btn} bg-panel text-brasa`}>Eliminar partido</button>}
      </div>
      {aviso && <p role="status" className="text-sm font-semibold text-cesped">{aviso}</p>}
    </div>
  );
}
