// Piezas de formulario del documento (tarea T4): casillas ☐, huecos para escribir, cajas y firmas.
//
// Aquí solo están las piezas pequeñas y las medidas. El montaje de las tablas (tabla de datos,
// filas de firma, recuadros) se hace en generador.ts, que es quien conoce el ancho de la página.
//
// Medidas en "twips" (vigésimos de punto): 567 ≈ 1 cm.

import { TextRun } from 'docx';
import type { Linea, Tramo } from '../contenido/tipos.ts';
import { ESTILO } from './estilos.ts';

const CM = 567;

/** Medidas de los elementos de formulario. */
export const MEDIDA = {
  /** [linea-corta] en un párrafo: unos 3 cm. */
  lineaCorta: 3 * CM,
  /** [linea-corta] dentro de una celda: algo más corto, para que quepan dos en la misma línea. */
  lineaCortaEnCelda: Math.round(1.5 * CM),
  /** [linea] en medio de una frase: como mínimo 3 cm; si no cabe, ocupa una línea entera. */
  lineaMinima: 3 * CM,
  /** Alto mínimo de una fila de la tabla de datos o de una celda para escribir (unos 0,75 cm). */
  altoFila: 425,
  /** [caja]: unas 3 líneas de texto. */
  altoCaja: Math.round(1.6 * CM),
  /** [caja-grande]: 4 cm, unas 5 o 6 líneas escritas a mano (D62). Crece si se escribe más. */
  altoCajaGrande: 4 * CM,
  /** Recuadro de firma en la tabla de firmas: 1,7 cm de alto (en la referencia, unos 1,65 cm). */
  altoFirma: Math.round(1.7 * CM),
  /** Recuadro de firma en una línea de texto (firma de rechazo, revocación): 1,4 cm de alto. */
  altoFirmaLinea: Math.round(1.4 * CM),
} as const;

/** Carácter de la casilla (U+2610). */
export const CASILLA = '☐';

/** Carácter de la casilla marcada (U+2612), para los datos del paciente (T7). */
export const CASILLA_MARCADA = '☒';

/** Espacio que no se parte (U+00A0): con él se dibujan los huecos subrayados. */
const ESPACIO_FIJO = ' ';

// --- Anchos aproximados de Arial (en "em": 1 em = el tamaño de la letra) ---
// Solo sirven para estimar cuánto sitio queda en la línea. Si la estimación falla un poco, el
// hueco baja entero a la línea siguiente: no se descuadra nada.
const EM_ESPACIO_FIJO = 0.278;
const EM_LETRA = 0.52;
const EM_LETRA_NEGRITA = 0.57;
const EM_CASILLA = 0.9;

/** Twips que ocupa 1 em con una letra de `tamanoPt` puntos. */
const em = (tamanoPt: number) => tamanoPt * 20;

/** Ancho aproximado de un trozo de línea, en twips. Las piezas sin ancho propio devuelven 0. */
function anchoTramo(t: Tramo, tamanoPt: number, enCelda: boolean): number {
  switch (t.tipo) {
    case 'texto':
    case 'dato':
    case 'referencia':
      return t.texto.length * (t.negrita ? EM_LETRA_NEGRITA : EM_LETRA) * em(tamanoPt);
    case 'casilla':
      return EM_CASILLA * em(tamanoPt);
    case 'linea-corta': {
      const hueco = enCelda ? MEDIDA.lineaCortaEnCelda : MEDIDA.lineaCorta;
      // Relleno con un dato largo, el hueco crece con el texto.
      const texto = t.valor ? (t.valor.length + 2) * EM_LETRA * em(tamanoPt) : 0;
      return Math.max(hueco, texto);
    }
    default:
      return 0;
  }
}

/** Casilla ☐ (o ☒ si está marcada) con el estilo de carácter "Casilla" (una fuente que tiene ese símbolo). */
export const runCasilla = (marcada = false) =>
  new TextRun({ text: marcada ? CASILLA_MARCADA : CASILLA, style: ESTILO.casilla });

