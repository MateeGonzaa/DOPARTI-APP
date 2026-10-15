// Nombres de canal de la tabla `mensajes` (ver supabase/etapa7_truco_chat_esports.sql)
export const canalDm = (a, b) => `dm:${[a, b].sort().join("_")}`;
export const canalComunidad = (id) => `com:${id}`;
export const canalTruco = (id) => `truco:${id}`;
