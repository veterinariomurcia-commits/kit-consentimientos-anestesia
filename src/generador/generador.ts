// Generador de Word: convierte un Documento (lo que devuelve el lector) en un archivo .docx.
//
// No usa nada propio de Node ni del navegador, así que funciona en los dos:
//   - en la web, para que la clínica descargue sus documentos;
//   - en scripts/muestras.ts, para fabricar las muestras sin abrir la web.
//
// Tarea T3: página, estilos, cabecera con logo, pie, títulos, párrafos, listas, tablas,
// recuadros destacados, notas y letra pequeña.
// Tarea T4: tabla de datos, casillas, huecos, cajas y firmas (las piezas están en formulario.ts).
// Si un elemento está en un sitio donde no se puede dibujar (por ejemplo, un [caja] dentro de una
// lista), el generador avisa con un ErrorGenerador en lugar de dibujarlo mal.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  ImageRun,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
  type IBorderOptions,
  type ParagraphChild,
} from 'docx';
import type { Bloque, DatosClinica, Documento, Linea, Tramo, Variable } from '../contenido/tipos.ts';
import { resolverVariable } from '../contenido/variables.ts';
import { COLOR_POR_DEFECTO, FONDO_CAMPO, GRIS, GRIS_BORDE, crearPaleta, type Paleta } from './color.ts';
import { ESTILO, LISTA, SANGRIA_LISTA, crearEstilos, crearNumeraciones } from './estilos.ts';
import {
  MEDIDA,
  anchoLineaRestante,
  esSolo,
  firmaSola,
  partirPorFirma,
  runCasilla,
  runHueco,
  soloCasillas,
  tieneCaja,
  tieneFirma,
  type Medida,
  type Segmento,
} from './formulario.ts';
import { encajar, leerMedidas, type Logo } from './imagen.ts';

/** Versión del modelo que aparece en el pie ("… · Modelo v1.0"). */
export const VERSION_MODELO = 'v1.0';

/** Lo que necesita el generador además del documento. */
export interface OpcionesGenerador {
  /** Datos de la clínica (los vacíos salen como hueco amarillo). */
  datos: DatosClinica;
  /** Color de la clínica, por ejemplo "#2E6A80". Si falta, se usa el color por defecto. */
  color?: string;
  /** Logo de la clínica (opcional). */
  logo?: Logo | null;
}

/** Error cuando el documento usa algo que el generador todavía no sabe dibujar. */
export class ErrorGenerador extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorGenerador';
  }
}

// --- Medidas de la página (en twips: 567 ≈ 1 cm) ---

const CM = 567;
const A4 = { ancho: 11906, alto: 16838 };
/**
 * Márgenes de la página, como en la referencia (T5): 1,8 cm a los lados. Arriba, 1,4 cm, para que
 * quepa el encabezado de la página 2 en adelante (a 0,6 cm del borde); abajo, 1,8 cm para el pie.
 */
const MARGEN = { lateral: Math.round(1.8 * CM), superior: Math.round(1.4 * CM), inferior: Math.round(1.8 * CM) };
/** Ancho útil entre márgenes: 21 cm − 2 × 1,8 cm = 17,4 cm. */
const ANCHO_UTIL = A4.ancho - 2 * MARGEN.lateral;

/** Tamaño máximo del logo en píxeles de pantalla (96 por pulgada): 5 cm de ancho × 2,4 cm de alto. */
const LOGO_MAXIMO = { ancho: 189, alto: 91 };

/** Reparte el ancho útil en columnas según porcentajes. La última columna recoge el redondeo. */
function anchosEnTwips(porcentajes: number[]): number[] {
  const anchos = porcentajes.map((p) => Math.round((ANCHO_UTIL * p) / 100));
  anchos[anchos.length - 1] += ANCHO_UTIL - anchos.reduce((a, b) => a + b, 0);
  return anchos;
}

// --- Bordes ---

const SIN_BORDE: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const borde = (color: string, grosor = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size: grosor, color });

/** Borde discontinuo fino, de guiones cortos, de los recuadros de firma. */
const BORDE_FIRMA: IBorderOptions = { style: BorderStyle.DASH_SMALL_GAP, size: 4, color: GRIS };
const BORDES_FIRMA = { top: BORDE_FIRMA, bottom: BORDE_FIRMA, left: BORDE_FIRMA, right: BORDE_FIRMA };

/** Celda sin ningún borde propio (para que no aparezcan rayas sueltas). */
const SIN_BORDES_CELDA = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };

const bordesTabla = (b: IBorderOptions | null, interiores: IBorderOptions | null = b) => {
  const x = b ?? SIN_BORDE;
  const i = interiores ?? SIN_BORDE;
  return { top: x, bottom: x, left: x, right: x, insideHorizontal: i, insideVertical: i };
};

// --- Generador ---

/** Estado que se va pasando mientras se recorren los bloques. */
interface Contexto {
  paleta: Paleta;
  /** Estilo de los párrafos dentro de un recuadro de nota o de letra pequeña. */
  estiloParrafo?: string;
  /** Contador para que cada lista numerada empiece en 1. */
  listasNumeradas: { n: number };
  /** Estado compartido por todo el recorrido (también dentro de los recuadros). */
  estado: {
    /** Hay un salto de página pendiente: se aplica al siguiente párrafo ("salto de página antes"). */
    salto: boolean;
    /** Lo último fue una tabla: el siguiente párrafo necesita un poco de aire por encima. */
    trasTabla: boolean;
    /**
     * Lo que se está creando va "atado" a lo siguiente ("conservar con el siguiente" de Word):
     * es parte del texto que se firma justo después (ver bloquesAtadosAFirma).
     */
    conservar: boolean;
  };
}

