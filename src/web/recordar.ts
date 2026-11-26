// Recordar los datos de la clínica en este navegador (aprobado por Sira en la T8).
//
// Solo si el veterinario marca la casilla, que empieza desmarcada. Se guardan en `localStorage`
// (un almacén del navegador que no sale del ordenador): datos de la clínica, logo, color y versión.
// Los datos del paciente NUNCA se guardan (D60).

import type { DatosClinica } from '../contenido/tipos.ts';
import { DATOS_VACIOS } from '../contenido/variables.ts';
import { detectarTipo } from '../generador/imagen.ts';
import { porId } from './dom.ts';
import { alCambiar, avisarCambio, estado } from './estado.ts';
import { CAMPOS_CLINICA, mostrarClinica } from './paso-clinica.ts';

const CLAVE = 'kit-consentimientos-anestesia:clinica';

/** Lo que se guarda. El paciente no está aquí, a propósito. */
interface Guardado {
  version: 1;
  clinica: DatosClinica;
  color: string;
  variante: 'neutra' | 'calida';
  /** Logo en base64, o null. */
  logo: string | null;
}

// El logo se pasa a texto una sola vez, no en cada tecla que se pulsa.
const enBase64 = new WeakMap<Uint8Array, string>();

function aBase64(datos: Uint8Array): string {
  const hecho = enBase64.get(datos);
  if (hecho) return hecho;
  const texto = base64(datos);
  enBase64.set(datos, texto);
  return texto;
}

function base64(datos: Uint8Array): string {
  let s = '';
  for (let i = 0; i < datos.length; i += 0x8000) s += String.fromCharCode(...datos.subarray(i, i + 0x8000));
  return btoa(s);
}

function deBase64(texto: string): Uint8Array {
  const s = atob(texto);
  const datos = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) datos[i] = s.charCodeAt(i);
  return datos;
}

function leer(): Guardado | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const g = JSON.parse(texto) as Guardado;
    return g.version === 1 ? g : null;
  } catch {
    return null; // Navegador sin almacén (modo privado…) o datos estropeados: se empieza de cero.
  }
}

function mensaje(texto: string): void {
  const p = porId('recordar-mensaje');
  p.textContent = texto;
  p.hidden = texto === '';
}

/** Guarda los datos de la clínica. Devuelve false si el navegador no lo permite. */
function guardar(): boolean {
  const g: Guardado = {
    version: 1,
    clinica: { ...estado.clinica },
    color: estado.color,
    variante: estado.variante,
    logo: estado.logo ? aBase64(estado.logo.datos) : null,
  };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g));
    return true;
  } catch {
    // Lo normal es que no quepa el logo: se guardan los demás datos sin él.
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...g, logo: null }));
      mensaje('Tu logo es demasiado grande para recordarlo en este navegador. El resto de datos sí se recuerdan.');
      return true;
    } catch {
      return false;
    }
  }
}

function borrar(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Si el navegador no tiene almacén, no hay nada que borrar.
  }
}

export function iniciarRecordar(): void {
  const casilla = porId<HTMLInputElement>('recordar');
  const olvidar = porId<HTMLButtonElement>('olvidar');

  // Al abrir la página: si hay datos recordados, se ponen en el formulario.
  const g = leer();
  if (g) {
    for (const c of CAMPOS_CLINICA) estado.clinica[c] = g.clinica[c] ?? DATOS_VACIOS[c];
    estado.color = g.color;
    estado.variante = g.variante === 'calida' ? 'calida' : 'neutra';
    if (g.logo) {
      try {
        const datos = deBase64(g.logo);
        estado.logo = { datos, tipo: detectarTipo(datos) };
      } catch {
        estado.logo = null;
      }
    }
    casilla.checked = true;
    olvidar.hidden = false;
    mostrarClinica();
    mensaje('Hemos recuperado los datos de tu clínica que guardaste en este navegador.');
    avisarCambio();
  }

  casilla.addEventListener('change', () => {
    if (casilla.checked) {
      if (guardar()) {
        olvidar.hidden = false;
        if (porId('recordar-mensaje').hidden) mensaje('Los datos de tu clínica se recordarán en este navegador.');
      } else {
        casilla.checked = false;
        mensaje('Este navegador no permite guardar datos (quizá estás en una ventana privada).');
      }
    } else {
      borrar();
      olvidar.hidden = true;
      mensaje('Ya no se recuerdan los datos de tu clínica en este navegador.');
    }
  });

  olvidar.addEventListener('click', () => {
    borrar();
    casilla.checked = false;
    olvidar.hidden = true;
    mensaje('Hemos borrado los datos de tu clínica de este navegador. Lo que ves en el formulario se borrará al cerrar la página.');
    casilla.focus();
  });

  // Mientras la casilla esté marcada, cada cambio de la clínica se guarda al momento.
  alCambiar(() => {
    if (casilla.checked) guardar();
  });
}
