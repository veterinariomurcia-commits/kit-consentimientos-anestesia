// Lo que el veterinario ha elegido en la página, en un solo sitio.
//
// Cada paso cambia su parte y llama a `avisarCambio()`; los pasos que dependen de otros (por
// ejemplo, el paso del paciente depende de los bloques elegidos) se suscriben con `alCambiar()`.
// Nada de esto se envía a ningún sitio. Solo los datos de la clínica se pueden recordar en el
// navegador, y solo si el veterinario marca la casilla (recordar.ts). Los del paciente, nunca.

import { leerContenido } from '../contenido/lector.ts';
import type { DatosClinica, DatosPaciente, Documento } from '../contenido/tipos.ts';
import { DATOS_VACIOS } from '../contenido/variables.ts';
import { COLOR_POR_DEFECTO } from '../generador/color.ts';
import type { Logo } from '../generador/imagen.ts';
import { archivo, TEXTOS, type TipoDocumento, type Variante } from './contenidos.ts';

export interface Estado {
  clinica: DatosClinica;
  logo: Logo | null;
  /** Color de la clínica, como "#2E6A80". */
  color: string;
  variante: Variante;
  /** Apartados quitados de cada documento (número original en contenido/). */
  quitados: Record<TipoDocumento, number[]>;
  /** Datos del paciente. Solo en memoria: desaparecen al cerrar o recargar la página. */
  paciente: DatosPaciente;
}

export const estado: Estado = {
  clinica: { ...DATOS_VACIOS },
  logo: null,
  color: `#${COLOR_POR_DEFECTO}`,
  variante: 'neutra',
  quitados: { consentimiento: [], informacion: [] },
  paciente: {},
};

type Oyente = () => void;
const oyentes: Oyente[] = [];

export function alCambiar(oyente: Oyente): void {
  oyentes.push(oyente);
}

export function avisarCambio(): void {
  for (const o of oyentes) o();
}

// Para listar apartados y campos basta la estructura del texto: se lee una vez con los datos
// vacíos y se guarda. Para fabricar el Word se vuelve a leer con los datos de la clínica.
const estructuras = new Map<string, Documento>();

/** El documento leído con los datos vacíos (solo para saber sus apartados y campos). */
export function estructura(tipo: TipoDocumento, variante: Variante = estado.variante): Documento {
  const clave = `${tipo}-${variante}`;
  let doc = estructuras.get(clave);
  if (!doc) {
    doc = leerContenido(TEXTOS[tipo][variante], DATOS_VACIOS, archivo(tipo, variante));
    estructuras.set(clave, doc);
  }
  return doc;
}