/** Crea el documento de Word en memoria (sin convertirlo todavía en archivo). */
export function crearDocumentoWord(doc: Documento, opciones: OpcionesGenerador): Document {
  const paleta = crearPaleta(opciones.color ?? COLOR_POR_DEFECTO);
  const ctx: Contexto = { paleta, listasNumeradas: { n: 0 }, estado: { salto: false, trasTabla: false, conservar: false } };
  const { cabecera } = doc;

  const cuerpo: (Paragraph | Table)[] = [
    crearCabeceraClinica(opciones.datos, paleta, opciones.logo ?? null),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(cabecera.titulo)] }),
    new Paragraph({ style: ESTILO.subtitulo, children: [new TextRun(cabecera.subtitulo)] }),
    ...crearBloques(doc.bloques, ctx),
  ];

  const nombre = resolverVariable('NOMBRE_CLINICA', opciones.datos);
  const pie = () => crearPie(cabecera.pie, cabecera.inicialesEnPie);
  return new Document({
    creator: nombre.vacio ? 'Kit de consentimientos de anestesia' : nombre.texto,
    title: cabecera.titulo,
    description: `${cabecera.pie} · Modelo ${VERSION_MODELO}`,
    styles: crearEstilos(paleta),
    numbering: crearNumeraciones(paleta),
    sections: [
      {
        properties: {
          // La primera página tiene su propio encabezado (vacío): allí va la cabecera completa.
          titlePage: true,
          page: {
            size: { width: A4.ancho, height: A4.alto },
            margin: {
              top: MARGEN.superior,
              bottom: MARGEN.inferior,
              left: MARGEN.lateral,
              right: MARGEN.lateral,
              header: Math.round(0.6 * CM),
              footer: Math.round(0.7 * CM),
            },
          },
        },
        headers: {
          first: new Header({ children: [new Paragraph({ style: ESTILO.pie })] }),
          default: crearEncabezado(opciones.datos),
        },
        footers: { first: pie(), default: pie() },
        children: cuerpo,
      },
    ],
  });
}

/**
 * Genera el archivo .docx y lo devuelve como bytes.
 * En Node se guarda con writeFile; en el navegador se mete en el ZIP con jszip.
 */
export async function generarWord(doc: Documento, opciones: OpcionesGenerador): Promise<Uint8Array> {
  return new Uint8Array(await Packer.toArrayBuffer(crearDocumentoWord(doc, opciones)));
}

// --- Texto ---

/** Tamaño de letra (en puntos) del texto normal, de las tablas y de las notas. */
const TAMANO_PT = { cuerpo: 9.5, tabla: 8.5, nota: 8 };

/** Márgenes izquierdo + derecho de una celda normal (para saber cuánto texto cabe dentro). */
const MARGEN_LATERAL_CELDA = 220;

/** Dónde se escribe un párrafo normal del cuerpo: todo el ancho de la página. */
const medidaCuerpo = (ctx: Contexto, sangria = 0): Medida => ({
  ancho: ANCHO_UTIL - sangria,
  tamanoPt: ctx.estiloParrafo ? TAMANO_PT.nota : TAMANO_PT.cuerpo,
  enCelda: false,
});

/** Dónde se escribe el texto de una celda de `ancho` twips. */
const medidaCelda = (ancho: number, tamanoPt = TAMANO_PT.tabla): Medida => ({
  ancho: ancho - MARGEN_LATERAL_CELDA,
  tamanoPt,
  enCelda: true,
});

/** Nombre de cada elemento tal como se escribe en contenido/, para los mensajes de error. */
const MARCA: Partial<Record<Tramo['tipo'], string>> = {
  caja: '[caja]',
  'caja-grande': '[caja-grande]',
  firma: '[firma: …]',
};

/**
 * Convierte una línea en trozos de Word: texto, datos de la clínica, casillas ☐ y huecos.
 * `medida` dice cuánto sitio hay, para que un [linea] llegue hasta el final de la línea.
 * Las cajas y las firmas no pueden ir dentro de una frase: se dibujan como tablas aparte.
 */
function lineaARuns(linea: Linea, medida: Medida): ParagraphChild[] {
  return linea.map((t, i): ParagraphChild => {
    switch (t.tipo) {
      case 'texto': {
        // El espacio que sigue a una casilla no se parte: "☐ Perro" nunca se separa en dos líneas.
        const trasCasilla = linea[i - 1]?.tipo === 'casilla' && t.texto.startsWith(' ');
        let texto = trasCasilla ?' ' + t.texto.slice(1) : t.texto;
        // Antes de la casilla siguiente, un espacio ancho (1 em) para separar bien las opciones:
        // "☐ Perro   ☐ Gato". Se puede partir por él, como por un espacio normal.
        if (linea[i + 1]?.tipo === 'casilla' && texto.endsWith(' ') && texto.trim() !== '') {
          texto = texto.slice(0, -1) + ' ';
        }
        return new TextRun({ text: texto, bold: t.negrita || undefined, italics: t.cursiva || undefined });
      }
      case 'dato':
        return new TextRun({
          text: t.texto,
          bold: t.negrita || undefined,
          italics: t.cursiva || undefined,
          ...marcaPendiente(t.vacio),
        });
      case 'casilla':
        return runCasilla();
      case 'linea-corta':
        return runHueco(medida.enCelda ? MEDIDA.lineaCortaEnCelda : MEDIDA.lineaCorta, medida.tamanoPt);
      case 'linea':
        return runHueco(anchoLineaRestante(linea.slice(0, i), medida), medida.tamanoPt);
      case 'caja':
      case 'caja-grande':
      case 'firma':
        throw new ErrorGenerador(
          `${MARCA[t.tipo]} tiene que ir en un párrafo propio, en una celda de tabla o (la firma) en una línea ` +
            'de texto normal; no puede ir dentro de un título ni de una lista, ni una caja en medio de una frase.',
        );
    }
  });
}

