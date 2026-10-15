export const cupo = (p) => p.tipo * 2;

export function sortear(ids, tipo) {
  const a = ids.slice(0, tipo * 2);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { A: a.slice(0, tipo), B: a.slice(tipo) };
}

export const cuando = (p) =>
  new Date(`${p.fecha}T${p.hora}`).toLocaleString("es-AR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
