// Paso 4 · La descarga: comprueba los datos obligatorios, fabrica los dos Word con el mismo
// generador que `npm run muestras` y los mete en un ZIP con el LEEME.txt.

import JSZip from 'jszip';
import { elegirApartados, listarApartados } from '../contenido/bloques.ts';
import { rellenarCampos } from '../contenido/campos.ts';
import { ErrorContenido, leerContenido } from '../contenido/lector.ts';
import type { DatosPaciente, Documento } from '../contenido/tipos.ts';
import { ErrorGenerador, generarWord } from '../generador/generador.ts';
import { archivo, NOMBRE_DOCUMENTO, TEXTOS, type TipoDocumento } from './contenidos.ts';
import { crear, porId } from './dom.ts';
import { estado, estructura } from './estado.ts';
import { textoLeeme } from './leeme.ts';
import { OBLIGATORIOS } from './paso-clinica.ts';
import { datosPacienteUsables } from './paso-paciente.ts';

const ARCHIVOS: Record<TipoDocumento, { nombre: string; descripcion: string }> = {
  consentimiento: {
    nombre: 'consentimiento-anestesia.docx',
    descripcion: 'consentimiento informado de anestesia y sedación (se firma en la clínica).',
  },
  informacion: {
    nombre: 'informacion-anestesia.docx',
    descripcion: 'información sobre la anestesia y la sedación, para entregar al cliente.',
  },
};

export function iniciarPasoDescarga(): void {
  const boton = porId<HTMLButtonElement>('descargar-word');
  boton.addEventListener('click', async () => {
    if (!comprobarObligatorios()) return;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    estadoDescarga('Preparando los documentos…');
    try {
      const zip = await fabricarZip();
      descargar(zip, nombreZip());
      estadoDescarga('¡Listo! Busca el archivo ZIP en tu carpeta de descargas.', 'ok');
    } catch (e) {
      const detalle = e instanceof ErrorContenido || e instanceof ErrorGenerador ? e.message : String(e);
      estadoDescarga(
        `No se han podido preparar los documentos. Es un fallo de la herramienta, no de tus datos. Detalle: ${detalle}`,
        'error',
      );
      console.error(e);
    } finally {
      boton.disabled = false;
      boton.removeAttribute('aria-busy');
    }
  });
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

/** Fabrica un documento con los datos de la clínica, los del paciente y los apartados elegidos. */
async function fabricarWord(tipo: TipoDocumento, paciente: DatosPaciente): Promise<Uint8Array> {
  let doc: Documento = leerContenido(TEXTOS[tipo][estado.variante], estado.clinica, archivo(tipo, estado.variante));
  // Los datos del paciente se ponen antes de quitar apartados (D72).
  if (tipo === 'consentimiento' && Object.keys(paciente).length > 0) doc = rellenarCampos(doc, paciente).documento;
  doc = elegirApartados(doc, estado.quitados[tipo]).documento;
  return generarWord(doc, { datos: estado.clinica, color: estado.color, logo: estado.logo });
}

async function fabricarZip(): Promise<Blob> {
  const paciente = datosPacienteUsables();
  const tipos: TipoDocumento[] = ['consentimiento', 'informacion'];
  const zip = new JSZip();
  for (const tipo of tipos) zip.file(ARCHIVOS[tipo].nombre, await fabricarWord(tipo, paciente));
  zip.file(
    'LEEME.txt',
    textoLeeme({
      nombreClinica: estado.clinica.nombreClinica,
      variante: estado.variante,
      archivos: tipos.map((t) => ARCHIVOS[t]),
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

/** "Clínica Veterinaria Ejemplo" → "kit-anestesia-clinica-veterinaria-ejemplo.zip". */
function nombreZip(): string {
  const base = estado.clinica.nombreClinica
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base ? `kit-anestesia-${base}.zip` : 'kit-anestesia.zip';
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
