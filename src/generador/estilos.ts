// Estilos de Word del documento.
//
// Un estilo es una "plantilla de formato" con nombre (Normal, Título 1, Nota…). Todo el documento
// se formatea con estilos, nunca a mano párrafo a párrafo: si la clínica cambia en Word el color
// o la fuente de un estilo, cambia en todo el documento a la vez (regla 1 de diseño de CLAUDE.md).
//
// Unidades de Word que se usan aquí:
//   - Tamaño de letra en medios puntos: 20 = 10 pt.
//   - Espacios y sangrías en "twips" (vigésimos de punto): 567 ≈ 1 cm, 20 = 1 pt.

import {
  AlignmentType,
  BorderStyle,
  LevelFormat,
  LineRuleType,
  ShadingType,
  UnderlineType,
  type INumberingOptions,
  type IStylesOptions,
} from 'docx';
import { FONDO_CAMPO, GRIS, GRIS_BORDE, TEXTO_OSCURO, type Paleta } from './color.ts';

export const FUENTE = 'Arial';

/** Nombres internos de los estilos propios (los que no trae Word de serie). */
export const ESTILO = {
  subtitulo: 'SubtituloDocumento',
  nota: 'Nota',
  letraPequena: 'LetraPequena',
  elementoLista: 'ElementoLista',
  textoTabla: 'TextoTabla',
  cabeceraTabla: 'CabeceraTabla',
  etiquetaTabla: 'EtiquetaTabla',
  nombreClinica: 'NombreClinica',
  datosClinica: 'DatosClinica',
  pie: 'Pie',
  /** Encabezado de la página 2 en adelante: el nombre de la clínica en una línea. */
  encabezado: 'EncabezadoPaginas',
  /** Párrafo-campo para escribir dentro de una celda: fondo gris muy suave y línea debajo. */
  campo: 'CampoParaEscribir',
  /** Texto pequeño en gris al pie de un recuadro de firma ("Firma", "Firma y sello"…). */
  textoFirma: 'TextoFirma',
  /** Estilo de carácter: dato de la clínica que falta (resaltado en amarillo). */
  datoPendiente: 'DatoPendiente',
  /** Estilo de carácter: casilla ☐, en una fuente que tiene ese símbolo. */
  casilla: 'Casilla',
  /** Estilo de carácter: hueco para escribir (espacios fijos subrayados). */
  hueco: 'Hueco',
} as const;

/**
 * Fuente de las casillas ☐. Arial no tiene ese símbolo. Segoe UI Symbol viene con Windows; en Mac,
 * LibreOffice y Google Docs, si no está, el programa pone sola otra fuente que sí lo tenga.
 */
export const FUENTE_CASILLA = 'Segoe UI Symbol';

/** Nombres de las listas (numeraciones de Word). */
export const LISTA = {
  vinetas: 'lista-vinetas',
  numeros: 'lista-numeros',
} as const;

/**
 * Tamaños en medios puntos. Son los de los PDF de referencia, redondeados (T5): así cada documento
 * ocupa las mismas páginas que la referencia.
 */
const TAMANO = {
  cuerpo: 19, // 9,5 pt
  nota: 16, // 8 pt
  titulo: 32, // 16 pt
  titulo1: 23, // 11,5 pt
  titulo2: 20, // 10 pt
  subtitulo: 19, // 9,5 pt
  tabla: 17, // 8,5 pt
  firma: 15, // 7,5 pt
  nombreClinica: 21, // 10,5 pt
  datosClinica: 17, // 8,5 pt
  pie: 15, // 7,5 pt
  casilla: 22, // 11 pt: el símbolo ☐ se ve pequeño al tamaño del texto
};

/** Interlineado normal (264 = 1,1 líneas). */
const INTERLINEADO = 264;

/** Sangría de las listas: la viñeta va pegada al margen y el texto empieza a 0,45 cm, como en la referencia. */
export const SANGRIA_LISTA = { left: 255, hanging: 255 };

