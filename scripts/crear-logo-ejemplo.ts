// Dibuja el logo de ejemplo neutro (marca/logo-ejemplo.png) para las muestras.
// Uso: npm run logo-ejemplo
//
// Es un círculo gris azulado con una huella blanca, sin ningún nombre.
// Se dibuja "a mano" (píxel a píxel) con lo que ya trae Node, sin instalar nada.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';

const TAMANO = 400; // píxeles de ancho y alto
const SUBMUESTRAS = 4; // para suavizar los bordes (4 x 4 puntos por píxel)
const COLOR = { r: 0x4a, g: 0x63, b: 0x78 }; // gris azulado sobrio

type Elipse = { cx: number; cy: number; rx: number; ry: number; giro: number };

// Medidas en una escala de 0 a 1 (0,5 es el centro del dibujo).
const circulo: Elipse = { cx: 0.5, cy: 0.5, rx: 0.48, ry: 0.48, giro: 0 };
const huella: Elipse[] = [
  { cx: 0.5, cy: 0.62, rx: 0.17, ry: 0.14, giro: 0 }, // almohadilla grande
  { cx: 0.29, cy: 0.43, rx: 0.065, ry: 0.085, giro: -0.35 }, // dedos
  { cx: 0.41, cy: 0.33, rx: 0.07, ry: 0.09, giro: -0.12 },
  { cx: 0.59, cy: 0.33, rx: 0.07, ry: 0.09, giro: 0.12 },
  { cx: 0.71, cy: 0.43, rx: 0.065, ry: 0.085, giro: 0.35 },
];

function dentro(e: Elipse, x: number, y: number): boolean {
  const dx = x - e.cx;
  const dy = y - e.cy;
  const cos = Math.cos(e.giro);
  const sin = Math.sin(e.giro);
  const u = dx * cos + dy * sin;
  const v = -dx * sin + dy * cos;
  return (u * u) / (e.rx * e.rx) + (v * v) / (e.ry * e.ry) <= 1;
}

// Cada fila del PNG empieza con un byte de "filtro" (0 = ninguno) y sigue con R, G, B, A.
const filas = Buffer.alloc(TAMANO * (1 + TAMANO * 4));
for (let py = 0; py < TAMANO; py++) {
  const inicioFila = py * (1 + TAMANO * 4);
  filas[inicioFila] = 0;
  for (let px = 0; px < TAMANO; px++) {
    let enCirculo = 0;
    let enHuella = 0;
    for (let sy = 0; sy < SUBMUESTRAS; sy++) {
      for (let sx = 0; sx < SUBMUESTRAS; sx++) {
        const x = (px + (sx + 0.5) / SUBMUESTRAS) / TAMANO;
        const y = (py + (sy + 0.5) / SUBMUESTRAS) / TAMANO;
        if (dentro(circulo, x, y)) {
          enCirculo++;
          if (huella.some((e) => dentro(e, x, y))) enHuella++;
        }
      }
    }
    const total = SUBMUESTRAS * SUBMUESTRAS;
    const opacidad = enCirculo / total;
    const blanco = enCirculo > 0 ? enHuella / enCirculo : 0;
    const i = inicioFila + 1 + px * 4;
    filas[i] = Math.round(COLOR.r + (255 - COLOR.r) * blanco);
    filas[i + 1] = Math.round(COLOR.g + (255 - COLOR.g) * blanco);
    filas[i + 2] = Math.round(COLOR.b + (255 - COLOR.b) * blanco);
    filas[i + 3] = Math.round(255 * opacidad);
  }
}

function bloquePng(tipo: string, datos: Buffer): Buffer {
  const longitud = Buffer.alloc(4);
  longitud.writeUInt32BE(datos.length);
  const tipoYDatos = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const control = Buffer.alloc(4);
  control.writeUInt32BE(crc32(tipoYDatos));
  return Buffer.concat([longitud, tipoYDatos, control]);
}

const cabecera = Buffer.alloc(13);
cabecera.writeUInt32BE(TAMANO, 0); // ancho
cabecera.writeUInt32BE(TAMANO, 4); // alto
cabecera[8] = 8; // 8 bits por canal
cabecera[9] = 6; // color RGBA (con transparencia)

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  bloquePng('IHDR', cabecera),
  bloquePng('IDAT', deflateSync(filas, { level: 9 })),
  bloquePng('IEND', Buffer.alloc(0)),
]);

const carpetaMarca = fileURLToPath(new URL('../marca/', import.meta.url));
mkdirSync(carpetaMarca, { recursive: true });
writeFileSync(`${carpetaMarca}logo-ejemplo.png`, png);
console.log(`Logo de ejemplo creado: ${carpetaMarca}logo-ejemplo.png (${png.length} bytes)`);