/**
 * Formato de un dato que falta: estilo de carácter "Dato pendiente" y, además, el resaltado
 * amarillo puesto en el propio texto. El resaltado va repetido a propósito: LibreOffice y
 * Google Docs no muestran el resaltado que viene solo en un estilo de carácter.
 */
const marcaPendiente = (vacio: boolean) =>
  vacio ? { style: ESTILO.datoPendiente, highlight: 'yellow' as const } : {};

/** Texto plano de una línea, solo para calcular el ancho de las columnas. */
const textoPlano = (linea: Linea): string =>
  linea.map((t) => (t.tipo === 'texto' || t.tipo === 'dato' ? t.texto : '··········')).join('');

/** Separación entre una tabla y el párrafo normal que la sigue (6 pt). Los títulos ya traen la suya. */
const AIRE_TRAS_TABLA = 120;

/**
 * Crea un párrafo del cuerpo teniendo en cuenta el estado:
 *   - si hay un salto de página pendiente, el párrafo empieza en una página nueva;
 *   - si va justo después de una tabla y no es un título, se le da un poco de aire por encima
 *     (Word no deja espacio después de las tablas).
 */
function parrafo(ctx: Contexto, opciones: ConstructorParameters<typeof Paragraph>[0] & object): Paragraph {
  const { salto, trasTabla } = ctx.estado;
  ctx.estado.salto = false;
  ctx.estado.trasTabla = false;
  const aire = trasTabla && !opciones.heading ? { spacing: { before: AIRE_TRAS_TABLA } } : {};
  const atado = ctx.estado.conservar ? { keepNext: true } : {};
  return new Paragraph({ ...opciones, ...aire, ...atado, pageBreakBefore: salto || undefined });
}

/** Cuántos bloques de texto, como mucho, se lleva consigo una firma (D56). */
const BLOQUES_QUE_ARRASTRA_UNA_FIRMA = 3;

/** Bloques que se pueden atar a una firma: el texto que se firma (párrafos, tablas y notas). */
const SE_PUEDE_ATAR: Bloque['tipo'][] = ['parrafo', 'tabla', 'nota', 'letra-pequena'];

/** El bloque lleva un recuadro de firma: una línea con [firma: …] o una tabla con celdas de firma. */
function llevaFirma(b: Bloque): boolean {
  switch (b.tipo) {
    case 'firma':
      return true;
    case 'parrafo':
      return tieneFirma(b.contenido);
    case 'tabla':
      return b.filas.some((f) => f.some((celda) => firmaSola(celda) !== null));
    default:
      return false;
  }
}

/**
 * Posiciones de los bloques que deben ir en la misma página que la firma que los sigue (D56):
 * la firma "se lleva" hasta 3 bloques de texto anteriores (por ejemplo, "Pruebas preanestésicas…",
 * la tabla de pruebas y "Si rechaza…"). Se para en un título, un salto de página o un recuadro.
 * Así quien firma ve siempre en la misma página lo que está firmando.
 */
function bloquesAtadosAFirma(bloques: Bloque[]): Set<number> {
  const atados = new Set<number>();
  bloques.forEach((b, i) => {
    if (!llevaFirma(b)) return;
    for (let j = i - 1; j >= 0 && j >= i - BLOQUES_QUE_ARRASTRA_UNA_FIRMA; j--) {
      if (!SE_PUEDE_ATAR.includes(bloques[j].tipo) || llevaFirma(bloques[j])) break;
      atados.add(j);
    }
  });
  return atados;
}

// --- Bloques ---

function crearBloques(bloques: Bloque[], ctx: Contexto): (Paragraph | Table)[] {
  const salida: (Paragraph | Table)[] = [];
  const atados = bloquesAtadosAFirma(bloques);
  // Dentro de una nota o recuadro, se respeta si el bloque de fuera ya iba atado.
  const atadoPorFuera = ctx.estado.conservar;
  for (const [i, b] of bloques.entries()) {
    ctx.estado.conservar = atadoPorFuera || atados.has(i);
    // Si hay un salto pendiente y lo siguiente es una tabla, el salto va en un párrafo propio.
    if (ctx.estado.salto && empiezaConTabla(b)) {
      salida.push(new Paragraph({ children: [new PageBreak()] }));
      ctx.estado.salto = false;
    }
    const creados = crearBloque(b, ctx);
    // Dos tablas seguidas se funden en una sola al abrir el Word: se separan con un párrafo mínimo.
    if (salida[salida.length - 1] instanceof Table && creados[0] instanceof Table) salida.push(separadorTablas());
    salida.push(...creados);
    if (creados.length > 0) ctx.estado.trasTabla = creados[creados.length - 1] instanceof Table;
  }
  ctx.estado.conservar = atadoPorFuera;
  return salida;
}

/** Párrafo vacío y bajito (unos 6 pt) entre dos tablas seguidas. */
const separadorTablas = () =>
  new Paragraph({ style: ESTILO.pie, spacing: { before: 0, after: 0, line: 120, lineRule: LineRuleType.EXACT } });

