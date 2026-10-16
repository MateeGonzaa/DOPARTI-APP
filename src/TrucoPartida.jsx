import React, { useState, useEffect } from 'react';
import supabase from './lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';

export default function TrucoPartida() {
    const { partidaId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('playing');
    const [lastTurnTime, setLastTurnTime] = useState(Date.now());
    const TOLERANCIA_MINUTOS = 3;

    useEffect(() => {
        const channel = supabase.channel(`partida_truco_${partidaId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas_virtuales', filter: `id=eq.${partidaId}` }, (payload) => {
                if (payload.new.status === 'cancelled') {
                    setStatus('cancelled');
                    alert('El rival abandonó o se agotó el tiempo.');
                    navigate('/explorar');
                } else {
                    setLastTurnTime(new Date(payload.new.last_turn_time).getTime());
                    // Aquí mantienes el resto de tu lógica actual de cartas
                }
            }).subscribe();

        return () => supabase.removeChannel(channel);
    }, [partidaId, navigate]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (status === 'playing' && (Date.now() - lastTurnTime) > (TOLERANCIA_MINUTOS * 60 * 1000)) {
                cancelarPartida('Tiempo de tolerancia excedido');
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [lastTurnTime, status]);

    const cancelarPartida = async (razon = 'Cancelada por usuario') => {
        await supabase.from('partidas_virtuales').update({ status: 'cancelled' }).eq('id', partidaId);
        navigate('/explorar');
    };

    return (
        <div className="flex flex-col items-center">
            {/* Mantén todo tu renderizado visual actual del tablero de Truco aquí */}
            
            <button onClick={() => cancelarPartida()} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">
                Cancelar Partida / Abandonar
            </button>
        </div>
    );
}
