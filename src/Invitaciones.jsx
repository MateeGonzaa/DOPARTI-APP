import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, Avatar, Cargando } from "./ui";
import { cuando } from "./lib/logica";

export default function Invitaciones({ onVolver, onAbrirPartido, onCambio }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");

  const cargar = async () => {
    const { data } = await supabase.rpc("mis_invitaciones");
    setLista(data ?? []);
    onCambio?.();
  };
  useEffect(() => { cargar(); }, []);

  async function aceptar(inv) {
    setError("");
    const { data, error } = await supabase.rpc("aceptar_invitacion", { p_id: inv.id });
    if (error) return setError("No se pudo aceptar la invitación.");
    onCambio?.();
    onAbrirPartido(data ?? inv.partido_id);
  }
  async function rechazar(inv) {
    await supabase.from("invitaciones").delete().eq("id", inv.id);
    cargar();
  }

  return (
    <div className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <h2 className="text-3xl font-extrabold">Invitaciones</h2>
      {lista === null ? <Cargando texto="Cargando invitaciones…" /> : lista.length === 0 ? (
        <p className="text-tinta/70">No tenés invitaciones pendientes. Cuando un amigo te invite a un partido, aparece acá.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((inv) => (
            <li key={inv.id} className="space-y-3 rounded-2xl bg-panel p-4">
              <div className="flex items-center gap-3">
                <Avatar perfil={{ apodo: inv.de_apodo, avatar_url: inv.de_avatar }} size={40} />
                <p className="min-w-0"><b>{inv.de_apodo}</b> te invitó a jugar</p>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold">Fútbol {inv.tipo}</p>
                <p className="capitalize">{cuando(inv)}</p>
                <p className="text-sm text-tinta/70">{inv.sede} · {inv.comunidad}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => aceptar(inv)} className={`${btn} bg-pasto text-white`}>Aceptar y ver partido</button>
                <button onClick={() => rechazar(inv)} className={`${btn} bg-panel-alto text-brasa`}>Rechazar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm font-semibold text-brasa">{error}</p>}
    </div>
  );
}