/** El párrafo se dibuja como una tabla: es solo una caja, o es una línea con un recuadro de firma. */
const parrafoEsTabla = (linea: Linea) => esSolo(linea, 'caja') || esSolo(linea, 'caja-grande') || tieneFirma(linea);

/** El bloque empieza con una tabla (para saber cómo aplicar un salto de página pendiente). */
function empiezaConTabla(b: Bloque): boolean {
  switch (b.tipo) {
    case 'tabla':
    case 'tabla-datos':
    case 'destacado':
      return true;
    case 'parrafo':
      return parrafoEsTabla(b.contenido);
    case 'nota':
    case 'letra-pequena':
    case 'firma':
      return b.bloques.length > 0 && empiezaConTabla(b.bloques[0]);
    default:
      return false;
  }
}

function crearBloque(b: Bloque, ctx: Contexto): (Paragraph | Table)[] {
  switch (b.tipo) {
    case 'titulo1':
      return [parrafo(ctx, { heading: HeadingLevel.HEADING_1, children: lineaARuns(b.contenido, medidaCuerpo(ctx)) })];
    case 'titulo2':
      return [parrafo(ctx, { heading: HeadingLevel.HEADING_2, children: lineaARuns(b.contenido, medidaCuerpo(ctx)) })];
    case 'parrafo':
      if (esSolo(b.contenido, 'caja')) return [crearCaja(MEDIDA.altoCaja, ctx.estado.conservar)];
      if (esSolo(b.contenido, 'caja-grande')) return [crearCaja(MEDIDA.altoCajaGrande, ctx.estado.conservar)];
      if (tieneFirma(b.contenido)) return [crearLineaFirma(b.contenido, ctx)];
      return [parrafo(ctx, { style: ctx.estiloParrafo, children: lineaARuns(b.contenido, medidaCuerpo(ctx)) })];
    case 'lista': {
      const referencia = b.numerada ? LISTA.numeros : LISTA.vinetas;
      const instancia = b.numerada ? ++ctx.listasNumeradas.n : 0;
      return b.elementos.map((e) =>
        parrafo(ctx, {
          style: ctx.estiloParrafo ?? ESTILO.elementoLista,
          numbering: { reference: referencia, level: 0, instance: instancia },
          children: lineaARuns(e, medidaCuerpo(ctx, SANGRIA_LISTA.left)),
        }),
      );
    }
    case 'tabla':
      return [crearTabla(b, ctx.paleta, ctx.estado.conservar)];
    case 'tabla-datos':
      return [crearTablaDatos(b, ctx.paleta)];
    case 'destacado':
      return [crearDestacado(b.bloques, ctx)];
    case 'nota':
      return crearBloques(b.bloques, { ...ctx, estiloParrafo: ESTILO.nota });
    case 'letra-pequena':
      return crearBloques(b.bloques, { ...ctx, estiloParrafo: ESTILO.letraPequena });
    case 'firma':
      // "::: firma": cada línea con un [firma: …] se dibuja como etiqueta + recuadro (ver crearLineaFirma).
      return crearBloques(b.bloques, ctx);
    case 'salto-de-pagina':
      ctx.estado.salto = true;
      return [];
  }
}

// --- Tablas ---

/**
 * Calcula el ancho de cada columna (en %) según la longitud de su texto más largo,
 * con un mínimo del 10 % para que ninguna columna quede demasiado estrecha.
 */
function porcentajesColumnas(cabecera: Linea[], filas: Linea[][], primeraColumnaEtiquetas = false): number[] {
  const todas = [cabecera, ...filas];
  const columnas = cabecera.length;
  const pesos = Array.from({ length: columnas }, (_, c) =>
    Math.min(50, Math.max(5, ...todas.map((f) => textoPlano(f[c] ?? []).length))),
  );
  const porcentajes = pesos.map((p) => (p * 100) / pesos.reduce((a, b) => a + b, 0));

  // Mínimo de cada columna: el 10 %, y además que quepa entera la palabra más larga de la cabecera
  // (para que "Recomendada" no se parta). Si la primera columna son etiquetas, que quepa la
  // etiqueta más larga en una sola línea, siempre que no pase del 25 %.
  const minimos = Array.from({ length: columnas }, (_, c) => {
    const palabras = textoPlano(cabecera[c] ?? []).split(/\s+/);
    let minimo = anchoNegrita(Math.max(0, ...palabras.map((p) => p.length)));
    if (primeraColumnaEtiquetas && c === 0) {
      const etiqueta = anchoNegrita(Math.max(0, ...filas.map((f) => textoPlano(f[0] ?? []).length)));
      minimo = Math.max(minimo, Math.min(25, etiqueta));
    }
    return Math.max(10, minimo);
  });
  return repartirConMinimos(porcentajes, minimos);
}

/** Porcentaje del ancho útil que ocupa un texto en negrita de `letras` letras (con los márgenes de la celda). */
const anchoNegrita = (letras: number) =>
  Math.ceil(((letras * 0.6 * TAMANO_PT.tabla * 20 + MARGEN_LATERAL_CELDA + 60) * 100) / ANCHO_UTIL);

/** Sube al mínimo las columnas que no llegan y quita lo que falta de las demás, en proporción. */
function repartirConMinimos(porcentajes: number[], minimos: number[]): number[] {
  let resultado = [...porcentajes];
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const fijas = resultado.map((p, c) => p <= minimos[c]);
    const ocupado = resultado.reduce((a, _p, c) => a + (fijas[c] ? minimos[c] : 0), 0);
    const libres = resultado.reduce((a, p, c) => a + (fijas[c] ? 0 : p), 0);
    if (libres === 0) break;
    resultado = resultado.map((p, c) => (fijas[c] ? minimos[c] : (p * (100 - ocupado)) / libres));
    if (resultado.every((p, c) => p >= minimos[c] - 0.01)) break;
  }
  return resultado;
}

