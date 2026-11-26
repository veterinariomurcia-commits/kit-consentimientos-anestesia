// Pequeñas ayudas para crear y buscar elementos de la página, sin ninguna librería.

type Atributos = Record<string, string | boolean | undefined>;
type Hijo = Node | string | null | undefined | false;

/** Crea un elemento con sus atributos y sus hijos: crear('p', { class: 'nota' }, 'Hola'). */
export function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Atributos = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    el.setAttribute(nombre, valor === true ? '' : valor);
  }
  for (const h of hijos) if (h !== null && h !== undefined && h !== false) el.append(h);
  return el;
}

/** Busca un elemento por su id; si no existe, es un fallo de la propia página. */
export function porId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html.`);
  return el as T;
}

/** Un identificador único para unir etiquetas y campos (for/id, aria-describedby…). */
let contador = 0;
export const nuevoId = (prefijo: string) => `${prefijo}-${++contador}`;