/**
 * Hueco para escribir: espacios fijos subrayados con el estilo "Hueco".
 * Es un "tramo con borde inferior" (regla 3 de diseño): sin guiones bajos.
 * Si lleva un dato del paciente (T7), el dato va escrito sobre la línea y el resto del hueco
 * sigue subrayado, para que se vea que es un campo y se pueda corregir a mano.
 */
export function runHueco(anchoTwips: number, tamanoPt: number, valor?: string): TextRun {
  return new TextRun({ text: textoHueco(anchoTwips, tamanoPt, valor), style: ESTILO.hueco });
}

/**
 * Texto de un hueco para escribir: tantos espacios fijos como quepan en `anchoTwips` y, si hay
 * un dato del paciente, el dato delante. Lo usan el Word (runHueco) y el PDF (T10), para que los
 * huecos midan lo mismo en los dos.
 */
export function textoHueco(anchoTwips: number, tamanoPt: number, valor?: string): string {
  const anchoEspacio = EM_ESPACIO_FIJO * em(tamanoPt);
  if (valor) {
    const anchoTexto = (valor.length + 1) * EM_LETRA * em(tamanoPt);
    const resto = Math.max(2, Math.round((anchoTwips - anchoTexto) / anchoEspacio));
    return `${ESPACIO_FIJO}${valor}${ESPACIO_FIJO.repeat(resto)}`;
  }
  return ESPACIO_FIJO.repeat(Math.max(4, Math.round(anchoTwips / anchoEspacio)));
}

/**
 * Texto de un tramo de texto normal (`linea[i]`) con los espacios junto a las casillas ajustados:
 *   - el espacio que sigue a una casilla no se parte: "☐ Perro" nunca se separa en dos líneas;
 *   - antes de la casilla siguiente, un espacio ancho (1 em) para separar bien las opciones:
 *     "☐ Perro   ☐ Gato". Se puede partir por él, como por un espacio normal.
 */
export function textoJuntoACasillas(linea: Linea, i: number): string {
  const t = linea[i];
  if (t.tipo !== 'texto') return '';
  const trasCasilla = linea[i - 1]?.tipo === 'casilla' && t.texto.startsWith(' ');
  let texto = trasCasilla ? ESPACIO_FIJO + t.texto.slice(1) : t.texto;
  if (linea[i + 1]?.tipo === 'casilla' && texto.endsWith(' ') && texto.trim() !== '') {
    texto = texto.slice(0, -1) + ESPACIO_ANCHO;
  }
  return texto;
}

/** Espacio ancho (U+2003, 1 em) entre una opción y la casilla siguiente. */
const ESPACIO_ANCHO = ' ';

/**
 * Texto de un dato del paciente que puede tener varias líneas (las cajas): cada salto de línea
 * del texto es un salto de línea en Word, dentro del mismo párrafo.
 */
export function runsTextoLibre(valor: string): TextRun[] {
  return valor.split(/\r?\n/).map((trozo, i) => new TextRun({ text: trozo, break: i > 0 ? 1 : undefined }));
}

/** Dato del paciente del único hueco de la línea (por ejemplo, una celda que es solo un [linea]). */
export function valorDe(linea: Linea): string | undefined {
  const t = utiles(linea)[0];
  return t && 'valor' in t ? t.valor : undefined;
}

/** Dónde se va a escribir una línea: ancho disponible y tamaño de la letra. */
export interface Medida {
  /** Ancho disponible para el texto, en twips. */
  ancho: number;
  /** Tamaño de la letra, en puntos. */
  tamanoPt: number;
  /** La línea está dentro de una celda de tabla (los huecos cortos son algo más cortos). */
  enCelda: boolean;
}

/**
 * Ancho del hueco de un [linea] que va después de otros trozos de la línea:
 * lo que se estima que queda hasta el final de la línea. Si queda menos del mínimo, el hueco
 * ocupa una línea entera (y baja solo a la línea siguiente).
 */