const MARGENES_CELDA = { top: 50, bottom: 50, left: 110, right: 110 };

const fondo = (color: string | undefined) =>
  color ? { type: ShadingType.CLEAR, color: 'auto', fill: color } : undefined;

/** Fila con un alto mínimo (crece si el texto no cabe). */
const altoMinimo = (twips: number | undefined) => (twips ? { value: twips, rule: HeightRule.ATLEAST } : undefined);

/** Contenido de una celda, ya preparado: sus párrafos y cómo debe ser la celda. */
interface ContenidoCelda {
  parrafos: Paragraph[];
  /** Alto mínimo de la fila para que haya sitio para escribir. */
  alto?: number;
  /** La celda es un recuadro de firma (va siempre en blanco). */
  firma?: boolean;
  alineacion: (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable];
  /** Fondo propio de la celda (las cajas para escribir llevan el gris suave de los campos). */
  fondo?: string;
}

/**
 * Prepara el contenido de una celda de tabla:
 *   - solo [linea] → un párrafo-campo (estilo "Campo para escribir": fondo gris suave y línea debajo);
 *   - solo [caja] o [caja-grande] → la celda vacía, más alta y con el fondo gris suave;
 *   - solo [firma: Texto] → la celda es el recuadro de firma: alta y con el texto pequeño abajo.
 *     No lleva borde discontinuo: la tabla ya la enmarca, y un borde propio de la celda choca con
 *     las líneas de la tabla (LibreOffice lo dibuja a medias);
 *   - solo casillas → centradas;
 *   - cualquier otra cosa → texto normal, con sus casillas y huecos dentro.
 */
function contenidoCelda(linea: Linea, ancho: number, estilo: string, conservar = false): ContenidoCelda {
  // "Conservar con el siguiente" en todos los párrafos de la fila: así Word no separa la fila de lo que sigue.
  const atado = conservar ? { keepNext: true } : {};
  const vacio = (alto: number): ContenidoCelda => ({
    parrafos: [new Paragraph({ style: estilo, ...atado })],
    alto,
    alineacion: VerticalAlignTable.CENTER,
    fondo: FONDO_CAMPO,
  });
  if (esSolo(linea, 'linea')) {
    return {
      parrafos: [new Paragraph({ style: ESTILO.campo, ...atado })],
      alto: MEDIDA.altoFila,
      alineacion: VerticalAlignTable.CENTER,
    };
  }
  if (esSolo(linea, 'caja')) return vacio(MEDIDA.altoCaja);
  if (esSolo(linea, 'caja-grande')) return vacio(MEDIDA.altoCajaGrande);

  const firma = firmaSola(linea);
  if (firma !== null) {
    return {
      parrafos: [new Paragraph({ style: ESTILO.textoFirma, ...atado, children: [new TextRun(firma)] })],
      alto: MEDIDA.altoFirma,
      firma: true,
      alineacion: VerticalAlignTable.BOTTOM,
    };
  }

  const centrar = soloCasillas(linea);
  return {
    parrafos: [
      new Paragraph({
        style: estilo,
        ...atado,
        alignment: centrar ? AlignmentType.CENTER : undefined,
        children: lineaARuns(linea, medidaCelda(ancho)),
      }),
    ],
    alineacion: VerticalAlignTable.CENTER,
  };
}

function crearTabla(b: Extract<Bloque, { tipo: 'tabla' }>, paleta: Paleta, conservar = false): Table {
  const anchos = anchosEnTwips(porcentajesColumnas(b.cabecera, b.filas, b.primeraColumnaEtiquetas));

  const cabecera = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: b.cabecera.map(
      (l, c) =>
        new TableCell({
          width: { size: anchos[c], type: WidthType.DXA },
          verticalAlign: VerticalAlignTable.CENTER,
          shading: fondo(paleta.principal),
          children: [new Paragraph({ style: ESTILO.cabeceraTabla, children: lineaARuns(l, medidaCelda(anchos[c])) })],
        }),
    ),
  });

  const filas = b.filas.map((fila, i) => {
    const contenidos = anchos.map((ancho, c) =>
      contenidoCelda(
        fila[c] ?? [],
        ancho,
        b.primeraColumnaEtiquetas && c === 0 ? ESTILO.etiquetaTabla : ESTILO.textoTabla,
        conservar,
      ),
    );
    const alto = Math.max(0, ...contenidos.map((x) => x.alto ?? 0));
    return new TableRow({
      cantSplit: true,
      height: altoMinimo(alto),
      children: contenidos.map(
        (x, c) =>
          new TableCell({
            width: { size: anchos[c], type: WidthType.DXA },
            verticalAlign: x.alineacion,
            // Los recuadros de firma van siempre en blanco, también en las filas alternas.
            shading: fondo(x.fondo ?? (i % 2 === 1 && !x.firma ? paleta.fondoFilas : undefined)),
            children: x.parrafos,
          }),
      ),
    });
  });

  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: bordesTabla(borde(GRIS_BORDE)),
    margins: MARGENES_CELDA,
    rows: [cabecera, ...filas],
  });
}

// --- Tabla de datos, cajas y firmas ---

