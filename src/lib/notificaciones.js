// src/lib/notificaciones.js
// Tipos de aviso de DOPARTI: ícono para la lista de Actividad y descripción para los ajustes.
export const TIPOS = {
  comentario: { icono: "💬", etiqueta: "Comentarios en tu perfil", texto: "comentó en tu perfil" },
  respuesta: { icono: "↩️", etiqueta: "Respuestas a tus comentarios", texto: "respondió tu comentario" },
  like: { icono: "❤️", etiqueta: "Me gusta", texto: "le dio ❤️ a tu comentario", soloApp: true },
  amistad_solicitud: { icono: "🤝", etiqueta: "Solicitudes de amistad" },
  amistad_aceptada: { icono: "🎉", etiqueta: "Amistades aceptadas" },
  invitacion: { icono: "📩", etiqueta: "Invitaciones a partidos" },
  partido_nuevo: { icono: "📅", etiqueta: "Partidos nuevos en tus comunidades" },
  recordatorio: { icono: "⏰", etiqueta: "Recordatorio 2 horas antes de tu partido" },
  mensaje: { icono: "✉️", etiqueta: "Mensajes privados" },
  truco_rival: { icono: "🃏", etiqueta: "Rival sentado en tu mesa de Truco" },
  truco_fin: { icono: "🏁", etiqueta: "Fin de tus partidas de Truco", soloApp: true },
  comunidad_nuevo_miembro: { icono: "👥", etiqueta: "Miembros nuevos en tus comunidades", soloApp: true },
  sistema: { icono: "🔔", etiqueta: "Avisos de DOPARTI", soloApp: true },
};

// Los que se pueden silenciar desde los ajustes (los "soloApp" nunca salen por email ni WhatsApp)
export const AJUSTABLES = Object.entries(TIPOS).filter(([, t]) => !t.soloApp).map(([k, t]) => [k, t.etiqueta, t.icono]);
