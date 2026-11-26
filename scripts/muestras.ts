// Genera los documentos Word de muestra en la carpeta salida/.
// Uso: npm run muestras
//
// Usa el mismo generador que la web (src/generador/), con la "Clínica Veterinaria Ejemplo",
// el logo de marca/ y el color provisional de las muestras.
//
// Genera los 4 documentos (2 documentos × 2 versiones) y, de cada documento, una muestra con
// todos los datos vacíos y sin logo, para ver los huecos amarillos.
//
// Prueba de estrés: los 2 documentos con un nombre y unos datos muy largos y el logo apaisado
// (marca/logo-apaisado.png), para comprobar que nada se descuadra.
//
// Bloques elegibles (T6): muestras con algunos apartados quitados. Si un apartado que se queda
// hace referencia a otro que se ha quitado, el aviso sale en pantalla con ⚠.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { elegirApartados } from '../src/contenido/bloques.ts';
import { ErrorContenido, leerContenido } from '../src/contenido/lector.ts';
import type { DatosClinica } from '../src/contenido/tipos.ts';
import { DATOS_VACIOS } from '../src/contenido/variables.ts';
import { COLOR_POR_DEFECTO } from '../src/generador/color.ts';
import { ErrorGenerador, generarWord } from '../src/generador/generador.ts';
import { detectarTipo, type Logo } from '../src/generador/imagen.ts';
import { CLINICA_EJEMPLO } from '../src/muestras/clinica-ejemplo.ts';

const raiz = new URL('../', import.meta.url);
const carpetaSalida = fileURLToPath(new URL('salida/', raiz));
mkdirSync(carpetaSalida, { recursive: true });

const datosLogo = new Uint8Array(readFileSync(new URL('marca/logo-ejemplo.png', raiz)));
const logoEjemplo: Logo = { datos: datosLogo, tipo: detectarTipo(datosLogo) };
const datosLogoApaisado = new Uint8Array(readFileSync(new URL('marca/logo-apaisado.png', raiz)));
const logoApaisado: Logo = { datos: datosLogoApaisado, tipo: detectarTipo(datosLogoApaisado) };

/** Clínica ficticia con todos los datos muy largos, para la prueba de estrés. */
const CLINICA_ESTRES: DatosClinica = {
  nombreClinica: 'Hospital Clínico Veterinario y Centro de Especialidades Médicas y Quirúrgicas San Francisco de Asís',
  razonSocial: 'Servicios Veterinarios Integrales del Mediterráneo Sociedad Limitada Profesional',
  cif: 'B00000000',
  direccion:
    'Avenida de la Constitución Española de 1978, número 145, bajo izquierda, 00000 Villanueva de la Cañada del Campo',
  localidad: 'Villanueva de la Cañada del Campo',
  telefonos: '900 000 000 · 900 000 001 · Urgencias 24 h 600 000 000 · WhatsApp 600 000 001',
  email: 'atencionalcliente@hospitalveterinariosanfrancisco-ejemplo.es',
  emailPrivacidad: 'protecciondedatos@hospitalveterinariosanfrancisco-ejemplo.es',
  web: 'www.hospitalveterinariosanfrancisco-ejemplo.es',
};

interface Muestra {
  /** Archivo de contenido/ (sin .md). */
  contenido: string;
  /** Nombre del Word que se guarda en salida/. */
  salida: string;
  datos: DatosClinica;
  logo: Logo | null;
  /** Apartados que se quitan (número original en contenido/). Si no se pone, van todos. */
  quitar?: number[];
}

const MUESTRAS: Muestra[] = [
  { contenido: 'informacion-neutra', salida: 'informacion-neutra.docx', datos: CLINICA_EJEMPLO, logo: logoEjemplo },
  { contenido: 'informacion-calida', salida: 'informacion-calida.docx', datos: CLINICA_EJEMPLO, logo: logoEjemplo },
  { contenido: 'informacion-neutra', salida: 'informacion-neutra-datos-vacios.docx', datos: DATOS_VACIOS, logo: null },
  { contenido: 'consentimiento-neutra', salida: 'consentimiento-neutra.docx', datos: CLINICA_EJEMPLO, logo: logoEjemplo },
  { contenido: 'consentimiento-calida', salida: 'consentimiento-calida.docx', datos: CLINICA_EJEMPLO, logo: logoEjemplo },
  {
    contenido: 'consentimiento-neutra',
    salida: 'consentimiento-neutra-datos-vacios.docx',
    datos: DATOS_VACIOS,
    logo: null,
  },
  { contenido: 'informacion-neutra', salida: 'informacion-neutra-estres.docx', datos: CLINICA_ESTRES, logo: logoApaisado },
  {
    contenido: 'consentimiento-neutra',
    salida: 'consentimiento-neutra-estres.docx',
    datos: CLINICA_ESTRES,
    logo: logoApaisado,
  },
  // Sin el 2 y el 3 (el apartado 1 hace referencia al 3: sale el aviso) y sin el 7 (la protección
  // de datos se queda; el apartado 8 sigue empezando en página nueva).
  {
    contenido: 'consentimiento-neutra',
    salida: 'consentimiento-neutra-bloques-quitados.docx',
    datos: CLINICA_EJEMPLO,
    logo: logoEjemplo,
    quitar: [2, 3, 7],
  },
  // Sin el 6: el 7 pasa a ser el 6 y sigue empezando en página nueva; las referencias no cambian.
  {
    contenido: 'consentimiento-calida',
    salida: 'consentimiento-calida-bloques-quitados.docx',
    datos: CLINICA_EJEMPLO,
    logo: logoEjemplo,
    quitar: [6],
  },
  {
    contenido: 'informacion-calida',
    salida: 'informacion-calida-bloques-quitados.docx',
    datos: CLINICA_EJEMPLO,
    logo: logoEjemplo,
    quitar: [2, 4],
  },
];

let hayErrores = false;
for (const m of MUESTRAS) {
  const archivo = `${m.contenido}.md`;
  try {
    const texto = readFileSync(new URL(`contenido/${archivo}`, raiz), 'utf8');
    const leido = leerContenido(texto, m.datos, archivo);
    const { documento, avisos } = elegirApartados(leido, m.quitar ?? []);
    const bytes = await generarWord(documento, { datos: m.datos, color: COLOR_POR_DEFECTO, logo: m.logo });
    writeFileSync(`${carpetaSalida}${m.salida}`, bytes);
    const n = m.quitar?.length ?? 0;
    const quitados = n === 0 ? '' : `  · sin ${n === 1 ? 'el apartado' : 'los apartados'} ${m.quitar!.join(', ')}`;
    console.log(`✔ salida/${m.salida}  (${Math.round(bytes.length / 1024)} KB)${quitados}`);
    for (const a of avisos) console.log(`   ⚠ ${a.mensaje}`);
  } catch (e) {
    hayErrores = true;
    if (e instanceof ErrorContenido || e instanceof ErrorGenerador) console.error(`✘ ${m.salida}: ${e.message}`);
    else throw e;
  }
}

if (hayErrores) {
  console.error('\nAlguna muestra no se ha podido generar. Revisa los mensajes de arriba.');
  process.exit(1);
}
console.log(`\nMuestras listas en ${carpetaSalida}`);
