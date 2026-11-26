// Lector de los textos de contenido/.
//
// Convierte el texto de un archivo (cabecera + cuerpo con marcas) en un Documento:
// una lista de bloques que el generador de Word puede recorrer.
//
// No lee archivos del disco: recibe el texto ya cargado. Así funciona igual
// en el navegador (la web) y en Node (los scripts de muestras).
//
// Si encuentra algo que no entiende, no se lo salta: reúne todos los problemas
// con su número de línea y los avisa juntos (ErrorContenido).

import type {
  Bloque,
  Cabecera,
  DatosClinica,
  Documento,
  FilaDatos,
  Formato,
  Linea,
  Tramo,
  TipoRecuadro,
  Variable,
} from './tipos.ts';
import { VARIABLES } from './tipos.ts';
import { resolverVariable } from './variables.ts';

/** Error con la lista de todos los problemas encontrados en un texto. */
export class ErrorContenido extends Error {
  readonly errores: string[];

  constructor(errores: string[]) {
    super(`Hay ${errores.length} problema(s) en el contenido:\n- ${errores.join('\n- ')}`);
    this.name = 'ErrorContenido';
    this.errores = errores;
  }
}

/** Una línea del archivo con su número (empezando en 1). */
interface LineaArchivo {
  n: number;
  texto: string;
}

const RECUADROS: readonly TipoRecuadro[] = ['nota', 'letra-pequena', 'destacado', 'firma'];

/**
 * Lee un texto de contenido/ y pone los datos de la clínica.
 * @param texto Contenido completo del archivo .md
 * @param datos Datos de la clínica (los vacíos quedan como hueco amarillo)
 * @param archivo Nombre del archivo, solo para los mensajes de error
 */
export function leerContenido(texto: string, datos: DatosClinica, archivo = 'contenido'): Documento {
  const errores: string[] = [];
  const error = (n: number, mensaje: string) => errores.push(`${archivo}, línea ${n}: ${mensaje}`);

  const lineas: LineaArchivo[] = texto
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((t, i) => ({ n: i + 1, texto: t }));

  // Regla del proyecto: nunca "mascota".
  for (const l of lineas) {
    if (/mascota/i.test(l.texto)) error(l.n, 'aparece la palabra "mascota", que no se usa en este proyecto.');
  }

  const { cabecera, primeraLineaCuerpo } = leerCabecera(lineas, error);
  const lector = new LectorCuerpo(datos, error);
  const bloques = lector.leerBloques(lineas.slice(primeraLineaCuerpo), false);
  for (const mensaje of revisarApartados(bloques)) errores.push(`${archivo}: ${mensaje}`);

  if (errores.length > 0) throw new ErrorContenido(errores);
  return { cabecera: cabecera as Cabecera, bloques };
}

// ---------------------------------------------------------------------------
// Apartados y referencias
// ---------------------------------------------------------------------------

/** "3. Título" → 3. Si el título no empieza por un número, null. */
export function numeroDeTitulo(contenido: Linea): number | null {
  const primero = contenido[0];
  const m = primero?.tipo === 'texto' ? /^(\d+)\.\s/.exec(primero.texto) : null;
  return m ? Number(m[1]) : null;
}

/** Todas las líneas de texto de un bloque (también las de dentro de tablas y recuadros). */
export function lineasDeBloque(b: Bloque): Linea[] {
  switch (b.tipo) {
    case 'titulo1':
    case 'titulo2':
    case 'parrafo':
      return [b.contenido];
    case 'lista':
      return b.elementos;
    case 'tabla-datos':
      return b.filas.flatMap((f) => [f.etiqueta, f.contenido]);
    case 'tabla':
      return [b.cabecera, ...b.filas].flat();
    case 'salto-de-pagina':
      return [];
    default:
      return b.bloques.flatMap(lineasDeBloque);
  }
}

/**
 * Comprueba que los títulos "##" van numerados 1, 2, 3… sin saltos (el número es lo que
 * identifica a cada apartado al quitar bloques) y que cada [ref:N] apunta a un apartado que existe.
 */
function revisarApartados(bloques: Bloque[]): string[] {
  const errores: string[] = [];
  let esperado = 1;
  for (const b of bloques) {
    if (b.tipo !== 'titulo1') continue;
    const n = numeroDeTitulo(b.contenido);
    const texto = b.contenido.map((t) => ('texto' in t ? t.texto : '')).join('');
    if (n === null) errores.push(`el título "## ${texto}" debe empezar por su número, por ejemplo "## ${esperado}. …".`);
    else if (n !== esperado) errores.push(`el título "## ${texto}" debería llevar el número ${esperado}.`);
    esperado++;
  }
  const total = esperado - 1;
  for (const linea of bloques.flatMap(lineasDeBloque)) {
    for (const t of linea) {
      if (t.tipo === 'referencia' && (t.apartado < 1 || t.apartado > total)) {
        errores.push(`"[ref:${t.apartado}]" apunta a un apartado que no existe (hay ${total}).`);
      }
    }
  }
  return errores;
}

