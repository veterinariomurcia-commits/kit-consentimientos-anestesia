// Dibuja los logos de ejemplo neutros para las muestras.
// Uso: npm run logo-ejemplo
//
// - marca/logo-ejemplo.png (400 × 400): un círculo gris azulado con una huella blanca.
// - marca/logo-apaisado.png (1200 × 250): un rectángulo redondeado gris azulado con la huella
//   y tres barras blancas que imitan un texto. Sirve para la prueba de estrés (logo muy ancho).
// Ninguno lleva nombres. Se dibujan "a mano" (píxel a píxel) con lo que ya trae Node, sin instalar nada.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';

const SUBMUESTRAS = 4; // para suavizar los bordes (4 x 4 puntos por píxel)
const COLOR = { r: 0x4a, g: 0x63, b: 0x78 }; // gris azulado sobrio

/** Una forma dice si un punto (en píxeles) está dentro de ella. */
type Forma = (x: number, y: number) => boolean;

function elipse(cx: number, cy: number, rx: number, ry: number, giro = 0): Forma {
  const cos = Math.cos(giro);
  const sin = Math.sin(giro);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;
    return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
  };
}

function rectanguloRedondeado(x0: number, y0: number, ancho: number, alto: number, radio: number): Forma {
  return (x, y) => {
    if (x < x0 || x > x0 + ancho || y < y0 || y > y0 + alto) return false;
    const cx = Math.min(Math.max(x, x0 + radio), x0 + ancho - radio);
    const cy = Math.min(Math.max(y, y0 + radio), y0 + alto - radio);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radio * radio;
  };
}

/** Huella centrada en (cx, cy) y de "tamaño" t (el diámetro del círculo que la rodearía). */
function huella(cx: number, cy: number, t: number): Forma[] {
  const p = (dx: number, dy: number, rx: number, ry: number, giro: number) =>
    elipse(cx + dx * t, cy + dy * t, rx * t, ry * t, giro);
  return [
    p(0, 0.12, 0.17, 0.14, 0), // almohadilla grande
    p(-0.21, -0.07, 0.065, 0.085, -0.35), // dedos
    p(-0.09, -0.17, 0.07, 0.09, -0.12),
    p(0.09, -0.17, 0.07, 0.09, 0.12),
    p(0.21, -0.07, 0.065, 0.085, 0.35),
  ];
}

/** Dibuja el fondo en el color y lo blanco encima; fuera del fondo, transparente. */
function dibujarPng(ancho: number, alto: number, fondo: Forma, blancos: Forma[]): Buffer {
  // Cada fila del PNG empieza con un byte de "filtro" (0 = ninguno) y sigue con R, G, B, A.
  const filas = Buffer.alloc(alto * (1 + ancho * 4));
  for (let py = 0; py < alto; py++) {
    const inicioFila = py * (1 + ancho * 4);
    filas[inicioFila] = 0;
    for (let px = 0; px < ancho; px++) {
      let enFondo = 0;
      let enBlanco = 0;
      for (let sy = 0; sy < SUBMUESTRAS; sy++) {
        for (let sx = 0; sx < SUBMUESTRAS; sx++) {
          const x = px + (sx + 0.5) / SUBMUESTRAS;
          const y = py + (sy + 0.5) / SUBMUESTRAS;
          if (fondo(x, y)) {
            enFondo++;
            if (blancos.some((f) => f(x, y))) enBlanco++;
          }
        }
      }
      const opacidad = enFondo / (SUBMUESTRAS * SUBMUESTRAS);
      const blanco = enFondo > 0 ? enBlanco / enFondo : 0;
      const i = inicioFila + 1 + px * 4;
      filas[i] = Math.round(COLOR.r + (255 - COLOR.r) * blanco);
      filas[i + 1] = Math.round(COLOR.g + (255 - COLOR.g) * blanco);
      filas[i + 2] = Math.round(COLOR.b + (255 - COLOR.b) * blanco);
      filas[i + 3] = Math.round(255 * opacidad);
    }
  }

  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0);
  cabecera.writeUInt32BE(alto, 4);
  cabecera[8] = 8; // 8 bits por canal
  cabecera[9] = 6; // color RGBA (con transparencia)

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloquePng('IHDR', cabecera),
    bloquePng('IDAT', deflateSync(filas, { level: 9 })),
    bloquePng('IEND', Buffer.alloc(0)),
  ]);
}

function bloquePng(tipo: string, datos: Buffer): Buffer {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const tipoYDatos = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const control = Buffer.alloc(4);
  control.writeUInt32BE(crc32(tipoYDatos));
  return Buffer.concat([longitud, tipoYDatos, control]);
}

const carpetaMarca = fileURLToPath(new URL('../marca/', import.meta.url));
mkdirSync(carpetaMarca, { recursive: true });

function guardar(nombre: string, png: Buffer): void {
  writeFileSync(`${carpetaMarca}${nombre}`, png);
  console.log(`Logo creado: ${carpetaMarca}${nombre} (${png.length} bytes)`);
}

// Logo cuadrado.
guardar('logo-ejemplo.png', dibujarPng(400, 400, elipse(200, 200, 192, 192), huella(200, 200, 400)));

// Logo apaisado (prueba de estrés).
guardar(
  'logo-apaisado.png',
  dibujarPng(1200, 250, rectanguloRedondeado(0, 0, 1200, 250, 40), [
    ...huella(140, 125, 230),
    rectanguloRedondeado(290, 60, 820, 42, 21),
    rectanguloRedondeado(290, 128, 600, 26, 13),
    rectanguloRedondeado(290, 176, 460, 26, 13),
  ]),
);
