// Dibujo de la baraja española en SVG, con la estética de las cartas de truco argentinas
// (papel color hueso, trazo oscuro y colores planos: turquesa, rojo, verde, amarillo).
// Todo se genera en código, sin imágenes. Cada carta es una cadena SVG de 100 x 150 que se guarda en caché.
// Nunca se mezcla con texto de usuarios: solo recibe número y palo.

const C = {
  papel: "#f4eedb", borde: "#b9ae92", tinta: "#2a211c",
  rojo: "#c9423b", turq: "#1f9fb0", verde: "#3f9d2e", amar: "#f4c430",
  naranja: "#e8892b", piel: "#f1c7a0", marron: "#8b5a2b", blanco: "#fffaf0", claro: "#bfeaf0",
};
const ST = `stroke="${C.tinta}" stroke-width="0.7" stroke-linejoin="round" stroke-linecap="round"`;
const g = (t, inner) => `<g transform="${t}">${inner}</g>`;

// ---------- Piezas (centradas en 0,0, unas 40 de alto) ----------
function hoja(x, y, rot, fill) {
  return `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0,0 C2,-3.2 5.5,-3.2 7,0 C5.5,3.2 2,3.2 0,0Z" fill="${fill}" ${ST}/>`;
}

function espada() {
  return `
  <polygon points="0,-23 3.2,-18 3.2,3 -3.2,3 -3.2,-18" fill="${C.turq}" ${ST}/>
  <line x1="0" y1="-18" x2="0" y2="2" stroke="${C.claro}" stroke-width="0.9"/>
  <rect x="-7.5" y="3" width="15" height="3.2" rx="1.6" fill="${C.amar}" ${ST}/>
  <circle cx="-7.5" cy="4.6" r="1.9" fill="${C.rojo}" ${ST}/><circle cx="7.5" cy="4.6" r="1.9" fill="${C.rojo}" ${ST}/>
  <rect x="-1.7" y="6.2" width="3.4" height="7" fill="${C.rojo}" ${ST}/>
  <rect x="-2.3" y="9" width="4.6" height="1.8" fill="${C.verde}" ${ST}/>
  <ellipse cx="0" cy="15.6" rx="3.4" ry="3.8" fill="${C.rojo}" ${ST}/>`;
}

function basto(hojas = true) {
  return `
  <path d="M-4.6,-19 C-9.5,-19 -10,-11 -7,-4 L-4.6,16 Q0,19.5 4.6,16 L7,-4 C10,-11 9.5,-19 4.6,-19 Q0,-21.5 -4.6,-19Z" fill="${C.verde}" ${ST}/>
  <ellipse cx="0" cy="-19.4" rx="4.8" ry="2.2" fill="${C.amar}" ${ST}/><ellipse cx="0" cy="-19.4" rx="2.2" ry="0.9" fill="${C.naranja}"/>
  <ellipse cx="0" cy="17" rx="4.4" ry="2" fill="${C.rojo}" ${ST}/>
  <path d="M-4,-12 q3,1.5 6,0 M-2,-4 q3,1.5 6,0 M-4,5 q3,1.5 6,0 M-1,11 q3,1 5,0" stroke="#2b7120" stroke-width="0.9" fill="none"/>
  <ellipse cx="3" cy="-1" rx="1.6" ry="1" fill="${C.rojo}" ${ST}/>
  ${hojas ? `<path d="M6,-6 q5,-1 8,-6 M-6,5 q-5,0 -8,-4" stroke="${C.tinta}" stroke-width="0.8" fill="none"/>` + hoja(13, -12, -45, C.rojo) + hoja(14, -9, 20, C.turq) + hoja(-14, 1, 215, C.amar) : ""}`;
}