/**
 * "::: tabla-datos": dos columnas, la etiqueta en negrita sobre el fondo suave del color y el
 * contenido a la derecha. Solo lleva líneas horizontales: así la línea de debajo de cada fila
 * es la línea sobre la que se escribe.
 */
function crearTablaDatos(b: Extract<Bloque, { tipo: 'tabla-datos' }>, paleta: Paleta): Table {
  const anchos = anchosEnTwips([38, 62]);
  const linea = borde(GRIS_BORDE);
  const filas = b.filas.map((f) => {
    const contenido = contenidoCelda(f.contenido, anchos[1], ESTILO.textoTabla);
    const alto = Math.max(MEDIDA.altoFila, contenido.alto ?? 0);
    return new TableRow({
      cantSplit: true,
      height: altoMinimo(alto),
      children: [
        new TableCell({
          width: { size: anchos[0], type: WidthType.DXA },
          verticalAlign: VerticalAlignTable.CENTER,
          shading: fondo(paleta.fondoSuave),
          children: [
            new Paragraph({ style: ESTILO.etiquetaTabla, children: lineaARuns(f.etiqueta, medidaCelda(anchos[0])) }),
          ],
        }),
        new TableCell({
          width: { size: anchos[1], type: WidthType.DXA },
          verticalAlign: contenido.alineacion,
          shading: fondo(contenido.fondo),
          children: contenido.parrafos,
        }),
      ],
    });
  });

  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: { ...bordesTabla(null), top: linea, bottom: linea, insideHorizontal: linea },
    margins: MARGENES_CELDA,
    rows: filas,
  });
}

/** Borde de las cajas para escribir. */
const BORDE_CAJA = borde(GRIS, 4);

/** [caja] o [caja-grande] en un párrafo propio: una tabla de una celda con borde gris, fondo gris suave y alto mínimo. */
function crearCaja(alto: number, conservar = false): Table {
  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: [ANCHO_UTIL],
    layout: TableLayoutType.FIXED,
    borders: bordesTabla(BORDE_CAJA),
    margins: MARGENES_CELDA,
    rows: [
      new TableRow({
        cantSplit: true,
        height: altoMinimo(alto),
        children: [
          new TableCell({
            width: { size: ANCHO_UTIL, type: WidthType.DXA },
            shading: fondo(FONDO_CAMPO),
            children: [new Paragraph({ keepNext: conservar || undefined })],
          }),
        ],
      }),
    ],
  });
}

/**
 * Celdas de una línea con recuadro de firma, ya partida en trozos (ver partirPorFirma):
 * el recuadro es una celda con borde discontinuo y el texto pequeño abajo; el texto normal va
 * en su propia celda, centrado en vertical respecto al recuadro.
 */
function celdasFirma(
  segmentos: Segmento[],
  anchos: number[],
  ctx: Contexto,
  spans: number[] = [],
  fondoTexto?: string,
): TableCell[] {
  return segmentos.map((s, i) => {
    const comun = {
      width: { size: anchos[i], type: WidthType.DXA },
      columnSpan: spans[i] && spans[i] > 1 ? spans[i] : undefined,
    };
    if (s.tipo === 'firma') {
      return new TableCell({
        ...comun,
        verticalAlign: VerticalAlignTable.BOTTOM,
        borders: BORDES_FIRMA,
        // Un poco de aire bajo el texto, para que la línea discontinua no lo pise.
        margins: { top: 0, bottom: 60, left: 110, right: 110 },
        shading: fondo('FFFFFF'),
        children: [new Paragraph({ style: ESTILO.textoFirma, children: [new TextRun(s.texto)] })],
      });
    }
    const medida = medidaCelda(anchos[i], ctx.estiloParrafo ? TAMANO_PT.nota : TAMANO_PT.cuerpo);
    return new TableCell({
      ...comun,
      verticalAlign: VerticalAlignTable.CENTER,
      borders: SIN_BORDES_CELDA,
      shading: fondo(fondoTexto),
      children: [new Paragraph({ style: ctx.estiloParrafo, spacing: { after: 0 }, children: lineaARuns(s.linea, medida) })],
    });
  });
}

/** Si la línea solo es el recuadro de firma, se le añade un hueco vacío al lado (el recuadro ocupa la mitad). */
const conRelleno = (segmentos: Segmento[]): Segmento[] =>
  segmentos.length === 1 ? [...segmentos, { tipo: 'texto', linea: [] }] : segmentos;

/**
 * Línea con recuadro de firma, por ejemplo "**Firma del titular en caso de rechazo:** [firma: Firma]":
 * una tabla sin bordes con un trozo en cada celda, a partes iguales.
 */
function crearLineaFirma(linea: Linea, ctx: Contexto): Table {
  if (tieneCaja(linea)) throw new ErrorGenerador('Una caja no puede ir en la misma línea que un recuadro de firma.');
  const segmentos = conRelleno(partirPorFirma(linea));
  const anchos = anchosEnTwips(segmentos.map(() => 100 / segmentos.length));
  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: bordesTabla(null),
    margins: MARGENES_CELDA,
    rows: [
      new TableRow({ cantSplit: true, height: altoMinimo(MEDIDA.altoFirmaLinea), children: celdasFirma(segmentos, anchos, ctx) }),
    ],
  });
}

/** Margen lateral del recuadro destacado (también es el ancho de sus columnas de relleno). */
const MARGEN_DESTACADO = 200;

/**
 * Recuadro destacado: una tabla con borde del color de la clínica y fondo suave.
 *
 * Normalmente tiene una sola celda. Si dentro hay una línea con recuadro de firma (como en la
 * revocación), esa línea va en una fila propia de la misma tabla, en lugar de meter una tabla
 * dentro de otra (Google Docs las descuadra). Esa fila lleva una columna estrecha de relleno a
 * cada lado, para que el borde discontinuo de la firma no se coma el borde de color del recuadro.
 */
