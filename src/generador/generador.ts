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
import { COLOR_POR_DEFECTO, GRIS, GRIS_BORDE, crearPaleta, type Paleta } from './color.ts';
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
const MARGEN = 2 * CM;
/** Ancho útil entre márgenes: 21 cm − 2 × 2 cm = 17 cm. */
const ANCHO_UTIL = A4.ancho - 2 * MARGEN;

/** Tamaño máximo del logo en píxeles de pantalla (96 por pulgada): 5 cm de ancho × 2,6 cm de alto. */
const LOGO_MAXIMO = { ancho: 189, alto: 98 };

/** Reparte el ancho útil en columnas según porcentajes. La última columna recoge el redondeo. */
function anchosEnTwips(porcentajes: number[]): number[] {
  const anchos = porcentajes.map((p) => Math.round((ANCHO_UTIL * p) / 100));
  anchos[anchos.length - 1] += ANCHO_UTIL - anchos.reduce((a, b) => a + b, 0);
  return anchos;
}

// --- Bordes ---

const SIN_BORDE: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const borde = (color: string, grosor = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size: grosor, color });

/** Borde discontinuo de los recuadros de firma. */
const BORDE_FIRMA: IBorderOptions = { style: BorderStyle.DASHED, size: 6, color: GRIS };
const BORDES_FIRMA = { top: BORDE_FIRMA, bottom: BORDE_FIRMA, left: BORDE_FIRMA, right: BORDE_FIRMA };

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
  };
}

