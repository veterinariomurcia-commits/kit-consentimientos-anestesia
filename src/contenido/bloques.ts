// Bloques elegibles: cada apartado "##" de un documento se puede quitar (D57).
//
// Cada apartado se identifica por su número original en contenido/ (el mismo en la versión
// neutra y en la cálida). Al quitar apartados:
//   - Los que quedan se numeran de nuevo (1, 2, 3…).
//   - Las referencias [ref:N] ("ver apartado 3") pasan a llevar el número nuevo (D58).
//     Si el apartado al que apuntan se ha quitado, salen como "[apartado quitado]" en amarillo
//     y se devuelve un aviso para que la web lo muestre.
//   - El texto que va antes del primer apartado no se quita nunca.
//   - La protección de datos (::: letra-pequena) no se quita nunca: si su apartado se quita,
//     se queda en su sitio, al final del apartado anterior.
//   - Un salto de página que va justo antes de un título pertenece a ese apartado.
//
// No usa nada propio de Node: sirve igual en la web y en los scripts de muestras.

import { lineasDeBloque, numeroDeTitulo } from './lector.ts';
import type { Bloque, Documento, Linea } from './tipos.ts';

/** Un apartado del documento, para que la web lo muestre en la lista de bloques. */
export interface Apartado {
  /** Número original en contenido/. Es lo que identifica al apartado. */
  numero: number;
  /** Título sin el número, por ejemplo "Datos de identificación". */
  titulo: string;
}

/** Aviso: un apartado que se queda hace referencia a otro que se ha quitado. */
export interface AvisoReferencia {
  /** Apartado que contiene la referencia (número original), o null si está antes del primer apartado. */
  apartado: number | null;
  /** Apartado quitado al que apunta (número original). */
  referido: number;
  /** Mensaje listo para mostrar en pantalla. */
  mensaje: string;
}

/** Bloque que nunca se quita, aunque se quite el apartado donde está. */
const esProtegido = (b: Bloque) => b.tipo === 'letra-pequena';

/** Texto de un título sin su número: "3. Valoración…" → "Valoración…". */
function tituloSinNumero(contenido: Linea): string {
  const texto = contenido.map((t) => ('texto' in t ? t.texto : '')).join('');
  return texto.replace(/^\d+\.\s+/, '');
}

/** Parte el documento en la introducción (lo de antes del primer "##") y los apartados. */
function partir(bloques: Bloque[]): { intro: Bloque[]; apartados: { numero: number; bloques: Bloque[] }[] } {
  const intro: Bloque[] = [];
  const apartados: { numero: number; bloques: Bloque[] }[] = [];
  for (const b of bloques) {
    const actual = apartados.length > 0 ? apartados[apartados.length - 1].bloques : intro;
    if (b.tipo === 'titulo1') {
      // Los saltos de página que van justo antes del título pasan al apartado nuevo.
      const saltos: Bloque[] = [];
      while (actual.length > 0 && actual[actual.length - 1].tipo === 'salto-de-pagina') saltos.unshift(actual.pop()!);
      apartados.push({ numero: numeroDeTitulo(b.contenido) ?? apartados.length + 1, bloques: [...saltos, b] });
    } else {
      actual.push(b);
    }
  }
  return { intro, apartados };
}

/** Lista de los apartados de un documento, en orden. */
export function listarApartados(doc: Documento): Apartado[] {
  return doc.bloques
    .filter((b) => b.tipo === 'titulo1')
    .map((b, i) => ({ numero: numeroDeTitulo(b.contenido) ?? i + 1, titulo: tituloSinNumero(b.contenido) }));
}

/**
 * Avisos de referencias rotas si se quitan los apartados `quitados`.
 * La web puede llamarla cada vez que se marca o desmarca un bloque, sin generar el Word.
 */
export function revisarReferencias(doc: Documento, quitados: readonly number[]): AvisoReferencia[] {
  const titulos = new Map(listarApartados(doc).map((a) => [a.numero, a.titulo]));
  const { intro, apartados } = partir(doc.bloques);
  const grupos = [
    { numero: null as number | null, bloques: intro },
    ...apartados.map((a) => ({
      numero: a.numero as number | null,
      bloques: quitados.includes(a.numero) ? a.bloques.filter(esProtegido) : a.bloques,
    })),
  ];

  const avisos: AvisoReferencia[] = [];
  for (const g of grupos) {
    const vistos = new Set<number>();
    for (const t of g.bloques.flatMap(lineasDeBloque).flat()) {
      if (t.tipo !== 'referencia' || !quitados.includes(t.apartado) || vistos.has(t.apartado)) continue;
      vistos.add(t.apartado);
      const donde = g.numero === null ? 'la introducción' : `el apartado «${titulos.get(g.numero)}»`;
      avisos.push({
        apartado: g.numero,
        referido: t.apartado,
        mensaje:
          `Cuidado: ${donde} hace referencia al apartado «${titulos.get(t.apartado)}», que has quitado. ` +
          'En el documento saldrá «[apartado quitado]» en amarillo para que corrijas esa frase.',
      });
    }
  }
  return avisos;
}

/**
 * Quita del documento los apartados `quitados` (números originales), numera de nuevo los que
 * quedan y pone el número correcto en las referencias. No cambia el documento recibido.
 */
export function elegirApartados(
  doc: Documento,
  quitados: readonly number[],
): { documento: Documento; avisos: AvisoReferencia[] } {
  const existentes = listarApartados(doc).map((a) => a.numero);
  const desconocidos = quitados.filter((n) => !existentes.includes(n));
  if (desconocidos.length > 0) {
    throw new Error(`No existe el apartado ${desconocidos.join(', ')} (el documento tiene ${existentes.length}).`);
  }

  const avisos = revisarReferencias(doc, quitados);
  const { intro, apartados } = structuredClone(partir(doc.bloques));

  // Número nuevo de cada apartado que se queda.
  const numeroNuevo = new Map<number, number>();
  for (const a of apartados) if (!quitados.includes(a.numero)) numeroNuevo.set(a.numero, numeroNuevo.size + 1);

  const bloques: Bloque[] = [...intro];
  for (const a of apartados) {
    if (quitados.includes(a.numero)) {
      bloques.push(...a.bloques.filter(esProtegido));
      continue;
    }
    for (const b of a.bloques) {
      // Un salto de página al principio del documento dejaría la primera página casi vacía.
      if (b.tipo === 'salto-de-pagina' && bloques.length === 0) continue;
      if (b.tipo === 'titulo1') {
        const primero = b.contenido[0];
        if (primero?.tipo === 'texto') primero.texto = primero.texto.replace(/^\d+\./, `${numeroNuevo.get(a.numero)}.`);
      }
      bloques.push(b);
    }
  }

  // Referencias: el número nuevo, o el hueco amarillo si su apartado ya no está.
  for (const t of bloques.flatMap(lineasDeBloque).flat()) {
    if (t.tipo !== 'referencia') continue;
    const nuevo = numeroNuevo.get(t.apartado);
    t.texto = nuevo === undefined ? '[apartado quitado]' : String(nuevo);
    t.quitado = nuevo === undefined;
  }

  return { documento: { cabecera: doc.cabecera, bloques }, avisos };
}
