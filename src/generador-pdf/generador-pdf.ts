// Generador de PDF (tarea T10): convierte un Documento (lo que devuelve el lector) en un PDF.
//
// Hace lo mismo que el generador de Word (src/generador/generador.ts), pieza a pieza, y con sus
// mismas medidas: página A4 y márgenes, tamaños de letra, espacios entre párrafos, colores de la
// clínica, huecos, casillas, cajas, firmas, cabecera con el logo y pie con "Página X de Y" (D59).
// Las medidas y las reglas se importan del generador de Word, para que no haya dos copias que
// puedan acabar distintas.
//
// La librería pdfmake recibe una descripción del documento (párrafos, tablas, columnas…) y decide
// ella dónde corta cada página. Este archivo solo prepara esa descripción: no carga pdfmake.
// Quien lo llama le pasa una "fábrica" ya preparada con las fuentes (ver fuentes.ts), así que
// funciona igual en la web y en `npm run muestras`.
//
// Unidades: el Word se mide en twips (vigésimos de punto); pdfmake, en puntos. pt(x) convierte.

import type { Bloque, DatosClinica, Documento, Linea, Variable } from '../contenido/tipos.ts';
import { resolverVariable } from '../contenido/variables.ts';
import { COLOR_POR_DEFECTO, FONDO_CAMPO, GRIS, GRIS_BORDE, TEXTO_OSCURO, crearPaleta, type Paleta } from '../generador/color.ts';
import { ESPACIADO, INTERLINEADO, SANGRIA_LISTA, TAMANO } from '../generador/estilos.ts';
import {
  CASILLA,
  CASILLA_MARCADA,
  MEDIDA,
  anchoLineaRestante,
  esSolo,
  firmaSola,
  partirPorFirma,
  soloCasillas,
  textoHueco,
  textoJuntoACasillas,
  tieneCaja,
  tieneFirma,
  valorDe,
  type Medida,
  type Segmento,
} from '../generador/formulario.ts';
import {
  AIRE_TRAS_TABLA,
  ANCHO_UTIL,
  ErrorGenerador,
  LOGO_MAXIMO,
  MARCA,
  MARGEN,
  MARGEN_DESTACADO,
  MARGEN_LATERAL_CELDA,
  MARGENES_CELDA,
  TAMANO_PT,
  VERSION_MODELO,
  bloquesAtadosAFirma,
  conRelleno,
  porcentajesColumnas,
  type OpcionesGenerador,
} from '../generador/generador.ts';
import { encajar, leerMedidas, type Logo } from '../generador/imagen.ts';
import { FUENTE_CASILLAS_PDF, FUENTE_PDF, type FabricaPdf } from './fuentes.ts';

/**
 * Una pieza de la descripción que entiende pdfmake (un párrafo, una tabla, unas columnas…).
 * Se deja abierta a propósito: los tipos de pdfmake no recogen todas las opciones que se usan.
 */
type Nodo = Record<string, unknown>;

/** Un trozo de texto de un párrafo (con su negrita, su color, su subrayado…). */
type Trozo = Record<string, unknown>;

// --- Medidas ---

/** Twips → puntos (20 twips = 1 pt). */
const pt = (twips: number) => twips / 20;

/** Ancho útil de la página en puntos (17,4 cm). */
const ANCHO_PT = pt(ANCHO_UTIL);

/** "2E6A80" → "#2E6A80" (pdfmake quiere los colores con almohadilla). */
const color = (hex: string) => `#${hex}`;

/**
 * Interlineado. En Word, una línea sencilla de Arial mide 1,15 veces el tamaño de la letra; pdfmake
 * mide 1,117 con Liberation Sans (no cuenta el espacio extra que Word sí suma). Este factor iguala
 * las dos, para que el texto ocupe lo mismo que en el Word.
 */
const FACTOR_LINEA_WORD = 1.15 / 1.117;

/** Interlineado de pdfmake para un interlineado de Word (240 = sencillo, 264 = 1,1 líneas…). */
const interlineado = (lineaWord: number = INTERLINEADO) => (lineaWord / 240) * FACTOR_LINEA_WORD;

/** Margen de pdfmake [izquierda, arriba, derecha, abajo] a partir del espacio antes y después de Word. */
const margen = (espacio: { before: number; after: number }, extraArriba = 0) => [
  0,
  pt(espacio.before) + extraArriba,
  0,
  pt(espacio.after),
];

/** Tamaños en puntos (en estilos.ts están en medios puntos). */
const TAM = Object.fromEntries(Object.entries(TAMANO).map(([k, v]) => [k, v / 2])) as Record<keyof typeof TAMANO, number>;

/** Grosor de las líneas: Word las mide en octavos de punto (4 = 0,5 pt). */
const LINEA_FINA = 0.5;

/** Relleno de las celdas normales (el de MARGENES_CELDA del Word). */
const RELLENO = { lado: pt(MARGENES_CELDA.left), arribaAbajo: pt(MARGENES_CELDA.top) };

// --- Estilos ---
// Como en el Word, cada tipo de texto tiene su estilo con nombre. Las medidas salen de estilos.ts.

