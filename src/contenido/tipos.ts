// Catálogo de piezas en las que el lector convierte cada texto de contenido/.
// El generador de Word (tareas T3 y T4) recorre estas piezas una a una.
//
// Hay dos niveles:
//   - Bloque: una pieza "grande" (título, párrafo, lista, tabla, recuadro…).
//   - Tramo: un trozo dentro de una línea de texto (texto, casilla, hueco, dato…).

/** Datos de la clínica que se pueden usar como {{VARIABLE}} en los textos. */
export const VARIABLES = [
  'NOMBRE_CLINICA',
  'RAZON_SOCIAL',
  'CIF',
  'DIRECCION',
  'LOCALIDAD',
  'TELEFONOS',
  'EMAIL',
  'EMAIL_PRIVACIDAD',
  'WEB',
] as const;

export type Variable = (typeof VARIABLES)[number];

/** Lo que escribe la clínica en el formulario. Un campo vacío ('') es un dato que falta. */
export interface DatosClinica {
  nombreClinica: string;
  razonSocial: string;
  cif: string;
  direccion: string;
  localidad: string;
  telefonos: string;
  email: string;
  emailPrivacidad: string;
  web: string;
}

/** Formato de un trozo de texto. */
export interface Formato {
  negrita: boolean;
  cursiva: boolean;
}

/** Un trozo dentro de una línea. */
export type Tramo =
  /** Texto normal, con su negrita o cursiva. */
  | ({ tipo: 'texto'; texto: string } & Formato)
  /**
   * Un dato de la clínica ya sustituido.
   * Si falta (vacio = true), `texto` es el hueco entre corchetes, por ejemplo "[CIF]",
   * y el generador debe resaltarlo en amarillo.
   */
  | ({ tipo: 'dato'; variable: Variable; texto: string; vacio: boolean } & Formato)
  /** [ ] → casilla ☐ */
  | { tipo: 'casilla' }
  /** [linea] → hueco que ocupa el resto de la línea o celda */
  | { tipo: 'linea' }
  /** [linea-corta] → hueco corto (unos 3 cm) */
  | { tipo: 'linea-corta' }
  /** [caja] → recuadro para escribir (unas 3 líneas) */
  | { tipo: 'caja' }
  /** [caja-grande] → recuadro para escribir (unas 5 líneas) */
  | { tipo: 'caja-grande' }
  /** [firma: Texto] → recuadro de firma con el texto pequeño debajo */
  | { tipo: 'firma'; texto: string };

/** Una línea de texto: una lista de tramos seguidos. */
export type Linea = Tramo[];

/** Fila de una `::: tabla-datos`: etiqueta a la izquierda y contenido a la derecha. */
export interface FilaDatos {
  etiqueta: Linea;
  contenido: Linea;
}

/** Recuadros `:::` que contienen otros bloques dentro. */
export type TipoRecuadro = 'nota' | 'letra-pequena' | 'destacado' | 'firma';

/** Una pieza "grande" del documento. */
export type Bloque =
  /** ## Título de apartado (Título 1) */
  | { tipo: 'titulo1'; contenido: Linea }
  /** ### Subtítulo (Título 2) */
  | { tipo: 'titulo2'; contenido: Linea }
  /** Párrafo normal. Un párrafo puede ser solo un [caja] o un [caja-grande]. */
  | { tipo: 'parrafo'; contenido: Linea }
  /** Lista con viñetas (- ) o numerada (1. ). Cada elemento es una línea. */
  | { tipo: 'lista'; numerada: boolean; elementos: Linea[] }
  /** ::: tabla-datos */
  | { tipo: 'tabla-datos'; filas: FilaDatos[] }
  /** ::: tabla (y ::: tabla primera-columna-etiquetas). Cada celda es una línea. */
  | { tipo: 'tabla'; primeraColumnaEtiquetas: boolean; cabecera: Linea[]; filas: Linea[][] }
  /** ::: nota, ::: letra-pequena, ::: destacado y ::: firma, con sus bloques dentro */
  | { tipo: TipoRecuadro; bloques: Bloque[] }
  /** ::: salto-de-pagina */
  | { tipo: 'salto-de-pagina' };

/** Datos de la cabecera (frontmatter) del archivo. */
export interface Cabecera {
  documento: 'consentimiento' | 'informacion';
  variante: 'neutra' | 'calida';
  titulo: string;
  subtitulo: string;
  pie: string;
  /** Texto de la casilla de iniciales del pie, o null si es "no". */
  inicialesEnPie: string | null;
}

/** Un documento ya leído y con los datos de la clínica puestos. */
export interface Documento {
  cabecera: Cabecera;
  bloques: Bloque[];
}
