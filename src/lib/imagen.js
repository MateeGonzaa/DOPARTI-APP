// Recorta la foto a un cuadrado, la reduce a 512 px y la convierte a JPEG antes de subirla
// (las fotos del celular pesan varios MB). Si algo falla, devuelve el archivo original.
export async function redimensionar(archivo, lado = 512) {
  try {
    const img = await createImageBitmap(archivo);
    const corte = Math.min(img.width, img.height);
    const salida = Math.min(lado, corte);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = salida;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0f2118";
    ctx.fillRect(0, 0, salida, salida);
    ctx.drawImage(img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, salida, salida);
    return await new Promise((ok) => canvas.toBlob((b) => ok(b ?? archivo), "image/jpeg", 0.85));
  } catch {
    return archivo;
  }
}