function crearEstilos(paleta: Paleta): Record<string, Nodo> {
  const sencillo = interlineado(240);
  return {
    titulo: { fontSize: TAM.titulo, bold: true, color: color(TEXTO_OSCURO), lineHeight: sencillo },
    subtitulo: { fontSize: TAM.subtitulo, color: color(GRIS) },
    titulo1: { fontSize: TAM.titulo1, bold: true, color: color(paleta.principal), lineHeight: sencillo },
    titulo2: { fontSize: TAM.titulo2, bold: true, color: color(TEXTO_OSCURO), lineHeight: sencillo },
    nota: { fontSize: TAM.nota, color: color(GRIS), lineHeight: sencillo },
    letraPequena: { fontSize: TAM.nota, color: color(TEXTO_OSCURO), lineHeight: sencillo },
    textoTabla: { fontSize: TAM.tabla, lineHeight: sencillo },
    cabeceraTabla: { fontSize: TAM.tabla, bold: true, color: color(paleta.textoSobrePrincipal), lineHeight: sencillo },
    etiquetaTabla: { fontSize: TAM.tabla, bold: true, lineHeight: sencillo },
    nombreClinica: { fontSize: TAM.nombreClinica, bold: true, color: color(TEXTO_OSCURO), alignment: 'right', lineHeight: sencillo },
    datosClinica: { fontSize: TAM.datosClinica, color: color(GRIS), alignment: 'right', lineHeight: interlineado(252) },
    textoFirma: { fontSize: TAM.firma, color: color(GRIS), lineHeight: sencillo },
    pie: { fontSize: TAM.pie, color: color(GRIS), lineHeight: sencillo },
  };
}

/** Estilo de los párrafos dentro de un recuadro de nota o de letra pequeña (como estiloParrafo en el Word). */
type EstiloParrafo = 'nota' | 'letraPequena';

/** Espacio antes y después de cada estilo de párrafo. */
const ESPACIO_PARRAFO: Record<EstiloParrafo | 'normal', { before: number; after: number }> = {
  normal: ESPACIADO.normal,
  nota: ESPACIADO.nota,
  letraPequena: ESPACIADO.nota,
};

// --- Generador ---

/** Estado que se va pasando mientras se recorren los bloques (el mismo que en el Word). */
interface Contexto {
  paleta: Paleta;
  /** Estilo de los párrafos dentro de un recuadro de nota o de letra pequeña. */
  estiloParrafo?: EstiloParrafo;
  /** Ancho disponible en puntos (dentro de un recuadro destacado es menor que la página). */
  ancho: number;
  estado: {
    /** Hay un salto de página pendiente: el siguiente párrafo empieza en una página nueva. */
    salto: boolean;
    /** Lo último fue una tabla: el siguiente párrafo necesita un poco de aire por encima. */
    trasTabla: boolean;
    /** Lo que se está creando va atado a lo siguiente: es parte del texto que se firma (D56). */
    conservar: boolean;
    /**
     * Espacio (en puntos) que dejó debajo el párrafo anterior. Entre dos párrafos no se suman el
     * espacio de debajo de uno y el de encima del siguiente: cuenta el mayor, como al abrir el Word.
     */
    espacioDebajo: number;
  };
}

/**
 * Una pieza del cuerpo y si va "atada" a la siguiente (lo que en Word es "conservar con el siguiente").
 * Al final, las piezas atadas se juntan con la siguiente en un bloque que no se parte (ver agrupar).
 */
interface Pieza {
  nodo: Nodo;
  atar: boolean;
  /** Es una tabla (para saber si lo siguiente necesita aire por encima). */
  tabla?: boolean;
}

/** Prepara la descripción del documento que entiende pdfmake. */
export function crearDefinicionPdf(doc: Documento, opciones: OpcionesGenerador): Nodo {
  const paleta = crearPaleta(opciones.color ?? COLOR_POR_DEFECTO);
  const ctx: Contexto = {
    paleta,
    ancho: ANCHO_PT,
    // Lo último antes del cuerpo es el subtítulo, con su espacio debajo.
    estado: { salto: false, trasTabla: false, conservar: false, espacioDebajo: pt(ESPACIADO.subtitulo.after) },
  };
  const { cabecera } = doc;
  const logo = opciones.logo ?? null;

  const piezas: Pieza[] = [
    { nodo: crearCabeceraClinica(opciones.datos, paleta, logo), atar: false, tabla: true },
    { nodo: { text: cabecera.titulo, style: 'titulo', margin: margen(ESPACIADO.titulo) }, atar: true },
    { nodo: { text: cabecera.subtitulo, style: 'subtitulo', margin: margen(ESPACIADO.subtitulo) }, atar: true },
    ...crearBloques(doc.bloques, ctx),
  ];

  const nombre = resolverVariable('NOMBRE_CLINICA', opciones.datos);
  const margenes = [pt(MARGEN.lateral), pt(MARGEN.superior), pt(MARGEN.lateral), pt(MARGEN.inferior)];
  return {
    pageSize: 'A4',
    pageMargins: margenes,
    language: 'es-ES',
    info: {
      title: cabecera.titulo,
      author: nombre.vacio ? 'Kit de consentimientos de anestesia' : nombre.texto,
      subject: `${cabecera.pie} · Modelo ${VERSION_MODELO}`,
      creator: 'Kit de consentimientos de anestesia',
    },
    defaultStyle: {
      font: FUENTE_PDF,
      fontSize: TAM.cuerpo,
      color: color(TEXTO_OSCURO),
      lineHeight: interlineado(),
    },
    styles: crearEstilos(paleta),
    images: logo ? { logo: urlDeDatos(logo) } : {},
    header: (pagina: number) => (pagina === 1 ? null : crearEncabezado(opciones.datos)),
    footer: (pagina: number, total: number) => crearPie(cabecera.pie, cabecera.inicialesEnPie, pagina, total),
    content: agrupar(piezas),
  };
}