function oro(r = 11) {
  const puntos = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<circle cx="${(Math.cos(a) * r * 0.85).toFixed(2)}" cy="${(Math.sin(a) * r * 0.85).toFixed(2)}" r="${(r * 0.07).toFixed(2)}" fill="${C.naranja}"/>`;
  }).join("");
  const petalos = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return `<circle cx="${(Math.cos(a) * r * 0.2).toFixed(2)}" cy="${(Math.sin(a) * r * 0.2).toFixed(2)}" r="${(r * 0.13).toFixed(2)}" fill="${C.rojo}" ${ST}/>`;
  }).join("");
  return `
  <circle r="${r}" fill="${C.amar}" ${ST}/>
  <circle r="${(r * 0.72).toFixed(2)}" fill="#f9de7e" stroke="${C.naranja}" stroke-width="0.8"/>
  ${puntos}${petalos}
  <circle r="${(r * 0.1).toFixed(2)}" fill="${C.verde}" ${ST}/>`;
}

function copa() {
  return `
  <path d="M-10,-12 L10,-12 C10.5,0 5.5,8 0,8 C-5.5,8 -10.5,0 -10,-12Z" fill="${C.rojo}" ${ST}/>
  <path d="M-7.5,-6 Q0,-2.5 7.5,-6" stroke="${C.amar}" stroke-width="1.2" fill="none"/>
  <rect x="-11.5" y="-14.5" width="23" height="3.6" rx="1.8" fill="${C.amar}" ${ST}/>
  <path d="M-2,8 L2,8 L1.3,15 L-1.3,15Z" fill="${C.amar}" ${ST}/>
  <ellipse cx="0" cy="11.4" rx="3.4" ry="1.7" fill="${C.verde}" ${ST}/>
  <ellipse cx="0" cy="16.4" rx="8.5" ry="2.3" fill="${C.amar}" ${ST}/>`;
}

const PIEZA = { E: espada, B: basto, O: () => oro(11), C: copa };

// ---------- Distribución de los números 2 a 7 ----------
const POS = {
  2: [[50, 46], [50, 106]],
  3: [[50, 40], [50, 76], [50, 112]],
  4: [[33, 50], [67, 50], [33, 102], [67, 102]],
  5: [[33, 46], [67, 46], [50, 76], [33, 106], [67, 106]],
  6: [[33, 42], [67, 42], [33, 76], [67, 76], [33, 110], [67, 110]],
  7: [[33, 38], [67, 38], [50, 57], [33, 76], [67, 76], [33, 114], [67, 114]],
};
const ESC_ALTO = { 2: 1.1, 3: 0.82, 4: 0.84, 5: 0.76, 6: 0.72, 7: 0.62 };   // espadas y bastos (son largos)
const ESC_REDONDO = { 2: 1.25, 3: 1.05, 4: 1.05, 5: 0.98, 6: 0.92, 7: 0.86 }; // oros y copas

function numeros(n, p) {
  const largos = p === "E" || p === "B";
  const esc = (largos ? ESC_ALTO : ESC_REDONDO)[n];
  const pieza = PIEZA[p]();
  return POS[n].map(([x, y], i) => {
    const giro = largos ? (n === 2 ? (i ? 28 : -28) : i % 2 ? 14 : -14) : 0;
    return g(`translate(${x} ${y}) rotate(${giro}) scale(${esc})`, pieza);
  }).join("");
}

// ---------- Los ases, más grandes y adornados ----------
function as(p) {
  if (p === "E") {
    return `
    <path d="M72,28 C30,52 26,98 48,130" stroke="${C.rojo}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M72,28 C30,52 26,98 48,130" stroke="${C.amar}" stroke-width="1.2" fill="none"/>
    <circle cx="73" cy="27" r="3.6" fill="${C.verde}" ${ST}/><circle cx="50" cy="130" r="3.4" fill="${C.verde}" ${ST}/>
    ${g("translate(52 76) rotate(-40) scale(2.45)", espada() +
      `<g fill="${C.rojo}"><circle cx="0" cy="-12" r="0.9"/><circle cx="0" cy="-7" r="0.9"/><circle cx="0" cy="-2" r="0.9"/></g>`)}`;
  }
  if (p === "B") {
    return `
    ${g("translate(50 76) rotate(-24) scale(2.6)", basto(false))}
    ${hoja(66, 44, -50, C.rojo)}${hoja(70, 58, -20, C.turq)}${hoja(31, 60, 200, C.rojo)}${hoja(28, 78, 160, C.amar)}${hoja(66, 100, -30, C.amar)}${hoja(34, 108, 190, C.turq)}`;
  }
  if (p === "O") {
    const rayos = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const x1 = Math.cos(a) * 30, y1 = Math.sin(a) * 30, x2 = Math.cos(a) * 36, y2 = Math.sin(a) * 36;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.naranja}" stroke-width="2" stroke-linecap="round"/>`;
    }).join("");
    return `${g("translate(50 74)", rayos + oro(29))}
    <path d="M18,118 Q50,106 82,118 L78,128 Q50,118 22,128Z" fill="${C.rojo}" ${ST}/>`;
  }
  return `
  ${g("translate(50 72) scale(2.15)", copa())}
  ${hoja(20, 112, 200, C.verde)}${hoja(80, 112, -20, C.verde)}${hoja(22, 98, 150, C.amar)}${hoja(78, 98, 30, C.amar)}`;
}