function crearDestacado(bloques: Bloque[], ctx: Contexto): Table {
  const interior: Contexto = { ...ctx, estiloParrafo: undefined };
  ctx.estado.trasTabla = false;
  const esLineaFirma = (b: Bloque) => b.tipo === 'parrafo' && tieneFirma(b.contenido);
  for (const b of bloques) {
    if (b.tipo === 'parrafo' && (esSolo(b.contenido, 'caja') || esSolo(b.contenido, 'caja-grande'))) {
      throw new ErrorGenerador('Un [caja] no puede ir dentro de un recuadro "::: destacado".');
    }
  }

  // Columnas: relleno + tantas columnas como trozos tenga la línea de firma más larga + relleno.
  const trozos = Math.max(
    1,
    ...bloques.filter(esLineaFirma).map((b) => conRelleno(partirPorFirma((b as { contenido: Linea }).contenido)).length),
  );
  const hayFirma = bloques.some(esLineaFirma);
  const anchoTrozo = Math.floor((ANCHO_UTIL - (hayFirma ? 2 * MARGEN_DESTACADO : 0)) / trozos);
  const columnas = hayFirma
    ? [MARGEN_DESTACADO, ...Array.from({ length: trozos }, () => anchoTrozo), MARGEN_DESTACADO]
    : [ANCHO_UTIL];
  columnas[columnas.length - 1] += ANCHO_UTIL - columnas.reduce((a, b) => a + b, 0);
  const totalColumnas = columnas.length;

  // Columna de relleno: por fuera lleva el borde de color del recuadro; por dentro, ninguno
  // (si no, aparece una raya suelta junto a la firma).
  const bordeRecuadro = borde(ctx.paleta.principal, 8);
  const celdaRelleno = (ancho: number, lado: 'left' | 'right') =>
    new TableCell({
      width: { size: ancho, type: WidthType.DXA },
      borders: { ...SIN_BORDES_CELDA, [lado]: bordeRecuadro },
      shading: fondo(ctx.paleta.fondoSuave),
      children: [new Paragraph({ style: ESTILO.pie })],
    });

  const filas: TableRow[] = [];
  let pendientes: Bloque[] = [];

  /** Los bloques normales seguidos van juntos en una fila que ocupa todo el ancho. */
  const cerrarTexto = () => {
    if (pendientes.length === 0) return;
    const contenido = crearBloques(pendientes, interior);
    pendientes = [];
    filas.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: ANCHO_UTIL, type: WidthType.DXA },
            columnSpan: totalColumnas > 1 ? totalColumnas : undefined,
            shading: fondo(ctx.paleta.fondoSuave),
            margins: { top: 150, bottom: 50, left: MARGEN_DESTACADO, right: MARGEN_DESTACADO },
            children: contenido.length > 0 ? contenido : [new Paragraph({})],
          }),
        ],
      }),
    );
  };

  for (const b of bloques) {
    if (!esLineaFirma(b)) {
      pendientes.push(b);
      continue;
    }
    cerrarTexto();
    const segmentos = conRelleno(partirPorFirma((b as { contenido: Linea }).contenido));
    // Si la línea tiene menos trozos que columnas, el último trozo ocupa las que sobran.
    const spans = segmentos.map((_, i) => (i === segmentos.length - 1 ? trozos - segmentos.length + 1 : 1));
    const anchos = spans.map((s) => s * anchoTrozo);
    const celdas = celdasFirma(segmentos, anchos, interior, spans, ctx.paleta.fondoSuave);
    filas.push(
      new TableRow({
        cantSplit: true,
        height: altoMinimo(MEDIDA.altoFirmaLinea),
        children: [celdaRelleno(columnas[0], 'left'), ...celdas, celdaRelleno(columnas[columnas.length - 1], 'right')],
      }),
    );
    // Una fila de relleno debajo, para que el recuadro de firma no toque el borde inferior.
    filas.push(
      new TableRow({
        cantSplit: true,
        height: { value: 150, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            width: { size: ANCHO_UTIL, type: WidthType.DXA },
            columnSpan: totalColumnas,
            shading: fondo(ctx.paleta.fondoSuave),
            children: [new Paragraph({ style: ESTILO.pie })],
          }),
        ],
      }),
    );
  }
  cerrarTexto();

  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: columnas,
    layout: TableLayoutType.FIXED,
    borders: bordesTabla(borde(ctx.paleta.principal, 8), null),
    margins: { top: 0, bottom: 0, left: 110, right: 110 },
    rows: filas,
  });
}

// --- Cabecera con el logo y los datos de la clínica ---

/** Runs de un dato de la clínica (en amarillo si falta). */
function dato(variable: Variable, datos: DatosClinica): TextRun {
  const r = resolverVariable(variable, datos);
  return new TextRun({ text: r.texto, ...marcaPendiente(r.vacio) });
}

/**
 * Cabecera de la primera página: tabla sin bordes con el logo a la izquierda y los datos
 * de la clínica a la derecha, y una línea del color de la clínica debajo.
 */