/**
 * Genera el PDF y lo devuelve como bytes. `fabrica` es pdfmake ya preparado con las fuentes
 * (ver prepararPdfMake en fuentes.ts).
 */
export async function generarPdf(doc: Documento, opciones: OpcionesGenerador, fabrica: FabricaPdf): Promise<Uint8Array> {
  return fabrica(crearDefinicionPdf(doc, opciones));
}

/**
 * Junta cada pieza atada con la siguiente en un bloque que no se parte entre páginas: así un título
 * nunca se queda solo al final de una página, y cada firma va con el texto que se firma (D56).
 * Es lo mismo que hace Word con "conservar con el siguiente".
 * Ojo: pdfmake no sabe partir un bloque así si ocupa más de una página. Los grupos de estos
 * documentos son cortos (un título y su párrafo, o una firma y hasta 3 bloques de texto).
 */
function agrupar(piezas: Pieza[]): Nodo[] {
  const salida: Nodo[] = [];
  let grupo: Nodo[] = [];
  const cerrar = () => {
    if (grupo.length === 1) salida.push(grupo[0]);
    else if (grupo.length > 1) {
      // El salto de página del primero pasa al bloque entero.
      const salto = grupo[0].pageBreak;
      delete grupo[0].pageBreak;
      salida.push({ stack: grupo, unbreakable: true, pageBreak: salto });
    }
    grupo = [];
  };
  for (const p of piezas) {
    // Un salto de página corta el grupo: lo de antes ya no puede ir con lo de después.
    if (p.nodo.pageBreak) cerrar();
    grupo.push(p.nodo);
    if (!p.atar) cerrar();
  }
  cerrar();
  return salida;
}

// --- Texto ---

/** Dónde se escribe un párrafo normal del cuerpo (para calcular los huecos, como en el Word). */
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

/** Dato que falta o referencia a un apartado quitado: resaltado en amarillo, como en el Word. */
const marcaPendiente = (vacio: boolean): Trozo => (vacio ? { background: 'yellow' } : {});

/**
 * Alto de línea de la fuente de las casillas del Word (Segoe UI Symbol: 1,33 veces el tamaño) entre
 * el de DejaVu Sans (1,164). Las líneas con casillas son algo más altas que las demás en el Word;
 * así lo son también en el PDF, y las páginas se cortan en el mismo sitio.
 */
const FACTOR_LINEA_CASILLA = 1.33 / 1.164;

/**
 * Casilla ☐ (o ☒ si está marcada), en la fuente que tiene esos símbolos y a 11 pt, como en el Word.
 * `lineaWord` es el interlineado del párrafo donde va (264 en el texto normal, 240 en tablas y notas).
 */
const trozoCasilla = (marcada: boolean | undefined, lineaWord: number): Trozo => ({
  text: marcada ? CASILLA_MARCADA : CASILLA,
  font: FUENTE_CASILLAS_PDF,
  fontSize: TAM.casilla,
  lineHeight: (lineaWord / 240) * FACTOR_LINEA_CASILLA,
  bold: false,
  italics: false,
});

/**
 * Hueco para escribir: espacios fijos subrayados en gris (sin guiones bajos), del mismo largo que
 * en el Word. Se conservan los espacios del principio y del final, que pdfmake quitaría.
 */
const trozoHueco = (anchoTwips: number, tamanoPt: number, valor?: string): Trozo => ({
  text: textoHueco(anchoTwips, tamanoPt, valor),
  decoration: 'underline',
  decorationColor: color(GRIS),
  preserveLeadingSpaces: true,
  preserveTrailingSpaces: true,
  bold: false,
  italics: false,
});

/**
 * Convierte una línea en trozos de texto: texto, datos de la clínica, casillas y huecos.
 * Las cajas y las firmas no pueden ir dentro de una frase: se dibujan como tablas aparte.
 */
