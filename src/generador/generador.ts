// Generador de Word: convierte un Documento (lo que devuelve el lector) en un archivo .docx.
//
// No usa nada propio de Node ni del navegador, así que funciona en los dos:
//   - en la web, para que la clínica descargue sus documentos;
//   - en scripts/muestras.ts, para fabricar las muestras sin abrir la web.
//
// Tarea T3: página, estilos, cabecera con logo, pie, títulos, párrafos, listas, tablas,
// recuadros destacados, notas y letra pequeña.
// Tarea T4 (pendiente): tabla de datos, casillas, huecos, cajas y firmas. Si el texto los usa,
// el generador avisa con un ErrorGenerador en lugar de dibujarlos mal.

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  HeightRule,
  ImageRun,
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
import { ESTILO, LISTA, crearEstilos, crearNumeraciones } from './estilos.ts';
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

function tramoARuns(t: Tramo): ParagraphChild[] {
  switch (t.tipo) {
    case 'texto':
      return [new TextRun({ text: t.texto, bold: t.negrita || undefined, italics: t.cursiva || undefined })];
    case 'dato':
      return [
        new TextRun({
          text: t.texto,
          bold: t.negrita || undefined,
          italics: t.cursiva || undefined,
          ...marcaPendiente(t.vacio),
        }),
      ];
    default:
      throw new ErrorGenerador(`El elemento "${t.tipo}" todavía no se puede dibujar: llega en la tarea T4.`);
  }
}

/**
 * Formato de un dato que falta: estilo de carácter "Dato pendiente" y, además, el resaltado
 * amarillo puesto en el propio texto. El resaltado va repetido a propósito: LibreOffice y
 * Google Docs no muestran el resaltado que viene solo en un estilo de carácter.
 */
const marcaPendiente = (vacio: boolean) =>
  vacio ? { style: ESTILO.datoPendiente, highlight: 'yellow' as const } : {};

const lineaARuns = (linea: Linea): ParagraphChild[] => linea.flatMap(tramoARuns);

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
    if (ctx.estado.salto && esTabla(b)) {
      salida.push(new Paragraph({ children: [new PageBreak()] }));
      ctx.estado.salto = false;
    }
    salida.push(...crearBloque(b, ctx));
    if (esTabla(b)) ctx.estado.trasTabla = true;
  }
  return salida;
}

const esTabla = (b: Bloque) => b.tipo === 'tabla' || b.tipo === 'destacado' || b.tipo === 'tabla-datos';

function crearBloque(b: Bloque, ctx: Contexto): (Paragraph | Table)[] {
  switch (b.tipo) {
    case 'titulo1':
      return [parrafo(ctx, { heading: HeadingLevel.HEADING_1, children: lineaARuns(b.contenido) })];
    case 'titulo2':
      return [parrafo(ctx, { heading: HeadingLevel.HEADING_2, children: lineaARuns(b.contenido) })];
    case 'parrafo':
      return [parrafo(ctx, { style: ctx.estiloParrafo, children: lineaARuns(b.contenido) })];
    case 'lista': {
      const referencia = b.numerada ? LISTA.numeros : LISTA.vinetas;
      const instancia = b.numerada ? ++ctx.listasNumeradas.n : 0;
      return b.elementos.map((e) =>
        parrafo(ctx, {
          style: ctx.estiloParrafo ?? ESTILO.elementoLista,
          numbering: { reference: referencia, level: 0, instance: instancia },
          children: lineaARuns(e),
        }),
      );
    }
    case 'tabla':
      return [crearTabla(b, ctx.paleta)];
    case 'destacado':
      return [crearDestacado(b.bloques, ctx)];
    case 'nota':
      return crearBloques(b.bloques, { ...ctx, estiloParrafo: ESTILO.nota });
    case 'letra-pequena':
      return crearBloques(b.bloques, { ...ctx, estiloParrafo: ESTILO.letraPequena });
    case 'salto-de-pagina':
      ctx.estado.salto = true;
      return [];
    case 'tabla-datos':
    case 'firma':
      throw new ErrorGenerador(`El bloque "::: ${b.tipo}" todavía no se puede dibujar: llega en la tarea T4.`);
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

function crearTabla(b: Extract<Bloque, { tipo: 'tabla' }>, paleta: Paleta): Table {
  const anchos = anchosEnTwips(porcentajesColumnas([b.cabecera, ...b.filas]));

  const celda = (linea: Linea, c: number, estilo: string, fondo?: string) =>
    new TableCell({
      width: { size: anchos[c], type: WidthType.DXA },
      verticalAlign: VerticalAlignTable.CENTER,
      shading: fondo ? { type: ShadingType.CLEAR, color: 'auto', fill: fondo } : undefined,
      children: [new Paragraph({ style: estilo, children: lineaARuns(linea) })],
    });

  const cabecera = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: b.cabecera.map((l, c) => celda(l, c, ESTILO.cabeceraTabla, paleta.principal)),
  });

  const filas = b.filas.map(
    (fila, i) =>
      new TableRow({
        cantSplit: true,
        children: anchos.map((_, c) =>
          celda(
            fila[c] ?? [],
            c,
            b.primeraColumnaEtiquetas && c === 0 ? ESTILO.etiquetaTabla : ESTILO.textoTabla,
            i % 2 === 1 ? paleta.fondoFilas : undefined,
          ),
        ),
      }),
  );

  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: anchos,
    layout: TableLayoutType.FIXED,
    borders: bordesTabla(borde(GRIS_BORDE)),
    margins: MARGENES_CELDA,
    rows: [cabecera, ...filas],
  });
}

/** Recuadro destacado: una tabla de una sola celda con borde del color y fondo suave. */
function crearDestacado(bloques: Bloque[], ctx: Contexto): Table {
  const contenido = crearBloques(bloques, { ...ctx, estiloParrafo: undefined });
  return new Table({
    width: { size: ANCHO_UTIL, type: WidthType.DXA },
    columnWidths: [ANCHO_UTIL],
    layout: TableLayoutType.FIXED,
    borders: bordesTabla(borde(ctx.paleta.principal, 8), null),
    margins: { top: 150, bottom: 50, left: 200, right: 200 },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: ANCHO_UTIL, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: ctx.paleta.fondoSuave },
            children: contenido.length > 0 ? contenido : [new Paragraph({})],
          }),
        ],
      }),
    ],
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