// ---------------------------------------------------------------------------
// Cabecera (frontmatter)
// ---------------------------------------------------------------------------

const CLAVES_CABECERA = ['documento', 'variante', 'titulo', 'subtitulo', 'pie', 'iniciales_en_pie'] as const;

function leerCabecera(
  lineas: LineaArchivo[],
  error: (n: number, mensaje: string) => void,
): { cabecera: Partial<Cabecera>; primeraLineaCuerpo: number } {
  if (lineas[0]?.texto.trim() !== '---') {
    error(1, 'el archivo debe empezar con la cabecera entre dos líneas "---".');
    return { cabecera: {}, primeraLineaCuerpo: 0 };
  }
  const fin = lineas.findIndex((l, i) => i > 0 && l.texto.trim() === '---');
  if (fin < 0) {
    error(1, 'la cabecera no está cerrada con una línea "---".');
    return { cabecera: {}, primeraLineaCuerpo: lineas.length };
  }

  const valores: Record<string, string> = {};
  for (const l of lineas.slice(1, fin)) {
    if (l.texto.trim() === '') continue;
    const dosPuntos = l.texto.indexOf(':');
    if (dosPuntos < 0) {
      error(l.n, `en la cabecera, falta ":" en "${l.texto.trim()}".`);
      continue;
    }
    const clave = l.texto.slice(0, dosPuntos).trim();
    let valor = l.texto.slice(dosPuntos + 1).trim();
    if (/^(["']).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (!(CLAVES_CABECERA as readonly string[]).includes(clave)) {
      error(l.n, `en la cabecera, la clave "${clave}" no existe. Las válidas son: ${CLAVES_CABECERA.join(', ')}.`);
      continue;
    }
    valores[clave] = valor;
  }

  for (const clave of CLAVES_CABECERA) {
    if (!valores[clave]) error(1, `en la cabecera, falta "${clave}".`);
  }
  if (valores.documento && !['consentimiento', 'informacion'].includes(valores.documento)) {
    error(1, `en la cabecera, "documento" debe ser "consentimiento" o "informacion" (pone "${valores.documento}").`);
  }
  if (valores.variante && !['neutra', 'calida'].includes(valores.variante)) {
    error(1, `en la cabecera, "variante" debe ser "neutra" o "calida" (pone "${valores.variante}").`);
  }

  const iniciales = valores.iniciales_en_pie ?? '';
  return {
    cabecera: {
      documento: valores.documento as Cabecera['documento'],
      variante: valores.variante as Cabecera['variante'],
      titulo: valores.titulo ?? '',
      subtitulo: valores.subtitulo ?? '',
      pie: valores.pie ?? '',
      inicialesEnPie: iniciales.toLowerCase() === 'no' ? null : iniciales,
    },
    primeraLineaCuerpo: fin + 1,
  };
}

// ---------------------------------------------------------------------------
// Cuerpo
// ---------------------------------------------------------------------------

class LectorCuerpo {
  private readonly datos: DatosClinica;
  private readonly error: (n: number, mensaje: string) => void;

  constructor(datos: DatosClinica, error: (n: number, mensaje: string) => void) {
    this.datos = datos;
    this.error = error;
  }

  /** Lee una serie de líneas y devuelve sus bloques. */
  leerBloques(lineas: LineaArchivo[], dentroDeRecuadro: boolean): Bloque[] {
    const bloques: Bloque[] = [];
    let parrafo: LineaArchivo[] = [];
    let lista: { numerada: boolean; elementos: Linea[] } | null = null;

    const cerrarParrafo = () => {
      if (parrafo.length === 0) return;
      const texto = parrafo.map((l) => l.texto.trim()).join(' ');
      bloques.push({ tipo: 'parrafo', contenido: this.leerLinea(texto, parrafo[0].n) });
      parrafo = [];
    };
    const cerrarLista = () => {
      if (!lista) return;
      bloques.push({ tipo: 'lista', numerada: lista.numerada, elementos: lista.elementos });
      lista = null;
    };

    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const t = l.texto.trim();

      if (t === '') {
        cerrarParrafo();
        cerrarLista();
        continue;
      }

      // Bloques ::: … :::
      if (t.startsWith(':::')) {
        cerrarParrafo();
        cerrarLista();
        const nombre = t.slice(3).trim();
        if (dentroDeRecuadro) {
          this.error(l.n, 'no se puede poner un bloque ":::" dentro de otro.');
          continue;
        }
        if (nombre === '') {
          this.error(l.n, 'hay un ":::" de cierre sin su apertura.');
          continue;
        }
        const cierre = lineas.findIndex((x, j) => j > i && x.texto.trim() === ':::');
        if (cierre < 0) {
          this.error(l.n, `el bloque "::: ${nombre}" no está cerrado con ":::".`);
          break;
        }
        const bloque = this.leerBloqueEspecial(nombre, lineas.slice(i + 1, cierre), l.n);
        if (bloque) bloques.push(bloque);
        i = cierre;
        continue;
      }

      // Títulos
      const titulo = /^(#+)\s+(.*)$/.exec(t);
      if (titulo) {
        cerrarParrafo();
        cerrarLista();
        const nivel = titulo[1].length;
        if (nivel === 2) bloques.push({ tipo: 'titulo1', contenido: this.leerLinea(titulo[2], l.n) });
        else if (nivel === 3) bloques.push({ tipo: 'titulo2', contenido: this.leerLinea(titulo[2], l.n) });
        else this.error(l.n, `solo se admiten "##" (título) y "###" (subtítulo); aquí hay "${titulo[1]}".`);
        continue;
      }

      // Listas
      const vineta = /^- +(.*)$/.exec(t);
      const numero = /^\d+\. +(.*)$/.exec(t);
      if (vineta || numero) {
        cerrarParrafo();
        const numerada = Boolean(numero);
        if (lista && lista.numerada !== numerada) cerrarLista();
        if (!lista) lista = { numerada, elementos: [] };
        lista.elementos.push(this.leerLinea((vineta ?? numero)![1], l.n));
        continue;
      }

      if (t.startsWith('|')) {
        this.error(l.n, 'hay una fila de tabla fuera de un bloque "::: tabla".');
        continue;
      }

      // Texto normal: las líneas seguidas forman un párrafo.
      cerrarLista();
      parrafo.push(l);
    }

    cerrarParrafo();
    cerrarLista();
    return bloques;
  }

  /** Lee el interior de un bloque ::: nombre … ::: */
  private leerBloqueEspecial(nombre: string, interior: LineaArchivo[], n: number): Bloque | null {
    if (nombre === 'tabla-datos') return this.leerTablaDatos(interior);
    if (nombre === 'tabla') return this.leerTabla(interior, false, n);
    if (nombre === 'tabla primera-columna-etiquetas') return this.leerTabla(interior, true, n);
    if (nombre === 'salto-de-pagina') {
      const sobra = interior.find((l) => l.texto.trim() !== '');
      if (sobra) this.error(sobra.n, 'un "::: salto-de-pagina" debe ir vacío.');
      return { tipo: 'salto-de-pagina' };
    }
    if ((RECUADROS as readonly string[]).includes(nombre)) {
      const bloques = this.leerBloques(interior, true);
      if (bloques.length === 0) this.error(n, `el bloque "::: ${nombre}" está vacío.`);
      return { tipo: nombre as TipoRecuadro, bloques };
    }
    this.error(
      n,
      `el bloque "::: ${nombre}" no existe. Los válidos son: tabla-datos, tabla, ` +
        `tabla primera-columna-etiquetas, ${RECUADROS.join(', ')} y salto-de-pagina.`,
    );
    return null;
  }

  /** ::: tabla-datos: cada fila es "- Etiqueta :: contenido". */
  private leerTablaDatos(interior: LineaArchivo[]): Bloque {
    const filas: FilaDatos[] = [];
    for (const l of interior) {
      const t = l.texto.trim();
      if (t === '') continue;
      const fila = /^- +(.+?) +:: *(.*)$/.exec(t);
      if (!fila) {
        this.error(l.n, 'en una tabla-datos, cada fila debe ser "- Etiqueta :: contenido".');
        continue;
      }
      filas.push({ etiqueta: this.leerLinea(fila[1], l.n), contenido: this.leerLinea(fila[2], l.n) });
    }
    if (filas.length === 0 && interior.length > 0) this.error(interior[0].n - 1, 'la tabla-datos no tiene filas.');
    return { tipo: 'tabla-datos', filas };
  }

  /** ::: tabla: tabla markdown con fila de cabecera y fila separadora |---|. */
  private leerTabla(interior: LineaArchivo[], primeraColumnaEtiquetas: boolean, n: number): Bloque {
    const filas = interior.filter((l) => l.texto.trim() !== '');
    const celdas = (l: LineaArchivo): string[] =>
      l.texto
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());

    for (const l of filas) {
      if (!l.texto.trim().startsWith('|')) this.error(l.n, 'en una tabla, cada fila debe empezar por "|".');
    }
    if (filas.length < 2 || !celdas(filas[1]).every((c) => /^:?-+:?$/.test(c))) {
      this.error(n, 'la tabla debe tener una fila de cabecera y debajo una fila separadora "|---|---|".');
      return { tipo: 'tabla', primeraColumnaEtiquetas, cabecera: [], filas: [] };
    }

    const cabecera = celdas(filas[0]);
    const columnas = cabecera.length;
    const cuerpo: Linea[][] = [];
    for (const l of filas.slice(2)) {
      const c = celdas(l);
      if (c.length !== columnas) {
        this.error(l.n, `esta fila tiene ${c.length} columnas y la cabecera tiene ${columnas}.`);
      }
      cuerpo.push(c.map((texto) => this.leerLinea(texto, l.n)));
    }
    return {
      tipo: 'tabla',
      primeraColumnaEtiquetas,
      cabecera: cabecera.map((texto) => this.leerLinea(texto, filas[0].n)),
      filas: cuerpo,
    };
  }

  /** Convierte una línea de texto en tramos: negrita, cursiva, casillas, huecos y datos. */
  leerLinea(texto: string, n: number): Linea {
    const tramos: Tramo[] = [];
    const formato: Formato = { negrita: false, cursiva: false };

    const ponerTexto = (t: string) => {
      if (t === '') return;
      if (t.includes('{{') || t.includes('}}')) this.error(n, 'hay unas llaves "{{ }}" mal cerradas.');
      const ultimo = tramos[tramos.length - 1];
      if (ultimo?.tipo === 'texto' && ultimo.negrita === formato.negrita && ultimo.cursiva === formato.cursiva) {
        ultimo.texto += t;
      } else {
        tramos.push({ tipo: 'texto', texto: t, ...formato });
      }
    };

    // Marcas que reconoce el lector, en orden de prioridad.
    const marcas =
      /\*\*|\*|\[ \]|\[linea\]|\[linea-corta\]|\[caja\]|\[caja-grande\]|\[firma:([^\]]*)\]|\{\{([^}]*)\}\}|\[ref: *(\d+) *\]|\[[a-z][a-z-]*(?::[^\]]*)?\]/g;
    let desde = 0;
    for (const m of texto.matchAll(marcas)) {
      ponerTexto(texto.slice(desde, m.index));
      desde = m.index + m[0].length;
      const marca = m[0];

      if (marca === '**') formato.negrita = !formato.negrita;
      else if (marca === '*') formato.cursiva = !formato.cursiva;
      else if (marca === '[ ]') tramos.push({ tipo: 'casilla' });
      else if (marca === '[linea]') tramos.push({ tipo: 'linea' });
      else if (marca === '[linea-corta]') tramos.push({ tipo: 'linea-corta' });
      else if (marca === '[caja]') tramos.push({ tipo: 'caja' });
      else if (marca === '[caja-grande]') tramos.push({ tipo: 'caja-grande' });
      else if (m[1] !== undefined) {
        const textoFirma = m[1].trim();
        if (textoFirma === '') this.error(n, 'un "[firma: …]" necesita un texto, por ejemplo "[firma: Firma]".');
        tramos.push({ tipo: 'firma', texto: textoFirma });
      } else if (m[2] !== undefined) {
        const nombre = m[2].trim();
        if ((VARIABLES as readonly string[]).includes(nombre)) {
          const variable = nombre as Variable;
          tramos.push({ tipo: 'dato', variable, ...resolverVariable(variable, this.datos), ...formato });
        } else {
          this.error(n, `la variable "{{${nombre}}}" no existe. Las válidas son: ${VARIABLES.join(', ')}.`);
        }
      } else if (m[3] !== undefined) {
        const apartado = Number(m[3]);
        tramos.push({ tipo: 'referencia', apartado, texto: String(apartado), quitado: false, ...formato });
      } else {
        this.error(
          n,
          `la marca "${marca}" no existe. Las válidas son: [ ], [linea], [linea-corta], [caja], [caja-grande], ` +
            '[firma: Texto] y [ref:N].',
        );
      }
    }
    ponerTexto(texto.slice(desde));

    if (formato.negrita) this.error(n, 'hay una negrita "**" sin cerrar.');
    if (formato.cursiva) this.error(n, 'hay una cursiva "*" sin cerrar.');
    return tramos;
  }
}
