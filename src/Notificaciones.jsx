import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { btn, input, Cargando } from "./ui";
import { AJUSTABLES } from "./lib/notificaciones";

function Interruptor({ activo, onChange, titulo, detalle, deshabilitado = false }) {
  return (
    <label className={`flex items-start gap-3 rounded-lg bg-panel p-3 text-sm ${deshabilitado ? "opacity-60" : ""}`}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-pasto" checked={activo} disabled={deshabilitado}
        onChange={(e) => onChange(e.target.checked)} />
      <span>
        <b className="block">{titulo}</b>
        {detalle && <span className="text-tinta/70">{detalle}</span>}
      </span>
    </label>
  );
}

// Ajustes de avisos: email, WhatsApp (con verificación del número) y qué tipos recibir.
export default function Notificaciones({ userId, email, perfil, onVolver }) {
  const [pref, setPref] = useState(null);                    // null = cargando
  const [wa, setWa] = useState({ numero: "", verificado: false });
  const [numero, setNumero] = useState("");
  const [codigo, setCodigo] = useState("");
  const [esperandoCodigo, setEsperandoCodigo] = useState(false);
  const [msg, setMsg] = useState({ texto: "", error: false });
  const [ocupado, setOcupado] = useState(false);
  const primera = useRef(true);

  useEffect(() => {
    (async () => {
      const [p, w] = await Promise.all([
        supabase.from("notif_preferencias").select("email, whatsapp, tipos").eq("usuario_id", userId).maybeSingle(),
        supabase.rpc("mi_whatsapp"),
      ]);
      setPref(p.data ?? { email: true, whatsapp: false, tipos: {} });
      const fila = w.data?.[0];
      if (fila) { setWa(fila); setNumero(fila.numero); }
      else setNumero(perfil?.redes?.whatsapp ?? "");
    })();
  }, [userId]);

  // Se guarda solo cada vez que cambia una opción
  useEffect(() => {
    if (!pref) return;
    if (primera.current) { primera.current = false; return; }
    supabase.from("notif_preferencias")
      .upsert({ usuario_id: userId, email: pref.email, whatsapp: pref.whatsapp, tipos: pref.tipos, updated_at: new Date().toISOString() }, { onConflict: "usuario_id" })
      .then(({ error }) => error && setMsg({ texto: "No se pudo guardar el cambio. ¿Ya ejecutaste migracion7_notificaciones_y_truco.sql?", error: true }));
  }, [pref]);

  const decir = (texto, error = false) => setMsg({ texto, error });
  const llamar = async (cuerpo) => {
    const { data, error } = await supabase.functions.invoke("enviar-notificacion", { body: cuerpo });
    if (error) return { error: "No se pudo conectar con el servidor de avisos." };
    return data ?? { error: "Respuesta vacía del servidor." };
  };

  async function pedirCodigo() {
    setOcupado(true); decir("");
    const r = await llamar({ accion: "enviar_codigo", numero });
    setOcupado(false);
    if (r.error) return decir(r.error, true);
    setEsperandoCodigo(true);
    decir("Te mandamos un código por WhatsApp. Escribilo acá abajo (vence en 10 minutos).");
  }

  async function confirmar() {
    setOcupado(true); decir("");
    const r = await llamar({ accion: "confirmar_codigo", codigo });
    setOcupado(false);
    if (r.error) return decir(r.error, true);
    setWa({ numero: r.numero, verificado: true });
    setPref((p) => ({ ...p, whatsapp: true }));
    setEsperandoCodigo(false); setCodigo("");
    decir("¡Listo! Tu WhatsApp quedó vinculado.");
  }

  async function desvincular() {
    if (!window.confirm("¿Dejar de recibir avisos por WhatsApp?")) return;
    await supabase.rpc("quitar_whatsapp");
    setWa({ numero: "", verificado: false });
    setPref((p) => ({ ...p, whatsapp: false }));
    setEsperandoCodigo(false);
    decir("Desvinculamos tu WhatsApp.");
  }

  async function probar() {
    const { data } = await supabase.rpc("probar_notificacion");
    decir(data ? "Te mandamos un aviso de prueba. Mirá tu email, tu WhatsApp y la sección Actividad." : "Esperá un minuto para mandar otra prueba.", !data);
  }

  if (pref === null) return <Cargando texto="Cargando tus avisos…" />;
  const silenciado = (k) => pref.tipos?.[k] === false;
  const cambiarTipo = (k, on) => setPref({ ...pref, tipos: { ...pref.tipos, [k]: on } });

  return (
    <section className="space-y-5">
      <button onClick={onVolver} className="-ml-2 inline-flex min-h-11 items-center px-2 font-semibold text-cesped">Volver</button>
      <div>
        <h2 className="text-3xl font-extrabold">Notificaciones</h2>
        <p className="text-tinta/70">Elegí por dónde y qué avisos querés recibir. Los avisos también aparecen siempre en Actividad.</p>
      </div>

      <div className="space-y-3 rounded-2xl bg-panel p-4">
        <h3 className="font-extrabold">📧 Email</h3>
        <Interruptor activo={pref.email} onChange={(v) => setPref({ ...pref, email: v })}
          titulo="Recibir avisos por email" detalle={email ? `Los mandamos a ${email}.` : "Los mandamos al email de tu cuenta."} />
      </div>

      <div className="space-y-3 rounded-2xl bg-panel p-4">
        <h3 className="font-extrabold">💬 WhatsApp</h3>
        {wa.verificado ? (
          <>
            <Interruptor activo={pref.whatsapp} onChange={(v) => setPref({ ...pref, whatsapp: v })}
              titulo="Recibir avisos por WhatsApp" detalle={`Número vinculado: +${wa.numero}`} />
            <button onClick={desvincular} className={`${btn} bg-panel-alto text-brasa`}>Desvincular este número</button>
          </>
        ) : (
          <>
            <p className="text-sm text-tinta/70">Vinculá tu número para recibir los avisos importantes (invitaciones, recordatorios, mensajes). Te mandamos un código para confirmar que es tuyo. Este número no se muestra en tu perfil.</p>
            <label className="block text-sm font-semibold">Número con código de país, solo números
              <input className={input} inputMode="tel" autoComplete="tel" placeholder="Ej: 5491155551234" value={numero} onChange={(e) => setNumero(e.target.value)} />
            </label>
            <button disabled={ocupado || numero.replace(/\D/g, "").length < 8} onClick={pedirCodigo} className={`${btn} bg-pasto text-white disabled:opacity-40`}>
              {esperandoCodigo ? "Enviar otro código" : "Enviarme un código"}
            </button>
            {esperandoCodigo && (
              <div className="flex gap-2">
                <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Código de 6 dígitos" placeholder="Código de 6 dígitos"
                  value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
                <button disabled={ocupado || codigo.length !== 6} onClick={confirmar} className={`${btn} shrink-0 bg-naranja text-white disabled:opacity-40`}>Confirmar</button>
              </div>
            )}
          </>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-extrabold">Qué avisos querés recibir</legend>
        <p className="text-sm text-tinta/70">Los que apagues dejan de llegar por email y WhatsApp.</p>
        {AJUSTABLES.map(([k, etiqueta, icono]) => (
          <Interruptor key={k} activo={!silenciado(k)} onChange={(on) => cambiarTipo(k, on)} titulo={`${icono} ${etiqueta}`} />
        ))}
      </fieldset>

      <div className="space-y-2">
        <button onClick={probar} className={`${btn} bg-panel-alto`}>Enviarme un aviso de prueba</button>
        {msg.texto && <p role={msg.error ? "alert" : "status"} className={`text-sm font-semibold ${msg.error ? "text-brasa" : "text-cesped"}`}>{msg.texto}</p>}
      </div>
    </section>
  );
}
