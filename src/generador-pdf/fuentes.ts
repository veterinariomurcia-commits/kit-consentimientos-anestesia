// Fuentes del PDF y puesta en marcha de pdfmake (tarea T10).
//
// Arial no se puede meter dentro de la web por su licencia. En su lugar van empaquetadas:
//   - Liberation Sans (licencia libre OFL): mide exactamente como Arial, así que el texto ocupa
//     lo mismo que en el Word. Sus 4 variantes: normal, negrita, cursiva y negrita cursiva.
//   - DejaVu Sans (licencia libre): solo para las casillas ☐ y ☒, que Liberation Sans no tiene.
//     El PDF solo guarda dentro esos dos símbolos, no la fuente entera.
// Las licencias están junto a las fuentes, en fuentes/.
//
// Las fuentes se leen de la propia web (o del disco, en `npm run muestras`): nunca de fuera (D11).
// Por eso quien llama dice cómo leer un archivo: en el navegador, pidiéndolo a la propia web; en
// Node, leyéndolo del disco.

/** Nombre de la fuente del texto dentro del PDF. */
export const FUENTE_PDF = 'LiberationSans';

/** Nombre de la fuente de las casillas ☐ y ☒ dentro del PDF. */
export const FUENTE_CASILLAS_PDF = 'DejaVuSans';

/** Dónde están los archivos de las fuentes (junto a este archivo). */
const ARCHIVOS = {
  normal: new URL('./fuentes/LiberationSans-Regular.ttf', import.meta.url),
  negrita: new URL('./fuentes/LiberationSans-Bold.ttf', import.meta.url),
  cursiva: new URL('./fuentes/LiberationSans-Italic.ttf', import.meta.url),
  negritaCursiva: new URL('./fuentes/LiberationSans-BoldItalic.ttf', import.meta.url),
  casillas: new URL('./fuentes/DejaVuSans.ttf', import.meta.url),
};

/** Lo poco de pdfmake que se usa aquí (es igual en su versión para el navegador y para Node). */
export interface PdfMake {
  setFonts(fuentes: Record<string, Record<string, Uint8Array>>): void;
  setUrlAccessPolicy(permitir: (url: string) => boolean): void;
  /** Solo existe en la versión para Node. */
  setLocalAccessPolicy?: (permitir: (ruta: string) => boolean) => void;
  createPdf(definicion: object): { getBuffer(): Promise<Uint8Array> };
}

/** Convierte la descripción de un documento (ver generador-pdf.ts) en los bytes del PDF. */
export type FabricaPdf = (definicion: object) => Promise<Uint8Array>;

/**
 * Prepara pdfmake: le da las fuentes y le prohíbe leer nada de internet o del disco por su cuenta
 * (todo lo que necesita, fuentes y logo, se le entrega ya leído).
 * `leer` dice cómo leer un archivo de fuentes/ en cada sitio (navegador o Node).
 */
export async function prepararPdfMake(pdfMake: PdfMake, leer: (archivo: URL) => Promise<Uint8Array>): Promise<FabricaPdf> {
  const [normal, negrita, cursiva, negritaCursiva, casillas] = await Promise.all([
    leer(ARCHIVOS.normal),
    leer(ARCHIVOS.negrita),
    leer(ARCHIVOS.cursiva),
    leer(ARCHIVOS.negritaCursiva),
    leer(ARCHIVOS.casillas),
  ]);
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy?.(() => false);
  return async (definicion) => {
    // Cada documento, con la "huella" de sus fuentes distinta (ver conHuellaPropia).
    const huella = huellaDe(new TextEncoder().encode(JSON.stringify(definicion)));
    const [n, b, i, bi, c] = [normal, negrita, cursiva, negritaCursiva, casillas].map((f) => conHuellaPropia(f, huella));
    pdfMake.setFonts({
      [FUENTE_PDF]: { normal: n, bold: b, italics: i, bolditalics: bi },
      [FUENTE_CASILLAS_PDF]: { normal: c, bold: c, italics: c, bolditalics: c },
    });
    return nombresDeFuenteUnicos(new Uint8Array(await pdfMake.createPdf(definicion).getBuffer()));
  };
}

/** Huella (FNV-1a) de unos bytes: un número que cambia si cambia cualquier byte. */
function huellaDe(bytes: Uint8Array): number {
  let huella = 0x811c9dc5;
  for (const byte of bytes) huella = Math.imul(huella ^ byte, 0x01000193) >>> 0;
  return huella;
}

/**
 * Copia de una fuente con su "huella" interna cambiada (el campo checkSumAdjustment de su tabla
 * "head"). El PDF solo guarda las letras que usa cada documento, pero esa huella la copia tal cual
 * del archivo original, así que todos los PDF llevarían la misma. Algunos visores (el de Windows,
 * por ejemplo) reconocen las fuentes por esa huella: si se abren dos PDF seguidos, usan las letras
 * del primero en el segundo y salen letras revueltas (pasó en las pruebas de la T10).
 * Ese campo solo sirve para comprobar el archivo: cambiarlo no altera ninguna letra.
 */
function conHuellaPropia(fuente: Uint8Array, huella: number): Uint8Array {
  const copia = fuente.slice();
  const datos = new DataView(copia.buffer);
  const tablas = datos.getUint16(4);
  for (let t = 0; t < tablas; t++) {
    const registro = 12 + 16 * t;
    if (datos.getUint32(registro) === 0x68656164 /* "head" */) {
      const head = datos.getUint32(registro + 8);
      datos.setUint32(head + 8, (datos.getUint32(head + 8) ^ huella) >>> 0);
    }
  }
  return copia;
}

/**
 * Complemento de conHuellaPropia: cada PDF guarda sus fuentes con un nombre interno como
 * "BZZZZZ+LiberationSans-Bold", y pdfmake pone siempre los mismos nombres. Hay visores que
 * reconocen las fuentes por ese nombre, en lugar de por la huella.
 *
 * Aquí se cambian las 5 "Z" por 5 letras sacadas del contenido del propio PDF: cada documento
 * lleva nombres distintos, y el mismo documento, siempre los mismos. Ocupan lo mismo, así que el
 * resto del archivo no se mueve.
 */
function nombresDeFuenteUnicos(pdf: Uint8Array): Uint8Array {
  const huella = huellaDe(pdf);
  const letras = Array.from({ length: 5 }, (_, i) => 65 + (Math.floor(huella / 26 ** i) % 26));

  // Busca "/" + una mayúscula + "ZZZZZ+" (el principio del nombre de una fuente).
  const Z = 90;
  for (let i = 0; i + 7 < pdf.length; i++) {
    if (pdf[i] !== 47 || pdf[i + 1] < 65 || pdf[i + 1] > Z || pdf[i + 7] !== 43) continue;
    if (pdf[i + 2] !== Z || pdf[i + 3] !== Z || pdf[i + 4] !== Z || pdf[i + 5] !== Z || pdf[i + 6] !== Z) continue;
    for (let k = 0; k < 5; k++) pdf[i + 2 + k] = letras[k];
  }
  return pdf;
}