export function crearEstilos(paleta: Paleta): IStylesOptions {
  const fuente = { font: FUENTE };
  return {
    default: {
      document: {
        run: { ...fuente, size: TAMANO.cuerpo, color: TEXTO_OSCURO, language: { value: 'es-ES' } },
        paragraph: { spacing: { before: 0, after: 100, line: INTERLINEADO } },
      },
      title: {
        run: { ...fuente, size: TAMANO.titulo, bold: true, color: TEXTO_OSCURO },
        paragraph: { spacing: { before: 200, after: 40, line: 240 }, keepNext: true, keepLines: true },
      },
      heading1: {
        run: { ...fuente, size: TAMANO.titulo1, bold: true, color: paleta.principal },
        paragraph: { spacing: { before: 260, after: 100, line: 240 }, keepNext: true, keepLines: true },
      },
      heading2: {
        run: { ...fuente, size: TAMANO.titulo2, bold: true, color: TEXTO_OSCURO },
        paragraph: { spacing: { before: 140, after: 60, line: 240 }, keepNext: true, keepLines: true },
      },
    },
    paragraphStyles: [
      {
        id: ESTILO.subtitulo,
        name: 'Subtítulo del documento',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { ...fuente, size: TAMANO.subtitulo, color: GRIS },
        paragraph: { spacing: { before: 0, after: 200 }, keepNext: true },
      },
      {
        id: ESTILO.elementoLista,
        name: 'Elemento de lista',
        basedOn: 'Normal',
        quickFormat: true,
        run: fuente,
        paragraph: { spacing: { before: 0, after: 60 } },
      },
      {
        id: ESTILO.nota,
        name: 'Nota',
        basedOn: 'Normal',
        quickFormat: true,
        run: { ...fuente, size: TAMANO.nota, color: GRIS },
        paragraph: { spacing: { before: 0, after: 80, line: 240 } },
      },
      {
        id: ESTILO.letraPequena,
        name: 'Letra pequeña',
        basedOn: 'Normal',
        quickFormat: true,
        run: { ...fuente, size: TAMANO.nota, color: TEXTO_OSCURO },
        paragraph: { spacing: { before: 0, after: 80, line: 240 } },
      },
      {
        id: ESTILO.textoTabla,
        name: 'Texto de tabla',
        basedOn: 'Normal',
        quickFormat: true,
        run: { ...fuente, size: TAMANO.tabla },
        paragraph: { spacing: { before: 0, after: 0, line: 240 } },
      },
      {
        id: ESTILO.cabeceraTabla,
        name: 'Cabecera de tabla',
        basedOn: ESTILO.textoTabla,
        quickFormat: true,
        run: { ...fuente, size: TAMANO.tabla, bold: true, color: paleta.textoSobrePrincipal },
        paragraph: { keepNext: true },
      },
      {
        id: ESTILO.etiquetaTabla,
        name: 'Etiqueta de tabla',
        basedOn: ESTILO.textoTabla,
        quickFormat: true,
        run: { ...fuente, size: TAMANO.tabla, bold: true },
      },
      {
        id: ESTILO.nombreClinica,
        name: 'Nombre de la clínica',
        basedOn: 'Normal',
        run: { ...fuente, size: TAMANO.nombreClinica, bold: true, color: TEXTO_OSCURO },
        paragraph: { alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40, line: 240 } },
      },
      {
        id: ESTILO.datosClinica,
        name: 'Datos de la clínica',
        basedOn: 'Normal',
        run: { ...fuente, size: TAMANO.datosClinica, color: GRIS },
        paragraph: { alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0, line: 252 } },
      },
      {
        id: ESTILO.textoFirma,
        name: 'Texto de firma',
        basedOn: 'Normal',
        quickFormat: true,
        run: { ...fuente, size: TAMANO.firma, color: GRIS },
        paragraph: { spacing: { before: 0, after: 0, line: 240 } },
      },
      {
        id: ESTILO.encabezado,
        name: 'Encabezado de las páginas',
        basedOn: 'Normal',
        run: { ...fuente, size: TAMANO.pie, color: GRIS },
        paragraph: {
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 0, line: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRIS_BORDE, space: 2 } },
        },
      },
      {
        id: ESTILO.campo,
        name: 'Campo para escribir',
        basedOn: ESTILO.textoTabla,
        quickFormat: true,
        paragraph: {
          spacing: { before: 0, after: 0, line: 300, lineRule: LineRuleType.AT_LEAST },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: FONDO_CAMPO },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRIS, space: 0 } },
        },
      },
      {
        id: ESTILO.pie,
        name: 'Pie del documento',
        basedOn: 'Normal',
        run: { ...fuente, size: TAMANO.pie, color: GRIS },
        paragraph: { spacing: { before: 0, after: 0, line: 240 } },
      },
    ],
    characterStyles: [
      {
        id: ESTILO.datoPendiente,
        name: 'Dato pendiente',
        basedOn: 'DefaultParagraphFont',
        run: { highlight: 'yellow' },
      },
      {
        id: ESTILO.casilla,
        name: 'Casilla',
        basedOn: 'DefaultParagraphFont',
        quickFormat: true,
        run: {
          font: { ascii: FUENTE_CASILLA, hAnsi: FUENTE_CASILLA, eastAsia: FUENTE_CASILLA, cs: FUENTE_CASILLA },
          size: TAMANO.casilla,
          bold: false,
        },
      },
      {
        id: ESTILO.hueco,
        name: 'Hueco para escribir',
        basedOn: 'DefaultParagraphFont',
        quickFormat: true,
        // Sin fondo gris: LibreOffice lo pinta espacio a espacio y quedan rayitas entre ellos (T5).
        run: { underline: { type: UnderlineType.SINGLE, color: GRIS }, bold: false, italics: false },
      },
    ],
  };
}

/** Listas con la viñeta o el número en el color de la clínica. */
export function crearNumeraciones(paleta: Paleta): INumberingOptions {
  const marca = { font: FUENTE, color: paleta.principal };
  return {
    config: [
      {
        reference: LISTA.vinetas,
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: SANGRIA_LISTA }, run: { ...marca, bold: true } },
          },
        ],
      },
      {
        reference: LISTA.numeros,
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: SANGRIA_LISTA }, run: { ...marca, bold: true } },
          },
        ],
      },
    ],
  };
}
