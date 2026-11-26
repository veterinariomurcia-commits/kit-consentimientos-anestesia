// Lectura del tamaño del logo (PNG o JPG) directamente de sus bytes.
//
// Word necesita saber a qué tamaño dibujar la imagen. Aquí se averigua su ancho y su alto
// en píxeles y se calcula un tamaño que quepa en un recuadro máximo sin deformarla.
// No usa nada propio de Node ni del navegador: funciona en los dos.

export type TipoImagen = 'png' | 'jpg';

/** Logo que sube la clínica. */
export interface Logo {
  datos: Uint8Array;
  tipo: TipoImagen;
}

export interface Medidas {
  ancho: number;
  alto: number;
}

/** Error cuando el archivo no es un PNG o un JPG que se pueda leer. */
export class ErrorImagen extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorImagen';
  }
}

/** Averigua si los bytes son un PNG o un JPG mirando su "firma" inicial. */
export function detectarTipo(datos: Uint8Array): TipoImagen {
  if (datos[0] === 0x89 && datos[1] === 0x50 && datos[2] === 0x4e && datos[3] === 0x47) return 'png';
  if (datos[0] === 0xff && datos[1] === 0xd8) return 'jpg';
  throw new ErrorImagen('El logo debe ser una imagen PNG o JPG.');
}

/** Ancho y alto en píxeles de un PNG o un JPG. */
export function leerMedidas(datos: Uint8Array): Medidas {
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);

  if (detectarTipo(datos) === 'png') {
    // En un PNG, el ancho y el alto están siempre en los bytes 16 a 23 (bloque IHDR).
    if (datos.length < 24) throw new ErrorImagen('El archivo PNG del logo está incompleto.');
    return { ancho: vista.getUint32(16), alto: vista.getUint32(20) };
  }

  // En un JPG hay que recorrer sus bloques hasta el que describe la imagen (SOF0…SOF15).
  let i = 2;
  while (i + 9 < datos.length) {
    if (datos[i] !== 0xff) {
      i++;
      continue;
    }
    const marca = datos[i + 1];
    const esSof = marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc;
    if (esSof) return { alto: vista.getUint16(i + 5), ancho: vista.getUint16(i + 7) };
    if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7) || marca === 0xff) {
      i += marca === 0xff ? 1 : 2;
      continue;
    }
    i += 2 + vista.getUint16(i + 2);
  }
  throw new ErrorImagen('No se ha podido leer el tamaño del logo JPG.');
}

/**
 * Ajusta unas medidas al recuadro máximo conservando la proporción: el logo ocupa todo el ancho
 * o todo el alto disponible, así que todos los logos se ven de un tamaño parecido.
 */
export function encajar(medidas: Medidas, maximo: Medidas): Medidas {
  const escala = Math.min(maximo.ancho / medidas.ancho, maximo.alto / medidas.alto);
  return {
    ancho: Math.max(1, Math.round(medidas.ancho * escala)),
    alto: Math.max(1, Math.round(medidas.alto * escala)),
  };
}