export function anchoLineaRestante(anteriores: Tramo[], medida: Medida): number {
  const usado = anteriores.reduce((suma, t) => suma + anchoTramo(t, medida.tamanoPt, medida.enCelda), 0);
  const lineaEntera = Math.round(medida.ancho * 0.97);
  // Margen de seguridad: la estimación del texto nunca es exacta.
  const queda = medida.ancho - (usado % medida.ancho) - 1.5 * em(medida.tamanoPt);
  return queda >= MEDIDA.lineaMinima ? Math.round(queda * 0.92) : lineaEntera;
}

// --- Clasificar una línea ---

/** Un trozo de texto que solo tiene espacios no cuenta. */
const esRelleno = (t: Tramo) => t.tipo === 'texto' && t.texto.trim() === '';

/** Los trozos que cuentan de una línea (sin los que solo son espacios). */
const utiles = (linea: Linea) => linea.filter((t) => !esRelleno(t));

/** La línea es solo un elemento de ese tipo (por ejemplo, un párrafo que es solo un [caja]). */
export function esSolo(linea: Linea, tipo: Tramo['tipo']): boolean {
  const u = utiles(linea);
  return u.length === 1 && u[0].tipo === tipo;
}

/** La línea solo tiene casillas (por ejemplo, las celdas Acepta / Rechaza de la tabla de pruebas). */
export const soloCasillas = (linea: Linea) => {
  const u = utiles(linea);
  return u.length > 0 && u.every((t) => t.tipo === 'casilla');
};

/** La línea está vacía o solo tiene espacios. */
export const estaVacia = (linea: Linea) => utiles(linea).length === 0;

export const tieneFirma = (linea: Linea) => linea.some((t) => t.tipo === 'firma');

export const tieneCaja = (linea: Linea) => linea.some((t) => t.tipo === 'caja' || t.tipo === 'caja-grande');

/** Texto de la línea "Firma", "Firma y sello"…, si la línea es solo un recuadro de firma. */
export function firmaSola(linea: Linea): string | null {
  const u = utiles(linea);
  return u.length === 1 && u[0].tipo === 'firma' ? u[0].texto : null;
}

/** Un trozo de una línea que lleva un [firma: …]: texto normal o el propio recuadro de firma. */
export type Segmento = { tipo: 'texto'; linea: Linea } | { tipo: 'firma'; texto: string };

/**
 * Parte una línea por sus recuadros de firma. Por ejemplo,
 * "[firma: Firma del titular] Fecha y hora: [linea]" → [firma] + [texto "Fecha y hora: [linea]"].
 * Quita los espacios sobrantes de los bordes de cada trozo de texto.
 */
export function partirPorFirma(linea: Linea): Segmento[] {
  const segmentos: Segmento[] = [];
  let actual: Linea = [];
  const cerrar = () => {
    const recortada = recortar(actual);
    if (!estaVacia(recortada)) segmentos.push({ tipo: 'texto', linea: recortada });
    actual = [];
  };
  for (const t of linea) {
    if (t.tipo === 'firma') {
      cerrar();
      segmentos.push({ tipo: 'firma', texto: t.texto });
    } else {
      actual.push(t);
    }
  }
  cerrar();
  return segmentos;
}

/** Quita los espacios del principio y del final de una línea. */
function recortar(linea: Linea): Linea {
  const copia = linea.map((t) => ({ ...t }));
  const primero = copia[0];
  if (primero && (primero.tipo === 'texto' || primero.tipo === 'dato')) primero.texto = primero.texto.trimStart();
  const ultimo = copia[copia.length - 1];
  if (ultimo && (ultimo.tipo === 'texto' || ultimo.tipo === 'dato')) ultimo.texto = ultimo.texto.trimEnd();
  return copia.filter((t) => !(t.tipo === 'texto' && t.texto === ''));
}