// ---------- Figuras: sota (10), caballo (11) y rey (12) ----------
const TUNICA = { E: C.rojo, B: C.verde, O: C.naranja, C: C.turq };

function cara(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.piel}" ${ST}/>
  <circle cx="${cx - r * 0.35}" cy="${cy - 0.5}" r="0.9" fill="${C.tinta}"/><circle cx="${cx + r * 0.35}" cy="${cy - 0.5}" r="0.9" fill="${C.tinta}"/>
  <path d="M${cx - r * 0.3},${cy + r * 0.45} q${r * 0.3},${r * 0.25} ${r * 0.6},0" stroke="${C.tinta}" stroke-width="0.7" fill="none"/>`;
}

function sota(p) {
  const t = TUNICA[p];
  return `
  <path d="M28,128 L33,84 Q50,74 67,84 L72,128Z" fill="${t}" ${ST}/>
  <rect x="31" y="104" width="38" height="4" fill="${C.amar}" ${ST}/>
  <path d="M40,80 L50,92 L60,80Z" fill="${C.blanco}" ${ST}/>
  <path d="M33,84 L26,100 L33,104Z" fill="${t}" ${ST}/>
  ${cara(50, 66, 9.5)}
  <path d="M40,62 Q50,50 60,62 L60,56 Q50,44 40,56Z" fill="${C.marron}" ${ST}/>
  <path d="M38,56 Q50,40 62,56 Q50,52 38,56Z" fill="${p === "O" ? C.rojo : C.turq}" ${ST}/>
  <path d="M60,52 Q72,38 78,46 Q70,46 64,56Z" fill="${C.rojo}" ${ST}/>
  ${g("translate(78 92) rotate(18) scale(0.62)", PIEZA[p]())}`;
}

function caballo(p) {
  const t = TUNICA[p];
  return g("translate(3.2 8) scale(0.88)", `
  <path d="M14,118 Q10,100 16,94" stroke="${C.tinta}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M14,118 Q10,100 16,94" stroke="#5b3a1a" stroke-width="4.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="44" cy="102" rx="27" ry="14" fill="${C.marron}" ${ST}/>
  <path d="M62,96 L74,70 L88,76 L84,92 L72,106Z" fill="${C.marron}" ${ST}/>
  <path d="M74,70 L90,62 Q96,66 94,76 L88,78Z" fill="${C.marron}" ${ST}/>
  <circle cx="87" cy="68" r="1.1" fill="${C.tinta}"/>
  <path d="M72,69 Q64,72 62,86 Q68,78 74,76Z" fill="${C.tinta}" ${ST}/>
  <path d="M74,70 L74,62 L78,68Z" fill="${C.marron}" ${ST}/>
  <rect x="24" y="112" width="6" height="26" rx="2.5" fill="${C.marron}" ${ST}/><rect x="34" y="114" width="6" height="24" rx="2.5" fill="${C.marron}" ${ST}/>
  <rect x="52" y="114" width="6" height="24" rx="2.5" fill="${C.marron}" ${ST}/><rect x="62" y="110" width="6" height="28" rx="2.5" fill="${C.marron}" ${ST}/>
  <path d="M34,92 L66,92 L62,104 L38,104Z" fill="${C.rojo}" ${ST}/>
  <path d="M38,98 L38,64 Q48,56 58,64 L62,96Z" fill="${t}" ${ST}/>
  <rect x="38" y="84" width="22" height="3.5" fill="${C.amar}" ${ST}/>
  ${cara(48, 52, 8.5)}
  <path d="M38,50 Q48,32 58,50 Q48,44 38,50Z" fill="${C.rojo}" ${ST}/>
  <path d="M40,40 Q36,28 46,30" stroke="${C.amar}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${g("translate(26 76) rotate(-10) scale(0.7)", PIEZA[p]())}`);
}

