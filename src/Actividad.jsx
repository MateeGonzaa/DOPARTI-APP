import React, { useState, useEffect } from 'react';
import supabase from './lib/supabase';
import { useParams } from 'react-router-dom';

export default function Actividad() {
    const { actividadId } = useParams();
    const [historial, setHistorial] = useState([]);
    const APP_URL = window.location.origin;

    useEffect(() => {
        cargarHistorial();
    }, [actividadId]);

    const cargarHistorial = async () => {
        const { data } = await supabase
            .from('activity_history')
            .select(`action, created_at, perfiles(nombre)`)
            .eq('activity_id', actividadId)
            .order('created_at', { ascending: false });
        setHistorial(data || []);
    };

    const compartirConvocatoria = () => {
        const linkInvitacion = `${APP_URL}/actividad/${actividadId}/unirse`;
        const mensaje = `¡Faltan jugadores! Únete a nuestra partida aquí: ${linkInvitacion}`;
        
        if (navigator.share) {
            navigator.share({ title: 'Faltan jugadores', text: mensaje, url: linkInvitacion });
        } else {
            navigator.clipboard.writeText(mensaje);
            alert('Link copiado al portapapeles');
        }
    };

    return (
        <div className="p-4">
            {/* Mantén todo tu contenido actual de detalles de la actividad aquí */}
            
            <button onClick={compartirConvocatoria} className="bg-blue-500 text-white px-4 py-2 rounded mb-4 w-full">
                Compartir convocatoria (Faltan jugadores)
            </button>

            <div className="mt-6 border-t pt-4">
                <h3 className="font-bold text-lg mb-2">Registro de Actividad</h3>
                <ul className="text-sm text-gray-600">
                    {historial.map((log, index) => (
                        <li key={index} className="mb-1">
                            {log.action === 'joined' ? '🟢' : '🔴'} 
                            <strong> {log.perfiles.nombre}</strong> {log.action === 'joined' ? 'se sumó' : 'se bajó'} 
                            {' '}({new Date(log.created_at).toLocaleTimeString()})
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
