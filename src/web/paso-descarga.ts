// Paso 4 · La descarga: comprueba los datos obligatorios, fabrica los dos documentos en Word o
// en PDF con los mismos generadores que `npm run muestras` y los mete en un ZIP con el LEEME.txt.
//
// El PDF (T10) necesita la librería pdfmake y las fuentes (unos 3 MB). No se cargan al abrir la
// web, sino la primera vez que se pulsa "Descargar en PDF": quien solo quiera el Word no lo nota.
// Se cargan de la propia web, nunca de fuera (D11).

import JSZip from 'jszip';
import { elegirApartados, listarApartados } from '../contenido/bloques.ts';
import { rellenarCampos } from '../contenido/campos.ts';
import { ErrorContenido, leerContenido } from '../contenido/lector.ts';
import type { DatosPaciente, Documento } from '../contenido/tipos.ts';
import { ErrorGenerador, generarWord } from '../generador/generador.ts';
import type { FabricaPdf, PdfMake } from '../generador-pdf/fuentes.ts';
import type { generarPdf as GenerarPdf } from '../generador-pdf/generador-pdf.ts';
import { archivo, NOMBRE_DOCUMENTO, TEXTOS, type TipoDocumento } from './contenidos.ts';
import { crear, porId } from './dom.ts';
import { estado, estructura } from './estado.ts';
import { textoLeeme } from './leeme.ts';
import { OBLIGATORIOS } from './paso-clinica.ts';
import { datosPacienteUsables } from './paso-paciente.ts';

/** Formato de la descarga. */
type Formato = 'word' | 'pdf';

/** Nombre y descripción de cada documento dentro del ZIP (la extensión depende del formato). */
const ARCHIVOS: Record<TipoDocumento, { nombre: string; descripcion: string }> = {
  consentimiento: {
    nombre: 'consentimiento-anestesia',
    descripcion: 'consentimiento informado de anestesia y sedación (se firma en la clínica).',
  },
  informacion: {
    nombre: 'informacion-anestesia',
    descripcion: 'información sobre la anestesia y la sedación, para entregar al cliente.',
  },
};

const EXTENSION: Record<Formato, string> = { word: '.docx', pdf: '.pdf' };

export function iniciarPasoDescarga(): void {
  const botones: [HTMLButtonElement, Formato][] = [
    [porId<HTMLButtonElement>('descargar-word'), 'word'],
    [porId<HTMLButtonElement>('descargar-pdf'), 'pdf'],
  ];
  for (const [boton, formato] of botones) {
    boton.addEventListener('click', async () => {
      if (!comprobarObligatorios()) return;
      // Mientras se prepara una descarga, los dos botones esperan.
      for (const [b] of botones) b.disabled = true;
      boton.setAttribute('aria-busy', 'true');
      estadoDescarga(
        formato === 'pdf' && !pdfCargado
          ? 'Preparando los PDF… La primera vez tarda unos segundos más.'
          : 'Preparando los documentos…',
      );
      try {
        const zip = await fabricarZip(formato);
        descargar(zip, nombreZip(formato));
        estadoDescarga('¡Listo! Busca el archivo ZIP en tu carpeta de descargas.', 'ok');
      } catch (e) {
        const detalle = e instanceof ErrorContenido || e instanceof ErrorGenerador ? e.message : String(e);
        estadoDescarga(
          `No se han podido preparar los documentos. Es un fallo de la herramienta, no de tus datos. Detalle: ${detalle}`,
          'error',
        );
        console.error(e);
      } finally {
        for (const [b] of botones) b.disabled = false;
        boton.removeAttribute('aria-busy');
      }
    });
  }
}

function estadoDescarga(texto: string, clase: 'ok' | 'error' | '' = ''): void {
  const p = porId('descarga-estado');
  p.textContent = texto;
  p.hidden = false;
  p.className = `mensaje${clase ? ` mensaje--${clase}` : ''}`;
}

/** Comprueba los obligatorios y los correos. Si falta algo, lo dice y lleva al primer campo. */
function comprobarObligatorios(): boolean {
  const errores: { id: string; texto: string }[] = [];
  for (const [campo, nombre] of Object.entries(OBLIGATORIOS)) {
    const input = porId<HTMLInputElement>(campo);
    if (input.value.trim() === '') {
      errores.push({ id: campo, texto: `Falta «${nombre}».` });
      input.setAttribute('aria-invalid', 'true');
    }
  }
  for (const [campo, nombre] of [
    ['email', 'Correo de contacto'],
    ['emailPrivacidad', 'Correo de protección de datos'],
  ]) {
    const input = porId<HTMLInputElement>(campo);
    if (input.value.trim() !== '' && input.validity.typeMismatch) {
      errores.push({ id: campo, texto: `«${nombre}» no parece un correo (debe ser como nombre@clinica.es).` });
      input.setAttribute('aria-invalid', 'true');
    }
  }

  const caja = porId('descarga-errores');
  porId('descarga-estado').hidden = true;
  if (errores.length === 0) {
    caja.replaceChildren();
    caja.className = '';
    return true;
  }
  caja.className = 'resumen-errores';
  caja.replaceChildren(
    crear('h3', {}, errores.length === 1 ? 'Falta un dato de la clínica' : 'Faltan datos de la clínica'),
    crear(
      'ul',
      {},
      ...errores.map((e) => {
        const a = crear('a', { href: `#${e.id}` }, e.texto);
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          porId(e.id).focus();
        });
        return crear('li', {}, a);
      }),
    ),
  );
  caja.focus();
  return false;
}

