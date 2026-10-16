import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import supabase from './lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';

export default function AjedrezPartida() {
    const { partidaId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(new Chess());
    const [status, setStatus] = useState('playing');
    const [lastTurnTime, setLastTurnTime] = useState(Date.now());
    
    const TOLERANCIA_MINUTOS = 3;

    useEffect(() => {
        const channel = supabase.channel(`partida_ajedrez_${partidaId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas_virtuales', filter: `id=eq.${partidaId}` }, (payload) => {
                if (payload.new.status === 'cancelled') {
                    setStatus('cancelled');
                    alert('La partida ha sido cancelada.');
                    navigate('/explorar');
                } else if (payload.new.chess_fen) {
                    const newGame = new Chess(payload.new.chess_fen);
                    setGame(newGame);
                    setLastTurnTime(new Date(payload.new.last_turn_time).getTime());
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

    const onDrop = async (sourceSquare, targetSquare) => {
        try {
            const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
            if (move === null) return false;
            
            const newFen = game.fen();
            setGame(new Chess(newFen));
            setLastTurnTime(Date.now());

            await supabase.from('partidas_virtuales').update({ 
                chess_fen: newFen, 
                last_turn_time: new Date() 
            }).eq('id', partidaId);
            
            return true;
        } catch (e) {
            return false;
        }
    };

    const cancelarPartida = async (razon = 'Cancelada por el usuario') => {
        await supabase.from('partidas_virtuales').update({ status: 'cancelled' }).eq('id', partidaId);
        setStatus('cancelled');
        alert(`Partida cancelada: ${razon}`);
        navigate('/explorar');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h2 className="text-2xl font-bold mb-4">Ajedrez Virtual</h2>
            <div className="w-full max-w-md bg-white p-4 rounded shadow">
                <Chessboard position={game.fen()} onPieceDrop={onDrop} />
            </div>
            <div className="mt-6 space-x-4">
                <button onClick={() => cancelarPartida()} className="bg-red-500 text-white px-4 py-2 rounded">
                    Cancelar Partida
                </button>
            </div>
        </div>
    );
}
