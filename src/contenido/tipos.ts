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
  /**
   * [ref:N] → número de otro apartado ("ver apartado 3"). `apartado` es el número original
   * del texto de contenido/. Al elegir los apartados (bloques.ts), `texto` pasa a ser el número
   * nuevo; si ese apartado se ha quitado, `quitado` = true y el generador lo resalta en amarillo.
   */
  | ({ tipo: 'referencia'; apartado: number; texto: string; quitado: boolean } & Formato)
  /**
   * [ ] → casilla ☐. Con nombre ("[ ]#perro") es un campo del paciente (T7): si `marcada` es
   * true, el generador dibuja ☒.
   */
  | { tipo: 'casilla'; campo?: string; marcada?: boolean }
  /**
   * Huecos para escribir. Con nombre ("[linea#dni]") son campos del paciente (T7): si `valor`
   * tiene texto, el generador lo escribe en el hueco; si no, sale el hueco en blanco.
   *   [linea]       → hueco que ocupa el resto de la línea o celda
   *   [linea-corta] → hueco corto (unos 3 cm)
   *   [caja]        → recuadro para escribir (unas 3 líneas)
   *   [caja-grande] → recuadro para escribir (unas 5 líneas)
   */
  | { tipo: TipoHueco; campo?: string; valor?: string }
  /** [firma: Texto] → recuadro de firma con el texto pequeño debajo */
  | { tipo: 'firma'; texto: string };

/** Tipos de hueco para escribir. */
export type TipoHueco = 'linea' | 'linea-corta' | 'caja' | 'caja-grande';

/**
 * Datos del paciente y del titular (T7), por el nombre de cada campo ("dni", "perro"…).
 * Los huecos llevan texto y las casillas, true (marcada) o false. Lo que no se pone sale en blanco.
 * Estos datos nunca se guardan en ningún sitio (D60).
 */
export type DatosPaciente = Record<string, string | boolean>;

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
