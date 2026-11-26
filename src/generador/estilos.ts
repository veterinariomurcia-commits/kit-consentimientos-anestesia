// Estilos de Word del documento.
//
// Un estilo es una "plantilla de formato" con nombre (Normal, Título 1, Nota…). Todo el documento
// se formatea con estilos, nunca a mano párrafo a párrafo: si la clínica cambia en Word el color
// o la fuente de un estilo, cambia en todo el documento a la vez (regla 1 de diseño de CLAUDE.md).
//
// Unidades de Word que se usan aquí:
//   - Tamaño de letra en medios puntos: 20 = 10 pt.
//   - Espacios y sangrías en "twips" (vigésimos de punto): 567 ≈ 1 cm, 20 = 1 pt.

import { AlignmentType, LevelFormat, type INumberingOptions, type IStylesOptions } from 'docx';
import { GRIS, TEXTO_OSCURO, type Paleta } from './color.ts';

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
  /** Estilo de carácter: dato de la clínica que falta (resaltado en amarillo). */
  datoPendiente: 'DatoPendiente',
} as const;

/** Nombres de las listas (numeraciones de Word). */
export const LISTA = {
  vinetas: 'lista-vinetas',
  numeros: 'lista-numeros',
} as const;

/** Tamaños en medios puntos. */
const TAMANO = {
  cuerpo: 20, // 10 pt
  nota: 17, // 8,5 pt
  titulo: 36, // 18 pt
  titulo1: 26, // 13 pt
  titulo2: 22, // 11 pt
  subtitulo: 22, // 11 pt
  tabla: 19, // 9,5 pt
  nombreClinica: 24, // 12 pt
  datosClinica: 17, // 8,5 pt
  pie: 16, // 8 pt
};

/** Interlineado normal (264 = 1,1 líneas). */
const INTERLINEADO = 264;

/** Sangría de las listas: el texto empieza a 0,7 cm y la viñeta cuelga 0,45 cm a su izquierda. */
const SANGRIA_LISTA = { left: 397, hanging: 255 };

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
        paragraph: { spacing: { before: 280, after: 40, line: 240 }, keepNext: true, keepLines: true },
      },
      heading1: {
        run: { ...fuente, size: TAMANO.titulo1, bold: true, color: paleta.principal },
        paragraph: { spacing: { before: 300, after: 100, line: 240 }, keepNext: true, keepLines: true },
      },
      heading2: {
        run: { ...fuente, size: TAMANO.titulo2, bold: true, color: TEXTO_OSCURO },
        paragraph: { spacing: { before: 180, after: 60, line: 240 }, keepNext: true, keepLines: true },
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
        paragraph: { spacing: { before: 0, after: 240 }, keepNext: true },
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
