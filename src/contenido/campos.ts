// Datos del paciente (T7): cada hueco y cada casilla del consentimiento lleva un nombre en
// contenido/ ("[linea#dni]", "[ ]#perro"). El veterinario puede rellenarlos en la web o dejarlos
// vacíos para escribirlos a mano (D60).
//
//   - listarCampos: la lista de campos de un documento, para el paso 3 de la web (T8).
//   - rellenarCampos: pone los datos del paciente en el documento. Lo que no se rellena sale
//     como ahora, con el hueco en blanco.
//
// Los datos del paciente no se guardan en ningún sitio: se usan para fabricar el Word y nada más.
// No usa nada propio de Node: sirve igual en la web y en los scripts de muestras.

import { lineasDeBloque, numeroDeTitulo } from './lector.ts';
import type { Bloque, DatosPaciente, Documento, Linea, Tramo } from './tipos.ts';

/** Clase de campo: una casilla (se marca o no) o un hueco para escribir (de más corto a más largo). */
export type ClaseCampo = 'casilla' | 'texto-corto' | 'texto' | 'texto-largo';

/** Un campo del documento, para que la web lo muestre en el paso del paciente. */
export interface Campo {
  /** Nombre del campo en contenido/, por ejemplo "dni". Es el mismo en las dos versiones. */
  nombre: string;
  clase: ClaseCampo;
  /** Apartado donde sale por primera vez (número original), o null si va antes del primero. */
  apartado: number | null;
  /**
   * Texto de alrededor, para saber qué es: la etiqueta de la fila de la tabla de datos, o la
   * línea donde está, con "…" en el sitio del campo. Por ejemplo, "Especie / raza: ☐ Perro …".
   */
  contexto: string;
}

/** Aviso al rellenar: un dato que no corresponde a ningún campo, o que es de otra clase. */
export interface AvisoCampo {
  campo: string;
  mensaje: string;
}

const CLASE: Record<string, ClaseCampo> = {
  casilla: 'casilla',
  'linea-corta': 'texto-corto',
  linea: 'texto',
  caja: 'texto-largo',
  'caja-grande': 'texto-largo',
};

/** El tramo es un hueco o una casilla con nombre. */
const conNombre = (t: Tramo): t is Extract<Tramo, { campo?: string }> & { campo: string } =>
  'campo' in t && typeof t.campo === 'string';

/** Línea en texto plano, con "…" en el sitio de `aqui` y ☐ en las demás casillas. */
function textoDeLinea(linea: Linea, aqui: Tramo): string {
  return linea
    .map((t) => {
      if (t === aqui) return '…';
      if (t.tipo === 'casilla') return '☐';
      if ('texto' in t && t.tipo !== 'firma') return t.texto;
      return '___';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Recorre todas las líneas de los bloques con la etiqueta que les da sentido (filas de tablas). */
function* lineasConEtiqueta(bloques: Bloque[]): Generator<{ linea: Linea; etiqueta: string | null }> {
  const plano = (l: Linea) =>
    l
      .map((t) => ('texto' in t && t.tipo !== 'firma' ? t.texto : ''))
      .join('')
      .trim();
  for (const b of bloques) {
    if (b.tipo === 'tabla-datos') {
      for (const f of b.filas) {
        yield { linea: f.etiqueta, etiqueta: null };
        yield { linea: f.contenido, etiqueta: plano(f.etiqueta) };
      }
    } else if (b.tipo === 'tabla') {
      for (const fila of b.filas) {
        // La etiqueta de una celda es "fila · columna", por ejemplo "Electrocardiograma · Acepta".
        for (let c = 0; c < fila.length; c++) {
          const columna = plano(b.cabecera[c] ?? []);
          const primera = c === 0 ? '' : plano(fila[0] ?? []);
          const etiqueta = [primera, columna].filter(Boolean).join(' · ');
          yield { linea: fila[c], etiqueta: etiqueta || null };
        }
      }
    } else if ('bloques' in b) {
      yield* lineasConEtiqueta(b.bloques);
    } else {
      for (const linea of lineasDeBloque(b)) yield { linea, etiqueta: null };
    }
  }
}

/** Lista de los campos de un documento, en orden y sin repetir (el primer sitio donde salen). */
export function listarCampos(doc: Documento): Campo[] {
  const campos = new Map<string, Campo>();
  let apartado: number | null = null;
  // Última línea de texto vista: un recuadro suelto ([caja]) se explica con el párrafo de antes.
  let anterior = '';
  for (const b of doc.bloques) {
    if (b.tipo === 'titulo1') apartado = numeroDeTitulo(b.contenido);
    for (const { linea, etiqueta } of lineasConEtiqueta([b])) {
      for (const t of linea) {
        if (!conNombre(t) || campos.has(t.campo)) continue;
        const enLinea = textoDeLinea(linea, t);
        const contexto = etiqueta
          ? enLinea === '…'
            ? etiqueta
            : `${etiqueta}: ${enLinea}`
          : enLinea === '…'
            ? anterior
            : enLinea;
        campos.set(t.campo, { nombre: t.campo, clase: CLASE[t.tipo], apartado, contexto });
      }
      const texto = linea
        .map((t) => ('texto' in t && t.tipo !== 'firma' ? t.texto : ''))
        .join('')
        .trim();
      if (texto !== '') anterior = texto;
    }
  }
  return [...campos.values()];
}

/**
 * Pone los datos del paciente en el documento: el texto en los huecos y la marca en las casillas.
 * No cambia el documento recibido. Se usa antes de elegir los apartados (bloques.ts), para que los
 * nombres se comprueben contra el documento entero.
 * Devuelve avisos si llega un dato con un nombre que no existe o de la clase equivocada (un texto
 * para una casilla, o una marca para un hueco); ese dato no se usa.
 */
export function rellenarCampos(
  doc: Documento,
  datos: DatosPaciente,
): { documento: Documento; avisos: AvisoCampo[] } {
  const clases = new Map(listarCampos(doc).map((c) => [c.nombre, c.clase]));
  const avisos: AvisoCampo[] = [];
  const validos: DatosPaciente = {};
  for (const [nombre, valor] of Object.entries(datos)) {
    const clase = clases.get(nombre);
    if (clase === undefined) {
      avisos.push({ campo: nombre, mensaje: `El campo «${nombre}» no existe en este documento; no se ha usado.` });
    } else if ((clase === 'casilla') !== (typeof valor === 'boolean')) {
      const espera = clase === 'casilla' ? 'una casilla (sí o no)' : 'un texto';
      avisos.push({ campo: nombre, mensaje: `El campo «${nombre}» es ${espera}; el dato recibido no se ha usado.` });
    } else {
      validos[nombre] = valor;
    }
  }

  const documento = structuredClone(doc);
  for (const t of documento.bloques.flatMap(lineasDeBloque).flat()) {
    if (!conNombre(t) || !(t.campo in validos)) continue;
    const valor = validos[t.campo];
    if (t.tipo === 'casilla') t.marcada = valor === true;
    else if (typeof valor === 'string' && valor.trim() !== '') t.valor = valor.trim();
  }
  return { documento, avisos };
}