/**
 * Prepara un documento con los datos de la clínica, los del paciente y los apartados elegidos.
 * Lo usan la descarga y la vista previa (vista-previa.ts), para que las dos muestren lo mismo.
 */
export function prepararDocumento(tipo: TipoDocumento, paciente: DatosPaciente = datosPacienteUsables()): Documento {
  let doc: Documento = leerContenido(TEXTOS[tipo][estado.variante], estado.clinica, archivo(tipo, estado.variante));
  // Los datos del paciente se ponen antes de quitar apartados (D72).
  if (tipo === 'consentimiento' && Object.keys(paciente).length > 0) doc = rellenarCampos(doc, paciente).documento;
  return elegirApartados(doc, estado.quitados[tipo]).documento;
}

// --- PDF: se carga la primera vez que hace falta ---

/** Ya se han cargado pdfmake y las fuentes (para avisar de que la primera vez tarda más). */
let pdfCargado = false;
let cargaPdf: Promise<{ fabrica: FabricaPdf; generarPdf: typeof GenerarPdf }> | null = null;

/** Carga pdfmake (su versión para el navegador), las fuentes y el generador de PDF. */
function cargarPdf(): Promise<{ fabrica: FabricaPdf; generarPdf: typeof GenerarPdf }> {
  cargaPdf ??= (async () => {
    const [modulo, { prepararPdfMake }, { generarPdf }] = await Promise.all([
      import('pdfmake/build/pdfmake.js'),
      import('../generador-pdf/fuentes.ts'),
      import('../generador-pdf/generador-pdf.ts'),
    ]);
    // pdfmake es un módulo "antiguo": según cómo se empaquete, llega dentro de `default` o tal cual.
    const pdfMake = ((modulo as { default?: unknown }).default ?? modulo) as PdfMake;
    const fabrica = await prepararPdfMake(pdfMake, async (archivo) => {
      const respuesta = await fetch(archivo);
      if (!respuesta.ok) throw new Error(`No se ha podido cargar la fuente ${archivo.pathname} (${respuesta.status}).`);
      return new Uint8Array(await respuesta.arrayBuffer());
    });
    pdfCargado = true;
    return { fabrica, generarPdf };
  })();
  // Si falla (por ejemplo, porque se ha cortado la conexión), se puede volver a intentar.
  cargaPdf.catch(() => (cargaPdf = null));
  return cargaPdf;
}

/** Fabrica un documento en el formato elegido. */
async function fabricar(tipo: TipoDocumento, paciente: DatosPaciente, formato: Formato): Promise<Uint8Array> {
  const doc = prepararDocumento(tipo, paciente);
  const opciones = { datos: estado.clinica, color: estado.color, logo: estado.logo };
  if (formato === 'word') return generarWord(doc, opciones);
  const { fabrica, generarPdf } = await cargarPdf();
  return generarPdf(doc, opciones, fabrica);
}

async function fabricarZip(formato: Formato): Promise<Blob> {
  const paciente = datosPacienteUsables();
  const tipos: TipoDocumento[] = ['consentimiento', 'informacion'];
  const archivos = tipos.map((t) => ({ ...ARCHIVOS[t], nombre: ARCHIVOS[t].nombre + EXTENSION[formato] }));
  const zip = new JSZip();
  for (const [i, tipo] of tipos.entries()) zip.file(archivos[i].nombre, await fabricar(tipo, paciente, formato));
  zip.file(
    'LEEME.txt',
    textoLeeme({
      formato,
      nombreClinica: estado.clinica.nombreClinica,
      variante: estado.variante,
      archivos,
      quitados: tipos.map((t) => ({
        documento: NOMBRE_DOCUMENTO[t],
        apartados: listarApartados(estructura(t))
          .filter((a) => estado.quitados[t].includes(a.numero))
          .map((a) => `${a.numero}. ${a.titulo}`),
      })),
      conPaciente: Object.keys(paciente).length > 0,
      fecha: new Date(),
    }),
  );
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

/**
 * "Clínica Veterinaria Ejemplo" → "kit-anestesia-clinica-veterinaria-ejemplo.zip" (Word) o
 * "kit-anestesia-clinica-veterinaria-ejemplo-pdf.zip" (PDF).
 */
function nombreZip(formato: Formato): string {
  const fin = formato === 'pdf' ? '-pdf.zip' : '.zip';
  const base = estado.clinica.nombreClinica
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base ? `kit-anestesia-${base}${fin}` : `kit-anestesia${fin}`;
}

function descargar(datos: Blob, nombre: string): void {
  const url = URL.createObjectURL(datos);
  const a = crear('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  // Se libera un poco después, para que el navegador tenga tiempo de empezar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