function rey(p) {
  const t = TUNICA[p];
  return `
  <path d="M26,128 L31,82 Q50,72 69,82 L74,128Z" fill="${t}" ${ST}/>
  <path d="M31,84 Q50,98 69,84 Q50,76 31,84Z" fill="${C.blanco}" ${ST}/>
  <g fill="${C.tinta}"><circle cx="38" cy="86" r="1"/><circle cx="46" cy="90" r="1"/><circle cx="54" cy="90" r="1"/><circle cx="62" cy="86" r="1"/></g>
  <rect x="29" y="108" width="42" height="4" fill="${C.amar}" ${ST}/>
  ${cara(50, 64, 10)}
  <path d="M41,66 Q42,84 50,86 Q58,84 59,66 Q56,76 50,77 Q44,76 41,66Z" fill="${C.blanco}" ${ST}/>
  <path d="M39,54 L39,42 L45,48 L50,38 L55,48 L61,42 L61,54Z" fill="${C.amar}" ${ST}/>
  <circle cx="50" cy="38" r="1.9" fill="${C.rojo}" ${ST}/><circle cx="44.5" cy="51" r="1.4" fill="${C.rojo}"/><circle cx="55.5" cy="51" r="1.4" fill="${C.rojo}"/>
  <line x1="76" y1="62" x2="76" y2="118" stroke="${C.amar}" stroke-width="2.4" stroke-linecap="round"/>
  ${g("translate(76 52) scale(0.62)", PIEZA[p]())}`;
}

// ---------- Carta completa ----------
function marco(n) {
  const num = (t) => `<text x="12" y="21" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="12" fill="${C.tinta}">${t}</text>`;
  return `
  <rect x="0.6" y="0.6" width="98.8" height="148.8" rx="9" fill="${C.papel}" stroke="${C.borde}" stroke-width="1.2"/>
  <rect x="8" y="8" width="84" height="134" fill="none" stroke="${C.tinta}" stroke-width="0.8"/>
  ${num(n)}${g("rotate(180 50 75)", num(n))}`;
}

const cache = new Map();
export function svgCarta(n, p) {
  const k = `${n}${p}`;
  if (cache.has(k)) return cache.get(k);
  let centro;
  if (n === 1) centro = as(p);
  else if (n >= 2 && n <= 7) centro = numeros(n, p);
  else centro = (n === 10 ? sota : n === 11 ? caballo : rey)(p);
  // Los números 10, 11 y 12 muestran además el palo chico, abajo a la izquierda
  const marca = n === 10 || n === 12 ? g("translate(20 128) scale(0.42)", PIEZA[p]()) : "";
  const svg = marco(n) + centro + marca;
  cache.set(k, svg);
  return svg;
}

// Dorso: reja de rombos azul y roja con un medallón al centro
export function svgDorso() {
  let rombos = "";
  for (let y = 18; y <= 126; y += 12) {
    for (let x = 20; x <= 80; x += 12) {
      rombos += `<polygon points="${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}" fill="none" stroke="#e9dfc4" stroke-width="0.8"/>`;
      rombos += `<circle cx="${x + 6}" cy="${y + 6}" r="1.3" fill="${C.rojo}"/>`;
    }
  }
  return `
  <rect x="0.6" y="0.6" width="98.8" height="148.8" rx="9" fill="${C.papel}" stroke="${C.borde}" stroke-width="1.2"/>
  <rect x="7" y="7" width="86" height="136" rx="3" fill="#1e3a6e" stroke="${C.rojo}" stroke-width="2"/>
  ${rombos}
  <circle cx="50" cy="75" r="17" fill="${C.rojo}" stroke="#e9dfc4" stroke-width="1.6"/>
  <circle cx="50" cy="75" r="11" fill="#1e3a6e" stroke="${C.amar}" stroke-width="1.2"/>
  <polygon points="50,66 53,73 61,73 55,78 57,86 50,81 43,86 45,78 39,73 47,73" fill="${C.amar}"/>`;
}
