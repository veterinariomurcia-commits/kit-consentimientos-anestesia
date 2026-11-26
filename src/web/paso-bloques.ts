// Paso 2 · Los apartados de cada documento. Todos marcados al principio; se puede quitar
// cualquiera (D57). Si se quita uno al que otro hace referencia, se avisa pero se deja seguir (D65).

import { listarApartados, revisarReferencias } from '../contenido/bloques.ts';
import { lineasDeBloque, numeroDeTitulo } from '../contenido/lector.ts';
import type { Documento } from '../contenido/tipos.ts';
import { NOMBRE_DOCUMENTO, type TipoDocumento } from './contenidos.ts';
import { crear, porId } from './dom.ts';
import { alCambiar, avisarCambio, estado, estructura } from './estado.ts';

const TIPOS: TipoDocumento[] = ['consentimiento', 'informacion'];

/** Variante con la que se pintó la lista por última vez (los títulos cambian con la versión). */
let variantePintada: string | null = null;

export function iniciarPasoBloques(): void {
  pintar();
  alCambiar(() => {
    if (estado.variante !== variantePintada) pintar();
  });
}

function pintar(): void {
  variantePintada = estado.variante;
  const caja = porId('bloques');
  caja.replaceChildren(
    ...TIPOS.map((tipo) => {
      const apartados = listarApartados(estructura(tipo));
      const casillas = apartados.map((a) => {
        const id = `bloque-${tipo}-${a.numero}`;
        const input = crear('input', {
          type: 'checkbox',
          id,
          checked: !estado.quitados[tipo].includes(a.numero),
        });
        input.addEventListener('change', () => {
          const resto = estado.quitados[tipo].filter((n) => n !== a.numero);
          estado.quitados[tipo] = input.checked ? resto : [...resto, a.numero].sort((x, y) => x - y);
          avisarCambio();
          revisar();
        });
        return crear(
          'li',
          {},
          crear('label', { class: 'casilla', for: id }, input, crear('span', {}, `${a.numero}. ${a.titulo}`)),
        );
      });

      const todos = crear('button', { type: 'button', class: 'boton boton--enlace' }, 'Marcar todos');
      todos.addEventListener('click', () => {
        estado.quitados[tipo] = [];
        for (const i of caja.querySelectorAll<HTMLInputElement>(`input[id^="bloque-${tipo}-"]`)) i.checked = true;
        avisarCambio();
        revisar();
      });

      return crear(
        'fieldset',
        { class: 'documento' },
        crear('legend', {}, crear('h3', {}, NOMBRE_DOCUMENTO[tipo])),
        crear('ul', { class: 'lista-casillas' }, ...casillas),
        todos,
      );
    }),
  );
  revisar();
}

/** Avisos de la elección actual: referencias rotas, revocación y documentos sin apartados. */
export function avisosDeBloques(): string[] {
  const avisos: string[] = [];
  for (const tipo of TIPOS) {
    const doc = estructura(tipo);
    const quitados = estado.quitados[tipo];
    const nombre = NOMBRE_DOCUMENTO[tipo];
    if (quitados.length === listarApartados(doc).length) {
      avisos.push(`Has quitado todos los apartados de «${nombre}»: el documento saldrá casi vacío.`);
      continue;
    }
    for (const a of revisarReferencias(doc, quitados)) avisos.push(a.mensaje);
    const revocacion = avisoRevocacion(doc, quitados);
    if (revocacion) avisos.push(revocacion);
  }
  return avisos;
}

/**
 * La frase "…firmando el apartado de revocación" se refiere al recuadro de revocación, que está
 * en otro apartado y no lleva número, así que no tiene marca [ref:N] (pendiente de la D68).
 * Si se quita el apartado del recuadro y se deja el de la frase, se avisa.
 */
function avisoRevocacion(doc: Documento, quitados: number[]): string | null {
  let apartado: number | null = null;
  let frase: number | null = null;
  let recuadro: number | null = null;
  const titulos = new Map(listarApartados(doc).map((a) => [a.numero, a.titulo]));
  for (const b of doc.bloques) {
    if (b.tipo === 'titulo1') apartado = numeroDeTitulo(b.contenido);
    for (const linea of lineasDeBloque(b)) {
      const texto = linea.map((t) => ('texto' in t ? t.texto : '')).join('');
      if (/apartado de revocación/i.test(texto)) frase ??= apartado;
      if (linea.some((t) => 'campo' in t && t.campo === 'revocacion-fecha-hora')) recuadro ??= apartado;
    }
  }
  if (frase === null || recuadro === null || frase === recuadro) return null;
  if (quitados.includes(frase) || !quitados.includes(recuadro)) return null;
  return (
    `Cuidado: el apartado «${titulos.get(frase)}» dice que se puede revocar el consentimiento «firmando el ` +
    `apartado de revocación», que está en «${titulos.get(recuadro)}», que has quitado. Revisa esa frase en el Word.`
  );
}

function revisar(): void {
  const caja = porId('bloques-avisos');
  const avisos = avisosDeBloques();
  caja.replaceChildren(...avisos.map((a) => crear('p', { class: 'mensaje mensaje--aviso' }, a)));
}
