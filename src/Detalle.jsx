import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import { cupo, cuando, sortear } from "./lib/logica";
import Mapa from "./Mapa";
import { convocatoria, equiposMsg, faltanMsg } from "./lib/mensajes";

function Equipo({ nombre, color, ids, quien }) {
  return (
    <div className={`equipo-entra rounded-2xl p-4 text-white ${color}`}>
      <h4 className="mb-2 text-lg font-extrabold">{nombre}</h4>
      <ul className="space-y-1">{ids.map((id) => <li key={id}>{quien(id)?.apodo}</li>)}</ul>
    </div>
  );
}

export default function Detalle({ id, userId, onVolver }) {
  const [p, setP] = useState(null);

  const cargar = async () => {
    const { data } = await supabase
      .from("partidos")
      .select("*, inscripciones(id, usuario_id, created_at, profiles(apodo, avatar_url))")
      .eq("id", id)
      .single();
    if (data) data.inscripciones.sort((a, b) => a.created_at.localeCompare(b.created_at));
    setP(data);
  };
  useEffect(() => { cargar(); }, [id]);
  if (!p) return <Cargando texto="Cargando partido…" />;

  const ins = p.inscripciones;
  const titulares = ins.slice(0, cupo(p));
  const suplentes = ins.slice(cupo(p));
  const completo = titulares.length === cupo(p);
  const yo = ins.find((i) => i.usuario_id === userId);
  const quien = (uid) => ins.find((i) => i.usuario_id === uid)?.profiles;
  const guardarEquipos = (equipos) => supabase.from("partidos").update({ equipos }).eq("id", p.id);

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
    await supabase.from("inscripciones").delete().eq("id", yo.id);
    if (p.equipos && idx < cupo(p)) {
      const sup = ins[cupo(p)];
      const cambiar = (l) => l.map((x) => (x === userId ? sup.usuario_id : x));
      await guardarEquipos(sup ? { A: cambiar(p.equipos.A), B: cambiar(p.equipos.B) } : null);
    }
    cargar();
  }

  async function eliminar() {
    await supabase.from("partidos").delete().eq("id", p.id);
    onVolver();
  }

  const linkMapa = p.sede_lat != null ? `https://www.google.com/maps/search/?api=1&query=${p.sede_lat},${p.sede_lng}` : "";
  const wa = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;
  const nombre = (uid) => quien(uid)?.apodo ?? "?";
  const Fila = ({ i, n }) => (
    <li className="flex items-center justify-between rounded-lg bg-panel px-3 py-2">
      <span className="flex items-center gap-2"><Avatar perfil={i.profiles} size={28} />{n}. {i.profiles?.apodo}</span>
    </li>
  );

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <header>
        <h2 className="text-3xl font-extrabold">Fútbol {p.tipo}</h2>
        <p className="capitalize">{cuando(p)}</p>
        <p>{p.sede}{p.sede_direccion && ` — ${p.sede_direccion}`}</p>
      </header>

      {p.sede_lat != null && (
        <div className="space-y-2">
          <Mapa lat={p.sede_lat} lng={p.sede_lng} nombre={p.sede} />
          <a href={linkMapa} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cesped">Abrir en Google Maps</a>
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

      {p.equipos && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold">Equipos</h3>
            {p.creado_por === userId && (
              <button onClick={async () => { await guardarEquipos(sortear(titulares.map((i) => i.usuario_id), p.tipo)); cargar(); }} className="text-sm font-semibold text-cesped">Volver a sortear</button>
            )}
          </div>
          <div key={JSON.stringify(p.equipos)} className="grid gap-3 sm:grid-cols-2">
            <Equipo nombre="Pechera naranja" color="bg-naranja" ids={p.equipos.A} quien={quien} />
            <Equipo nombre="Pechera celeste" color="bg-celeste" ids={p.equipos.B} quien={quien} />
          </div>
        </section>
      )}

      <div className="grid gap-2 pt-2 sm:flex sm:flex-wrap">
        <a href={wa(convocatoria(p, titulares.length))} target="_blank" rel="noreferrer" className={`${btn} bg-pasto text-white`}>Compartir convocatoria</a>
        {!completo && <a href={wa(faltanMsg(p, titulares.length))} target="_blank" rel="noreferrer" className={`${btn} bg-panel`}>Avisar que faltan jugadores</a>}
        {p.equipos && <a href={wa(equiposMsg(p, nombre))} target="_blank" rel="noreferrer" className={`${btn} bg-pasto text-white`}>Compartir equipos</a>}
        <button onClick={cargar} className={`${btn} bg-panel`}>Actualizar</button>
        {p.creado_por === userId && <button onClick={eliminar} className={`${btn} bg-panel text-brasa`}>Eliminar partido</button>}
      </div>
    </div>
  );
}