function crearCabeceraClinica(datos: DatosClinica, paleta: Paleta, logo: Logo | null): Table {
  const anchos = anchosEnTwips([35, 65]);
  const lleno = (s: string) => s.trim() !== '';
  const separador = () => new TextRun(' · ');

  // Línea del correo y la web (la web es opcional: si no hay, no se pone hueco).
  const lineaContacto: ParagraphChild[] = [dato('EMAIL', datos)];
  if (lleno(datos.web)) lineaContacto.push(separador(), dato('WEB', datos));

  // Línea legal: razón social (solo si es distinta del nombre comercial) y CIF.
  const lineaLegal: ParagraphChild[] = [];
  if (lleno(datos.razonSocial) && datos.razonSocial.trim() !== datos.nombreClinica.trim()) {
    lineaLegal.push(dato('RAZON_SOCIAL', datos), separador());
  }
  if (lleno(datos.cif)) lineaLegal.push(new TextRun('CIF '));
  lineaLegal.push(dato('CIF', datos));

  const telefonos: ParagraphChild[] = lleno(datos.telefonos)
    ? [new TextRun('Tel. '), dato('TELEFONOS', datos)]
    : [dato('TELEFONOS', datos)];

  const parrafosDatos = [
    new Paragraph({ style: ESTILO.nombreClinica, children: [dato('NOMBRE_CLINICA', datos)] }),
    new Paragraph({ style: ESTILO.datosClinica, children: [dato('DIRECCION', datos)] }),
    new Paragraph({ style: ESTILO.datosClinica, children: telefonos }),
    new Paragraph({ style: ESTILO.datosClinica, children: lineaContacto }),
    new Paragraph({ style: ESTILO.datosClinica, children: lineaLegal }),
  ];

  const celda = (hijos: Paragraph[], c: number) =>
    new TableCell({
      width: { size: anchos[c], type: WidthType.DXA },
      verticalAlign: VerticalAlignTable.CENTER,
      children: hijos,
    });

  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: { ...bordesTabla(null), bottom: borde(paleta.principal, 12) },
    margins: { top: 0, bottom: 140, left: 0, right: 0 },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [celda([crearParrafoLogo(logo)], 0), celda(parrafosDatos, 1)],
      }),
    ],
  });
}

function crearParrafoLogo(logo: Logo | null): Paragraph {
  if (!logo) return new Paragraph({ style: ESTILO.datosClinica, alignment: AlignmentType.LEFT });
  const medidas = encajar(leerMedidas(logo.datos), LOGO_MAXIMO);
  return new Paragraph({
    style: ESTILO.datosClinica,
    alignment: AlignmentType.LEFT,
    children: [
      new ImageRun({
        type: logo.tipo,
        data: logo.datos,
        transformation: { width: medidas.ancho, height: medidas.alto },
        altText: { name: 'Logo', title: 'Logo de la clínica', description: 'Logo de la clínica' },
      }),
    ],
  });
}

// --- Encabezado de la página 2 en adelante ---

/**
 * Encabezado de Word de la página 2 en adelante: solo el nombre de la clínica, en una línea de
 * texto con una raya fina debajo (D47). La primera página no lo lleva: allí está la cabecera completa.
 * Es texto sencillo, sin tabla ni imagen, para que aguante bien en Google Docs y LibreOffice.
 */
function crearEncabezado(datos: DatosClinica): Header {
  return new Header({ children: [new Paragraph({ style: ESTILO.encabezado, children: [dato('NOMBRE_CLINICA', datos)] })] });
}

// --- Pie de página ---

/** "Iniciales del titular" → "Iniciales del titular:" (si ya acaba en dos puntos, se deja igual). */
const conDosPuntos = (texto: string) => (texto.trimEnd().endsWith(':') ? texto : `${texto.trimEnd()}:`);

/**
 * Pie: "{pie} · Modelo v1.0" a la izquierda, la casilla de iniciales (solo si el documento
 * la lleva) y "Página X de Y" a la derecha, con campos de Word que se actualizan solos.
 */
function crearPie(textoPie: string, iniciales: string | null): Footer {
  const textoIzquierda = new Paragraph({
    style: ESTILO.pie,
    children: [new TextRun(`${textoPie} · Modelo ${VERSION_MODELO}`)],
  });
  const pagina = new Paragraph({
    style: ESTILO.pie,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES] })],
  });

  const porcentajes = iniciales ? [48, 24, 10, 18] : [75, 25];
  const anchos = anchosEnTwips(porcentajes);
  const celda = (hijos: Paragraph[], c: number, bordes?: ReturnType<typeof bordesTabla>, margenes?: { right: number }) =>
    new TableCell({
      width: { size: anchos[c], type: WidthType.DXA },
      verticalAlign: VerticalAlignTable.CENTER,
      borders: bordes,
      margins: margenes,
      children: hijos,
    });

  const celdas = iniciales
    ? [
        celda([textoIzquierda], 0),
        celda([new Paragraph({ style: ESTILO.pie, alignment: AlignmentType.RIGHT, children: [new TextRun(conDosPuntos(iniciales))] })], 1, undefined, {
          right: 100,
        }),
        celda([new Paragraph({ style: ESTILO.pie })], 2, bordesTabla(borde(GRIS, 6))),
        celda([pagina], 3),
      ]
    : [celda([textoIzquierda], 0), celda([pagina], 1)];

  return new Footer({
    children: [
      new Table({
        width: { size: ANCHO_UTIL, type: WidthType.DXA },
        columnWidths: anchos,
        layout: TableLayoutType.FIXED,
        borders: { ...bordesTabla(null), top: borde(GRIS_BORDE) },
        margins: { top: 100, bottom: 0, left: 0, right: 0 },
        rows: [new TableRow({ cantSplit: true, height: { value: 420, rule: HeightRule.ATLEAST }, children: celdas })],
      }),
    ],
  });
}
