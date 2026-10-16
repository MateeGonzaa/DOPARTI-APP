import { useEffect, useRef, useState } from 'react';
import { btn } from './ui';
import { Carta } from './CartasTruco';
import { aplicar, crearJuego, etiquetaEnvido, opciones, pendiente, textoCanto } from './lib/truco';
import { DIFICULTADES, ejecutarBot } from './lib/trucoBot';

export default function TrucoPractica({ onVolver }) {
  const [dificultad,setDificultad] = useState('retro');
  const [meta,setMeta] = useState(15);
  const [juego,setJuego] = useState(null);
  const [error,setError] = useState('');
  const [pensando,setPensando] = useState(false);
  const ultimo = useRef(null);
  useEffect(() => {
    if (!juego || juego.ganador !== null || pendiente(juego) !== 1) return;
    setPensando(true);
    const timer = setTimeout(() => {
      setJuego(actual => {
        if (!actual || actual.ganador !== null || pendiente(actual) !== 1) return actual;
        const r = ejecutarBot(actual,dificultad);
        if (!r.ok) { setError(r.error); return actual; }
        return r.estado;
      });
      setPensando(false);
    }, dificultad === 'noob' ? 500 : 850);
    return () => { clearTimeout(timer); setPensando(false); };
  },[juego,dificultad]);
  function jugar(tipo,idx) {
    if (!juego || juego.ganador !== null || pendiente(juego) !== 0 || pensando) return;
    const r = aplicar(juego,{tipo,idx,j:0});
    if (!r.ok) setError(r.error);
    else {setError('');setJuego(r.estado);}
  }
  const o = juego ? opciones(juego,0) : null;
  const opcionesCanto = o?.envido ?? [];
  return <section className="space-y-5">
    <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-extrabold">🃏 Practicar Truco</h2><button className="font-semibold text-cesped" onClick={onVolver}>Volver</button></div>
    {!juego ? <div className="space-y-4 rounded-2xl bg-panel p-4">
      <h3 className="font-extrabold">Elegí tu rival</h3>
      <div className="grid gap-2 sm:grid-cols-2">{DIFICULTADES.map(d => <button key={d.id} aria-pressed={dificultad===d.id} onClick={()=>setDificultad(d.id)} className={`${btn} flex flex-col items-start gap-1 ${dificultad===d.id?'bg-pasto text-white':'bg-panel-alto'}`}><strong>{d.nombre}</strong><span className="text-sm">{d.descripcion}</span></button>)}</div>
      <div className="flex gap-2">{[15,30].map(n=><button key={n} onClick={()=>setMeta(n)} className={`${btn} ${meta===n?'bg-pasto text-white':'bg-panel-alto'}`}>A {n} puntos</button>)}</div>
      <button className={`${btn} bg-pasto text-white`} onClick={()=>{ultimo.current=null;setJuego(crearJuego(meta));setError('');}}>Empezar entrenamiento</button>
      <p className="text-sm text-tinta/70">Práctica individual sin conexión a una mesa ni cambios en el ranking.</p>
    </div> : <>
      <div className="flex items-center justify-between rounded-2xl bg-panel p-4"><div><strong>Bot {DIFICULTADES.find(d=>d.id===dificultad)?.nombre}</strong><p className="text-sm text-tinta/70">{pensando?'Pensando…':juego.ganador!==null?'Partida finalizada':pendiente(juego)===0?'Tu turno':'Turno del bot'}</p></div><div className="font-display text-2xl font-extrabold">{juego.puntos[0]} - {juego.puntos[1]}</div></div>
      <div className="space-y-4 rounded-2xl bg-panel p-4">
        <div className="text-center text-sm text-tinta/70">Mano {juego.numMano} · Baza {juego.ronda+1} · {juego.truco.nivel===0?'Sin truco': ['','Truco','Retruco','Vale cuatro'][juego.truco.nivel]}</div>
        <div className="flex min-h-28 justify-center gap-2">{juego.manos[1].map((_,i)=><Carta key={i} oculta chica />)}</div>
        <div className="grid grid-cols-2 gap-3 border-y border-tinta/10 py-4"><div className="space-y-2 text-center"><strong>Bot</strong><div className="flex justify-center gap-1">{juego.mesa[1].filter(Boolean).map((c,i)=><Carta key={i} c={c} chica />)}</div></div><div className="space-y-2 text-center"><strong>Vos</strong><div className="flex justify-center gap-1">{juego.mesa[0].filter(Boolean).map((c,i)=><Carta key={i} c={c} chica />)}</div></div></div>
        <div className="flex min-h-36 justify-center gap-2">{juego.manos[0].map((c,i)=><Carta key={`${juego.numMano}-${i}`} c={c} onClick={()=>jugar('carta',i)} deshabilitada={!o.carta||pensando} />)}</div>
        {juego.canto && <p className="text-center font-extrabold">{juego.canto.de===1?'El bot canta':'Cantaste'}: {textoCanto(juego)}</p>}
        <div className="flex flex-wrap justify-center gap-2">{o.quiero && <><button className={`${btn} bg-pasto text-white`} onClick={()=>jugar('quiero')}>Quiero</button><button className={`${btn} bg-panel-alto`} onClick={()=>jugar('no_quiero')}>No quiero</button></>}{o.truco && <button className={`${btn} bg-panel-alto`} onClick={()=>jugar('truco')}>{o.truco}</button>}{opcionesCanto.map(t=><button key={t} className={`${btn} bg-panel-alto`} onClick={()=>jugar(t)}>{etiquetaEnvido(t)}</button>)}{o.mazo && <button className={`${btn} bg-panel-alto`} onClick={()=>jugar('mazo')}>Ir al mazo</button>}</div>
      </div>
      {juego.resumen && <p className="rounded-2xl bg-panel p-3 text-sm">Última mano: {juego.resumen.ganador===0?'ganaste':'ganó el bot'} · {juego.resumen.razon} (+{juego.resumen.puntos})</p>}
      {juego.ganador!==null && <div className="space-y-3 rounded-2xl bg-panel p-4 text-center"><h3 className="text-xl font-extrabold">{juego.ganador===0?'🏆 ¡Ganaste!':'El bot ganó esta vez'}</h3><button className={`${btn} bg-pasto text-white`} onClick={()=>setJuego(crearJuego(meta))}>Revancha</button></div>}
      <button className={`${btn} bg-panel-alto`} onClick={()=>setJuego(null)}>Cambiar dificultad / Nueva partida</button>
      <div className="space-y-1 rounded-2xl bg-panel p-3"><h3 className="font-bold">Historial de jugadas</h3>{juego.log.slice(-7).reverse().map((l,i)=><p key={i} className="text-sm text-tinta/70">{l}</p>)}</div>
    </>}
    {error && <p role="alert" className="text-sm font-semibold text-brasa">{error}</p>}
  </section>;
}