/** Crea el documento de Word en memoria (sin convertirlo todavía en archivo). */
export function crearDocumentoWord(doc: Documento, opciones: OpcionesGenerador): Document {
  const paleta = crearPaleta(opciones.color ?? COLOR_POR_DEFECTO);
  const ctx: Contexto = { paleta, listasNumeradas: { n: 0 }, estado: { salto: false, trasTabla: false } };
  const { cabecera } = doc;

  const cuerpo: (Paragraph | Table)[] = [
    crearCabeceraClinica(opciones.datos, paleta, opciones.logo ?? null),
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(cabecera.titulo)] }),
    new Paragraph({ style: ESTILO.subtitulo, children: [new TextRun(cabecera.subtitulo)] }),
    ...crearBloques(doc.bloques, ctx),
  ];

  const nombre = resolverVariable('NOMBRE_CLINICA', opciones.datos);
  return new Document({
    creator: nombre.vacio ? 'Kit de consentimientos de anestesia' : nombre.texto,
    title: cabecera.titulo,
    description: `${cabecera.pie} · Modelo ${VERSION_MODELO}`,
    styles: crearEstilos(paleta),
    numbering: crearNumeraciones(paleta),
    sections: [
      {
        properties: {
          page: {
            size: { width: A4.ancho, height: A4.alto },
            margin: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN, header: CM, footer: Math.round(0.8 * CM) },
          },
        },
        footers: { default: crearPie(cabecera.pie, cabecera.inicialesEnPie) },
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
const TAMANO_PT = { cuerpo: 10, tabla: 9.5, nota: 8.5 };

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
        const texto = trasCasilla ? ' ' + t.texto.slice(1) : t.texto;
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
  return new Paragraph({ ...opciones, ...aire, pageBreakBefore: salto || undefined });
}

// --- Bloques ---

function crearBloques(bloques: Bloque[], ctx: Contexto): (Paragraph | Table)[] {
  const salida: (Paragraph | Table)[] = [];
  for (const b of bloques) {
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
      if (esSolo(b.contenido, 'caja')) return [crearCaja(MEDIDA.altoCaja)];
      if (esSolo(b.contenido, 'caja-grande')) return [crearCaja(MEDIDA.altoCajaGrande)];
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
      return [crearTabla(b, ctx.paleta)];
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
function porcentajesColumnas(filas: Linea[][]): number[] {
  const columnas = filas[0].length;
  const pesos = Array.from({ length: columnas }, (_, c) =>
    Math.min(50, Math.max(5, ...filas.map((f) => textoPlano(f[c] ?? []).length))),
  );
  let porcentajes = pesos.map((p) => (p * 100) / pesos.reduce((a, b) => a + b, 0));
  const MINIMO = 10;
  const estrechas = porcentajes.filter((p) => p < MINIMO).length;
  if (estrechas > 0) {
    const sobrante = 100 - MINIMO * estrechas;
    const anchas = porcentajes.filter((p) => p >= MINIMO).reduce((a, b) => a + b, 0);
    porcentajes = porcentajes.map((p) => (p < MINIMO ? MINIMO : (p * sobrante) / anchas));
  }
  return porcentajes;
}

const MARGENES_CELDA = { top: 70, bottom: 70, left: 110, right: 110 };

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
}

/**
 * Prepara el contenido de una celda de tabla:
 *   - solo [linea] → la celda entera es el hueco (vacía, con sitio para escribir);
 *   - solo [caja] o [caja-grande] → la celda vacía y más alta;
 *   - solo [firma: Texto] → la celda es el recuadro de firma: alta y con el texto pequeño abajo.
 *     No lleva borde discontinuo: la tabla ya la enmarca, y un borde propio de la celda choca con
 *     las líneas de la tabla (LibreOffice lo dibuja a medias);
 *   - solo casillas → centradas;
 *   - cualquier otra cosa → texto normal, con sus casillas y huecos dentro.
 */
function contenidoCelda(linea: Linea, ancho: number, estilo: string): ContenidoCelda {
  const vacio = (alto: number): ContenidoCelda => ({
    parrafos: [new Paragraph({ style: estilo })],
    alto,
    alineacion: VerticalAlignTable.CENTER,
  });
  if (esSolo(linea, 'linea')) return vacio(MEDIDA.altoFila);
  if (esSolo(linea, 'caja')) return vacio(MEDIDA.altoCaja);
  if (esSolo(linea, 'caja-grande')) return vacio(MEDIDA.altoCajaGrande);

  const firma = firmaSola(linea);
  if (firma !== null) {
    return {
      parrafos: [new Paragraph({ style: ESTILO.textoFirma, children: [new TextRun(firma)] })],
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
        alignment: centrar ? AlignmentType.CENTER : undefined,
        children: lineaARuns(linea, medidaCelda(ancho)),
      }),
    ],
    alineacion: VerticalAlignTable.CENTER,
  };
}

function crearTabla(b: Extract<Bloque, { tipo: 'tabla' }>, paleta: Paleta): Table {
  const anchos = anchosEnTwips(porcentajesColumnas([b.cabecera, ...b.filas]));

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
      contenidoCelda(fila[c] ?? [], ancho, b.primeraColumnaEtiquetas && c === 0 ? ESTILO.etiquetaTabla : ESTILO.textoTabla),
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
            shading: fondo(i % 2 === 1 && !x.firma ? paleta.fondoFilas : undefined),
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
    // En una fila alta (una caja), la etiqueta va arriba, a la altura de donde se empieza a escribir.
    const alineacionEtiqueta = alto > MEDIDA.altoFila ? VerticalAlignTable.TOP : VerticalAlignTable.CENTER;
    return new TableRow({
      cantSplit: true,
      height: altoMinimo(alto),
      children: [
        new TableCell({
          width: { size: anchos[0], type: WidthType.DXA },
          verticalAlign: alineacionEtiqueta,
          shading: fondo(paleta.fondoSuave),
          children: [
            new Paragraph({ style: ESTILO.etiquetaTabla, children: lineaARuns(f.etiqueta, medidaCelda(anchos[0])) }),
          ],
        }),
        new TableCell({
          width: { size: anchos[1], type: WidthType.DXA },
          verticalAlign: contenido.alineacion,
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

/** [caja] o [caja-grande] en un párrafo propio: una tabla de una celda con borde gris y alto fijo. */
function crearCaja(alto: number): Table {
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
        children: [new TableCell({ width: { size: ANCHO_UTIL, type: WidthType.DXA }, children: [new Paragraph({})] })],
      }),
    ],
  });
}

/**
 * Celdas de una línea con recuadro de firma, ya partida en trozos (ver partirPorFirma):
 * el recuadro es una celda con borde discontinuo y el texto pequeño abajo; el texto normal va
 * en su propia celda, alineado abajo para que quede a la altura del final del recuadro.
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
      verticalAlign: VerticalAlignTable.BOTTOM,
    };
    if (s.tipo === 'firma') {
      return new TableCell({
        ...comun,
        borders: BORDES_FIRMA,
        shading: fondo('FFFFFF'),
        children: [new Paragraph({ style: ESTILO.textoFirma, children: [new TextRun(s.texto)] })],
      });
    }
    const medida = medidaCelda(anchos[i], ctx.estiloParrafo ? TAMANO_PT.nota : TAMANO_PT.cuerpo);
    return new TableCell({
      ...comun,
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
    rows: [new TableRow({ cantSplit: true, height: altoMinimo(MEDIDA.altoFirma), children: celdasFirma(segmentos, anchos, ctx) })],
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

  const celdaRelleno = (ancho: number) =>
    new TableCell({ width: { size: ancho, type: WidthType.DXA }, shading: fondo(ctx.paleta.fondoSuave), children: [new Paragraph({})] });

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
        height: altoMinimo(MEDIDA.altoFirma),
        children: [celdaRelleno(columnas[0]), ...celdas, celdaRelleno(columnas[columnas.length - 1])],
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
      verticalAlign: VerticalAlignTable.BOTTOM,
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

// --- Pie de página ---

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
        celda([new Paragraph({ style: ESTILO.pie, alignment: AlignmentType.RIGHT, children: [new TextRun(iniciales)] })], 1, undefined, {
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