function lineaATrozos(linea: Linea, medida: Medida): Trozo[] {
  // La negrita y la cursiva solo se ponen si están: si no, se deja la del estilo (los títulos y las
  // etiquetas ya son negrita por su estilo).
  const formato = (f: { negrita: boolean; cursiva: boolean }): Trozo => ({
    ...(f.negrita ? { bold: true } : {}),
    ...(f.cursiva ? { italics: true } : {}),
  });
  return linea.map((t, i): Trozo => {
    switch (t.tipo) {
      case 'texto':
        return { text: textoJuntoACasillas(linea, i), ...formato(t) };
      case 'dato':
        return { text: t.texto, ...formato(t), ...marcaPendiente(t.vacio) };
      case 'referencia':
        return { text: t.texto, ...formato(t), ...marcaPendiente(t.quitado) };
      case 'casilla':
        // En el texto normal, interlineado de 1,1 líneas; en tablas y notas, sencillo.
        return trozoCasilla(t.marcada, !medida.enCelda && medida.tamanoPt === TAMANO_PT.cuerpo ? INTERLINEADO : 240);
      case 'linea-corta':
        return trozoHueco(medida.enCelda ? MEDIDA.lineaCortaEnCelda : MEDIDA.lineaCorta, medida.tamanoPt, t.valor);
      case 'linea':
        return trozoHueco(anchoLineaRestante(linea.slice(0, i), medida), medida.tamanoPt, t.valor);
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
 * Crea un párrafo del cuerpo teniendo en cuenta el estado (como `parrafo` en el Word):
 *   - si hay un salto de página pendiente, el párrafo empieza en una página nueva;
 *   - si va justo después de una tabla y no es un título, lleva un poco de aire por encima.
 */
function parrafo(ctx: Contexto, nodo: Nodo, espacio: { before: number; after: number }, esTitulo = false): Pieza {
  const { salto, trasTabla, espacioDebajo } = ctx.estado;
  ctx.estado.salto = false;
  ctx.estado.trasTabla = false;
  ctx.estado.espacioDebajo = pt(espacio.after);
  const aire = trasTabla && !esTitulo ? pt(AIRE_TRAS_TABLA) : 0;
  // Solo se añade lo que falte hasta el espacio de encima de este párrafo (cuenta el mayor de los dos).
  // Al empezar página tras un salto, sin espacio encima (como en el Word).
  const encima = salto ? 0 : Math.max(0, pt(espacio.before) - espacioDebajo) + aire;
  return {
    nodo: {
      ...nodo,
      margin: [0, encima, 0, pt(espacio.after)],
      pageBreak: salto ? 'before' : undefined,
      // Un párrafo no se parte entre dos páginas: así no queda una línea suelta arriba o abajo
      // (en Word, el "control de líneas viudas"). Los párrafos de estos documentos son cortos.
      unbreakable: true,
    },
    atar: esTitulo || ctx.estado.conservar,
  };
}

/**
 * Hueco vacío de `puntos` de alto (entre dos tablas seguidas, o al pie de un recuadro).
 * Es un texto de 1 pt, porque un texto vacío normal ocuparía el alto de una línea entera.
 */
const espaciador = (puntos: number): Nodo => ({ text: ' ', fontSize: 1, lineHeight: 1, margin: [0, 0, 0, Math.max(0, puntos - 1.1)] });

/** Una tabla del cuerpo: también recoge el salto de página pendiente. */
function piezaTabla(ctx: Contexto, nodo: Nodo, atar: boolean): Pieza {
  const salto = ctx.estado.salto;
  ctx.estado.salto = false;
  ctx.estado.espacioDebajo = 0;
  return { nodo: { ...nodo, pageBreak: salto ? 'before' : undefined }, atar, tabla: true };
}

// --- Bloques ---

function crearBloques(bloques: Bloque[], ctx: Contexto): Pieza[] {
  const salida: Pieza[] = [];
  const atados = bloquesAtadosAFirma(bloques);
  // Dentro de una nota o recuadro, se respeta si el bloque de fuera ya iba atado.
  const atadoPorFuera = ctx.estado.conservar;
  for (const [i, b] of bloques.entries()) {
    ctx.estado.conservar = atadoPorFuera || atados.has(i);
    const creadas = crearBloque(b, ctx);
    // Dos tablas seguidas llevan entre ellas 6 pt de aire (en el Word, un párrafo mínimo).
    if (salida[salida.length - 1]?.tabla && creadas[0]?.tabla) {
      salida.push({ nodo: espaciador(pt(AIRE_TRAS_TABLA)), atar: ctx.estado.conservar });
    }
    salida.push(...creadas);
    if (creadas.length > 0) ctx.estado.trasTabla = !!creadas[creadas.length - 1].tabla;
  }
  ctx.estado.conservar = atadoPorFuera;
  return salida;
}

function crearBloque(b: Bloque, ctx: Contexto): Pieza[] {
  switch (b.tipo) {
    case 'titulo1':
      return [parrafo(ctx, { text: lineaATrozos(b.contenido, medidaCuerpo(ctx)), style: 'titulo1' }, ESPACIADO.titulo1, true)];
    case 'titulo2':
      return [parrafo(ctx, { text: lineaATrozos(b.contenido, medidaCuerpo(ctx)), style: 'titulo2' }, ESPACIADO.titulo2, true)];
    case 'parrafo':
      if (esSolo(b.contenido, 'caja')) return [piezaTabla(ctx, crearCaja(MEDIDA.altoCaja, ctx.ancho, valorDe(b.contenido)), ctx.estado.conservar)];
      if (esSolo(b.contenido, 'caja-grande')) {
        return [piezaTabla(ctx, crearCaja(MEDIDA.altoCajaGrande, ctx.ancho, valorDe(b.contenido)), ctx.estado.conservar)];
      }
      if (tieneFirma(b.contenido)) return [piezaTabla(ctx, crearLineaFirma(b.contenido, ctx), ctx.estado.conservar)];
      return [
        parrafo(
          ctx,
          { text: lineaATrozos(b.contenido, medidaCuerpo(ctx)), style: ctx.estiloParrafo },
          ESPACIO_PARRAFO[ctx.estiloParrafo ?? 'normal'],
        ),
      ];
    case 'lista':
      // Cada lista numerada empieza en 1.
      return b.elementos.map((e, i) => crearElementoLista(e, b.numerada ? `${i + 1}.` : '•', ctx));
    case 'tabla':
      return [piezaTabla(ctx, crearTabla(b, ctx), ctx.estado.conservar)];
    case 'tabla-datos':
      return [piezaTabla(ctx, crearTablaDatos(b, ctx), false)];
    case 'destacado':
      return [piezaTabla(ctx, crearDestacado(b.bloques, ctx), false)];
    case 'nota':
      return crearBloques(b.bloques, { ...ctx, estiloParrafo: 'nota' });
    case 'letra-pequena':
      return crearBloques(b.bloques, { ...ctx, estiloParrafo: 'letraPequena' });
    case 'firma':
      return crearBloques(b.bloques, ctx);
    case 'salto-de-pagina':
      ctx.estado.salto = true;
      return [];
  }
}

/**
 * Elemento de lista: la viñeta (o el número) en el color de la clínica y en negrita, pegada al
 * margen, y el texto a 0,45 cm, como en el Word. Se hace con dos columnas para que las líneas
 * siguientes del elemento queden alineadas con el texto, no con la viñeta.
 */
function crearElementoLista(linea: Linea, marca: string, ctx: Contexto): Pieza {
  const estilo = ctx.estiloParrafo;
  const espacio = estilo ? ESPACIO_PARRAFO[estilo] : ESPACIADO.elementoLista;
  return parrafo(
    ctx,
    {
      columns: [
        { width: pt(SANGRIA_LISTA.left), text: marca, bold: true, color: color(ctx.paleta.principal), style: estilo },
        { width: '*', text: lineaATrozos(linea, medidaCuerpo(ctx, SANGRIA_LISTA.left)), style: estilo },
      ],
      columnGap: 0,
    },
    espacio,
  );
}

// --- Tablas ---

/**
 * Anchos de las columnas para pdfmake, a partir de porcentajes de `total` puntos.
 * pdfmake suma por fuera el relleno de cada celda y el grosor de las líneas, así que se restan
 * aquí: la tabla mide en total lo mismo que en el Word.
 */
function anchosColumnas(porcentajes: number[], total: number, relleno: number[], linea: number): number[] {
  const anchos = porcentajes.map((p, c) => (total * p) / 100 - relleno[c] - linea);
  anchos[anchos.length - 1] -= linea;
  return anchos;
}

/** Relleno izquierdo + derecho de cada columna cuando todas tienen el relleno normal. */
const rellenoNormal = (columnas: number) => Array.from({ length: columnas }, () => 2 * RELLENO.lado);

/**
 * Alto mínimo del contenido de una fila. Al abrir el Word, el relleno de arriba y abajo de la celda
 * se suma por fuera de ese alto (comprobado en las muestras de la T5), y en pdfmake pasa lo mismo:
 * se usa tal cual.
 */
const altoContenido = (altoTwips: number) => pt(altoTwips);

/** Bordes y rellenos de una tabla. */
interface OpcionesDiseno {
  /** Grosor y color de las líneas de fuera y de dentro (0 = sin línea). */
  lineas?: { grosor: number; color: string };
  /** Solo líneas horizontales (la tabla de datos). */
  soloHorizontales?: boolean;
  /** Relleno de cada lado de cada celda (por defecto, el normal). */
  rellenoLado?: (columna: number) => number;
  rellenoArriba?: number;
  rellenoAbajo?: number;
  /** Discontinua (recuadros de firma). */
  discontinua?: boolean;
}

/** "Diseño" de una tabla de pdfmake: grosor y color de las líneas y relleno de las celdas. */
function diseno(o: OpcionesDiseno): Nodo {
  const grosor = o.lineas?.grosor ?? 0;
  const lado = o.rellenoLado ?? (() => RELLENO.lado);
  const discontinua = () => ({ dash: { length: 2, space: 1.5 } });
  return {
    hLineWidth: () => grosor,
    vLineWidth: () => (o.soloHorizontales ? 0 : grosor),
    hLineColor: () => color(o.lineas?.color ?? GRIS_BORDE),
    vLineColor: () => color(o.lineas?.color ?? GRIS_BORDE),
    ...(o.discontinua ? { hLineStyle: discontinua, vLineStyle: discontinua } : {}),
    paddingLeft: (c: number) => lado(c),
    paddingRight: (c: number) => lado(c),
    paddingTop: () => o.rellenoArriba ?? RELLENO.arribaAbajo,
    paddingBottom: () => o.rellenoAbajo ?? RELLENO.arribaAbajo,
  };
}

/** Contenido de una celda, ya preparado (como ContenidoCelda en el Word). */
interface ContenidoCelda {
  nodo: Nodo;
  /** Alto mínimo de la fila en twips, para que haya sitio para escribir. */
  alto?: number;
  /** La celda es un recuadro de firma (va siempre en blanco). */
  firma?: boolean;
  alineacion: 'top' | 'middle' | 'bottom';
  /** Fondo propio de la celda (las cajas para escribir llevan el gris suave de los campos). */
  fondo?: string;
}

/**
 * Prepara el contenido de una celda de tabla (las mismas reglas que contenidoCelda del Word):
 *   - solo [linea] → un campo con fondo gris suave y línea debajo;
 *   - solo [caja] o [caja-grande] → la celda vacía, más alta y con el fondo gris suave;
 *   - solo [firma: Texto] → la celda es el recuadro de firma: alta y con el texto pequeño abajo;
 *   - solo casillas → centradas;
 *   - cualquier otra cosa → texto normal, con sus casillas y huecos dentro.
 * `ancho` es el ancho de la columna en twips (para calcular los huecos como en el Word).
 */
function contenidoCelda(linea: Linea, ancho: number, estilo: string): ContenidoCelda {
  const valor = valorDe(linea);
  const vacio = (alto: number): ContenidoCelda => ({
    nodo: { text: valor ?? '', style: estilo },
    alto,
    alineacion: valor ? 'top' : 'middle',
    fondo: FONDO_CAMPO,
  });
  if (esSolo(linea, 'linea')) return { nodo: crearCampo(valor), alto: MEDIDA.altoFila, alineacion: 'middle' };
  if (esSolo(linea, 'caja')) return vacio(MEDIDA.altoCaja);
  if (esSolo(linea, 'caja-grande')) return vacio(MEDIDA.altoCajaGrande);

  const firma = firmaSola(linea);
  if (firma !== null) return { nodo: { text: firma, style: 'textoFirma' }, alto: MEDIDA.altoFirma, firma: true, alineacion: 'bottom' };

  return {
    nodo: {
      text: lineaATrozos(linea, medidaCelda(ancho)),
      style: estilo,
      alignment: soloCasillas(linea) ? 'center' : undefined,
    },
    alineacion: 'middle',
  };
}

/**
 * Campo para escribir dentro de una celda (el estilo "Campo para escribir" del Word): una franja
 * gris muy suave con una línea gris debajo, de al menos 15 pt de alto. Si hay dato, va escrito encima.
 */
function crearCampo(valor?: string): Nodo {
  const altoMinimo = 15;
  return {
    table: { widths: ['*'], heights: [altoMinimo], body: [[{ text: valor ?? '', style: 'textoTabla', fillColor: color(FONDO_CAMPO), verticalAlignment: 'middle' }]] },
    layout: {
      ...diseno({ rellenoLado: () => 0, rellenoArriba: 0, rellenoAbajo: 0 }),
      hLineWidth: (i: number) => (i === 1 ? LINEA_FINA : 0),
      hLineColor: () => color(GRIS),
    },
  };
}

/** Porcentajes → anchos en twips (para medir los huecos de cada columna, como en el Word). */
const anchosTwips = (porcentajes: number[]) => porcentajes.map((p) => (ANCHO_UTIL * p) / 100);

function crearTabla(b: Extract<Bloque, { tipo: 'tabla' }>, ctx: Contexto): Nodo {
  const { paleta } = ctx;
  const porcentajes = porcentajesColumnas(b.cabecera, b.filas, b.primeraColumnaEtiquetas);
  const twips = anchosTwips(porcentajes);

  const cabecera = b.cabecera.map((l, c) => ({
    text: lineaATrozos(l, medidaCelda(twips[c])),
    style: 'cabeceraTabla',
    fillColor: color(paleta.principal),
    verticalAlignment: 'middle',
  }));

  const altos: number[] = [0];
  const filas = b.filas.map((fila, i) => {
    const contenidos = twips.map((ancho, c) =>
      contenidoCelda(fila[c] ?? [], ancho, b.primeraColumnaEtiquetas && c === 0 ? 'etiquetaTabla' : 'textoTabla'),
    );
    altos.push(altoContenido(Math.max(0, ...contenidos.map((x) => x.alto ?? 0))));
    return contenidos.map((x) => {
      // Los recuadros de firma van siempre en blanco, también en las filas alternas.
      const fondo = x.fondo ?? (i % 2 === 1 && !x.firma ? paleta.fondoFilas : undefined);
      return { ...x.nodo, fillColor: fondo ? color(fondo) : undefined, verticalAlignment: x.alineacion };
    });
  });

  return {
    table: {
      widths: anchosColumnas(porcentajes, ctx.ancho, rellenoNormal(porcentajes.length), LINEA_FINA),
      heights: altos,
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      body: [cabecera, ...filas],
    },
    layout: diseno({ lineas: { grosor: LINEA_FINA, color: GRIS_BORDE } }),
  };
}

// --- Tabla de datos, cajas y firmas ---

/**
 * "::: tabla-datos": dos columnas, la etiqueta en negrita sobre el fondo suave del color y el
 * contenido a la derecha. Solo lleva líneas horizontales.
 */
function crearTablaDatos(b: Extract<Bloque, { tipo: 'tabla-datos' }>, ctx: Contexto): Nodo {
  const porcentajes = [38, 62];
  const twips = anchosTwips(porcentajes);
  const altos: number[] = [];
  const filas = b.filas.map((f) => {
    const contenido = contenidoCelda(f.contenido, twips[1], 'textoTabla');
    altos.push(altoContenido(Math.max(MEDIDA.altoFila, contenido.alto ?? 0)));
    return [
      {
        text: lineaATrozos(f.etiqueta, medidaCelda(twips[0])),
        style: 'etiquetaTabla',
        fillColor: color(ctx.paleta.fondoSuave),
        verticalAlignment: 'middle',
      },
      { ...contenido.nodo, fillColor: contenido.fondo ? color(contenido.fondo) : undefined, verticalAlignment: contenido.alineacion },
    ];
  });
  return {
    table: {
      widths: anchosColumnas(porcentajes, ctx.ancho, rellenoNormal(2), 0),
      heights: altos,
      dontBreakRows: true,
      body: filas,
    },
    layout: diseno({ lineas: { grosor: LINEA_FINA, color: GRIS_BORDE }, soloHorizontales: true }),
  };
}

/** [caja] o [caja-grande] en un párrafo propio: un recuadro con borde gris, fondo gris suave y alto mínimo. */
function crearCaja(alto: number, ancho: number, valor?: string): Nodo {
  return {
    table: {
      widths: anchosColumnas([100], ancho, rellenoNormal(1), LINEA_FINA),
      heights: [altoContenido(alto)],
      dontBreakRows: true,
      body: [[{ text: valor ?? '', fillColor: color(FONDO_CAMPO), margin: margen(ESPACIADO.normal) }]],
    },
    layout: diseno({ lineas: { grosor: LINEA_FINA, color: GRIS } }),
  };
}

/**
 * Recuadro de firma: borde gris discontinuo, fondo blanco y el texto pequeño abajo
 * ("Firma", "Firma y sello"…). Ocupa toda su celda.
 */
function crearRecuadroFirma(texto: string, alto: number): Nodo {
  // `alto` en puntos.
  return {
    table: {
      widths: ['*'],
      heights: [alto - 3],
      body: [[{ text: texto, style: 'textoFirma', fillColor: '#FFFFFF', verticalAlignment: 'bottom' }]],
    },
    layout: diseno({ lineas: { grosor: LINEA_FINA, color: GRIS }, discontinua: true, rellenoArriba: 0, rellenoAbajo: 3 }),
  };
}

/**
 * Línea con recuadro de firma, por ejemplo "**Firma del titular en caso de rechazo:** [firma: Firma]":
 * una tabla sin bordes con un trozo en cada celda, a partes iguales. El recuadro de firma ocupa
 * su celda entera; el texto va centrado en vertical.
 */
function crearLineaFirma(linea: Linea, ctx: Contexto): Nodo {
  if (tieneCaja(linea)) throw new ErrorGenerador('Una caja no puede ir en la misma línea que un recuadro de firma.');
  const segmentos = conRelleno(partirPorFirma(linea));
  const esFirma = segmentos.map((s) => s.tipo === 'firma');
  // Alto de la fila: el del Word más el relleno de arriba y abajo de la celda (ver altoContenido).
  const altoFila = pt(MEDIDA.altoFirmaLinea) + 2 * RELLENO.arribaAbajo;
  const relleno = esFirma.map((f) => (f ? 0 : 2 * RELLENO.lado));
  const porcentajes = segmentos.map(() => 100 / segmentos.length);
  const twips = porcentajes.map((p) => ((ANCHO_UTIL - (ctx.ancho < ANCHO_PT ? 2 * MARGEN_DESTACADO : 0)) * p) / 100);
  const tamano = ctx.estiloParrafo ? TAMANO_PT.nota : TAMANO_PT.cuerpo;
  const celdas = segmentos.map((s: Segmento, i) =>
    s.tipo === 'firma'
      ? crearRecuadroFirma(s.texto, altoFila)
      : { text: lineaATrozos(s.linea, medidaCelda(twips[i], tamano)), style: ctx.estiloParrafo, verticalAlignment: 'middle' },
  );
  return {
    table: {
      widths: anchosColumnas(porcentajes, ctx.ancho, relleno, 0),
      heights: [altoFila],
      dontBreakRows: true,
      body: [celdas],
    },
    layout: diseno({ rellenoLado: (c) => (esFirma[c] ? 0 : RELLENO.lado), rellenoArriba: 0, rellenoAbajo: 0 }),
  };
}

/**
 * Recuadro destacado: borde del color de la clínica y fondo suave. Dentro va su texto y, si la
 * tiene, la línea de firma (la revocación), con un poco de aire debajo para que no toque el borde.
 */
function crearDestacado(bloques: Bloque[], ctx: Contexto): Nodo {
  for (const b of bloques) {
    if (b.tipo === 'parrafo' && (esSolo(b.contenido, 'caja') || esSolo(b.contenido, 'caja-grande'))) {
      throw new ErrorGenerador('Un [caja] no puede ir dentro de un recuadro "::: destacado".');
    }
  }
  const grosor = 1;
  const lado = pt(MARGEN_DESTACADO);
  ctx.estado.trasTabla = false;
  const interior: Contexto = {
    ...ctx,
    estiloParrafo: undefined,
    ancho: ctx.ancho - 2 * lado - 2 * grosor,
    estado: { salto: false, trasTabla: false, conservar: false, espacioDebajo: 0 },
  };
  const piezas = crearBloques(bloques, interior);
  // Tras la línea de firma, 7,5 pt de aire (en el Word, una fila de relleno).
  if (piezas[piezas.length - 1]?.tabla) piezas.push({ nodo: espaciador(7.5 - pt(MARGENES_CELDA.bottom)), atar: false });
  return {
    table: {
      widths: anchosColumnas([100], ctx.ancho, [2 * lado], grosor),
      dontBreakRows: true,
      body: [[{ stack: piezas.map((p) => p.nodo), fillColor: color(ctx.paleta.fondoSuave) }]],
    },
    layout: diseno({
      lineas: { grosor, color: ctx.paleta.principal },
      rellenoLado: () => lado,
      rellenoArriba: 7.5,
      rellenoAbajo: pt(MARGENES_CELDA.bottom),
    }),
  };
}

// --- Cabecera con el logo y los datos de la clínica ---

/** Trozo con un dato de la clínica (en amarillo si falta). */
function dato(variable: Variable, datos: DatosClinica): Trozo {
  const r = resolverVariable(variable, datos);
  return { text: r.texto, ...marcaPendiente(r.vacio) };
}

/**
 * Logo como "dirección de datos" (data:image/png;base64,…): así pdfmake lo recibe ya leído,
 * sin buscar nada fuera. Funciona igual en el navegador y en Node.
 */
function urlDeDatos(logo: Logo): string {
  let binario = '';
  const trozo = 0x8000;
  for (let i = 0; i < logo.datos.length; i += trozo) {
    binario += String.fromCharCode(...logo.datos.subarray(i, i + trozo));
  }
  return `data:image/${logo.tipo === 'png' ? 'png' : 'jpeg'};base64,${btoa(binario)}`;
}

/**
 * Cabecera de la primera página: el logo a la izquierda y los datos de la clínica a la derecha,
 * con una línea del color de la clínica debajo (igual que en el Word).
 */
function crearCabeceraClinica(datos: DatosClinica, paleta: Paleta, logo: Logo | null): Nodo {
  const lleno = (s: string) => s.trim() !== '';
  const separador: Trozo = { text: ' · ' };

  const lineaContacto: Trozo[] = [dato('EMAIL', datos)];
  if (lleno(datos.web)) lineaContacto.push(separador, dato('WEB', datos));

  const lineaLegal: Trozo[] = [];
  if (lleno(datos.razonSocial) && datos.razonSocial.trim() !== datos.nombreClinica.trim()) {
    lineaLegal.push(dato('RAZON_SOCIAL', datos), separador);
  }
  if (lleno(datos.cif)) lineaLegal.push({ text: 'CIF ' });
  lineaLegal.push(dato('CIF', datos));

  const telefonos: Trozo[] = lleno(datos.telefonos) ? [{ text: 'Tel. ' }, dato('TELEFONOS', datos)] : [dato('TELEFONOS', datos)];

  const datosClinica = {
    stack: [
      { text: [dato('NOMBRE_CLINICA', datos)], style: 'nombreClinica', margin: margen(ESPACIADO.nombreClinica) },
      { text: [dato('DIRECCION', datos)], style: 'datosClinica' },
      { text: telefonos, style: 'datosClinica' },
      { text: lineaContacto, style: 'datosClinica' },
      { text: lineaLegal, style: 'datosClinica' },
    ],
    verticalAlignment: 'middle',
  };

  // El logo, como en el Word: 5 cm × 2,4 cm como mucho, sin deformarlo (píxeles de pantalla × 0,75 = puntos).
  let celdaLogo: Nodo = { text: '' };
  if (logo) {
    const medidas = encajar(leerMedidas(logo.datos), LOGO_MAXIMO);
    celdaLogo = { image: 'logo', width: medidas.ancho * 0.75, height: medidas.alto * 0.75 };
  }

  const linea = 1.5;
  return {
    table: {
      widths: anchosColumnas([35, 65], ANCHO_PT, [0, 0], 0),
      dontBreakRows: true,
      body: [[{ ...celdaLogo, verticalAlignment: 'middle' }, datosClinica]],
    },
    layout: {
      ...diseno({ rellenoLado: () => 0, rellenoArriba: 0, rellenoAbajo: 7 }),
      hLineWidth: (i: number) => (i === 1 ? linea : 0),
      hLineColor: () => color(paleta.principal),
    },
  };
}

// --- Encabezado de la página 2 en adelante ---

/** El nombre de la clínica a la derecha, con una raya fina debajo (D47), a 0,6 cm del borde de arriba. */
function crearEncabezado(datos: DatosClinica): Nodo {
  return {
    margin: [pt(MARGEN.lateral), 0.6 * 28.3465, pt(MARGEN.lateral), 0],
    table: { widths: ['*'], body: [[{ text: [dato('NOMBRE_CLINICA', datos)], style: 'pie', alignment: 'right' }]] },
    layout: {
      ...diseno({ rellenoLado: () => 0, rellenoArriba: 0, rellenoAbajo: 2 }),
      hLineWidth: (i: number) => (i === 1 ? LINEA_FINA : 0),
    },
  };
}

// --- Pie de página ---

/** "Iniciales del titular" → "Iniciales del titular:" (si ya acaba en dos puntos, se deja igual). */
const conDosPuntos = (texto: string) => (texto.trimEnd().endsWith(':') ? texto : `${texto.trimEnd()}:`);

/**
 * Pie: "{pie} · Modelo v1.0" a la izquierda, la casilla de iniciales (solo si el documento la lleva)
 * y "Página X de Y" a la derecha, con una raya fina encima. Como en el Word, termina a 0,7 cm del
 * borde de abajo.
 */
function crearPie(textoPie: string, iniciales: string | null, pagina: number, total: number): Nodo {
  const izquierda = { text: `${textoPie} · Modelo ${VERSION_MODELO}`, style: 'pie', verticalAlignment: 'middle' };
  const numero = { text: `Página ${pagina} de ${total}`, style: 'pie', alignment: 'right', verticalAlignment: 'middle' };
  const porcentajes = iniciales ? [48, 24, 10, 18] : [75, 25];
  const fila = iniciales
    ? [
        izquierda,
        { text: conDosPuntos(iniciales), style: 'pie', alignment: 'right', verticalAlignment: 'middle', margin: [0, 0, 5, 0] },
        { table: { widths: ['*'], heights: [12], body: [['']] }, layout: diseno({ lineas: { grosor: 0.75, color: GRIS } }) },
        numero,
      ]
    : [izquierda, numero];

  // Alto del pie en el Word: 21 pt (5 pt de relleno arriba). Termina a 0,7 cm del borde de abajo.
  const altoPie = 21;
  const rellenoArriba = 7.5;
  // Medido en las muestras: el pie del Word queda 5,5 pt más arriba que la cuenta exacta.
  const desdeAbajo = 0.7 * 28.3465 + 5.5;
  return {
    margin: [pt(MARGEN.lateral), pt(MARGEN.inferior) - desdeAbajo - altoPie, pt(MARGEN.lateral), 0],
    table: { widths: anchosColumnas(porcentajes, ANCHO_PT, porcentajes.map(() => 0), 0), heights: [altoPie - rellenoArriba], body: [fila] },
    layout: {
      ...diseno({ rellenoLado: () => 0, rellenoArriba, rellenoAbajo: 0 }),
      hLineWidth: (i: number) => (i === 0 ? LINEA_FINA : 0),
    },
  };
}
