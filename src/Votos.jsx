import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// Votación "¿quién gana?". opciones: [{ id, label, color? }]. Los votos se actualizan en vivo.
export default function Votos({ objetivo, userId, opciones, cerrado = false, titulo = "¿Quién va a ganar?" }) {
  const [votos, setVotos] = useState(null);

  const cargar = async () => {
    const { data } = await supabase.from("votos").select("usuario_id, opcion").eq("objetivo", objetivo);
    setVotos(data ?? []);
  };
  useEffect(() => {
    cargar();
    const sub = supabase.channel(`votos:${objetivo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "votos", filter: `objetivo=eq.${objetivo}` }, cargar)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [objetivo]);

  if (!votos) return null;
  const total = votos.length;
  const mio = votos.find((v) => v.usuario_id === userId)?.opcion;

  async function votar(op) {
    if (cerrado) return;
    const previo = votos;
    if (mio === op) {
      setVotos(votos.filter((v) => v.usuario_id !== userId));
      const { error } = await supabase.from("votos").delete().eq("objetivo", objetivo).eq("usuario_id", userId);
      if (error) setVotos(previo);
      return;
    }
    setVotos([...votos.filter((v) => v.usuario_id !== userId), { usuario_id: userId, opcion: op }]);
    const { error } = await supabase.from("votos").upsert({ objetivo, usuario_id: userId, opcion: op });
    if (error) setVotos(previo);
  }

  return (
    <section className="space-y-2 rounded-2xl bg-panel p-4" aria-label={titulo}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-extrabold">{titulo}</h3>
        <span className="text-sm text-tinta/70">{total} {total === 1 ? "voto" : "votos"}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((o) => {
          const n = votos.filter((v) => v.opcion === o.id).length;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <button key={o.id} onClick={() => votar(o.id)} disabled={cerrado} aria-pressed={mio === o.id}
              className={`relative min-h-14 overflow-hidden rounded-lg border px-3 py-2 text-left ${mio === o.id ? "border-cesped" : "border-white/10"} bg-panel-alto`}>
              <span aria-hidden="true" style={{ width: `${pct}%` }} className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${o.color ?? "bg-pasto"} opacity-40`} />
              <span className="relative flex items-baseline justify-between gap-2">
                <span className="truncate font-semibold">{mio === o.id ? "✓ " : ""}{o.label}</span>
                <span className="shrink-0 font-display text-lg font-extrabold">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      {cerrado && <p className="text-sm text-tinta/70">La votación está cerrada.</p>}
    </section>
  );
}
