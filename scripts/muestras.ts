// Genera los documentos Word de muestra en la carpeta salida/.
// Uso: npm run muestras
//
// Usa el mismo generador que la web (src/generador/), con la "Clínica Veterinaria Ejemplo",
// el logo de marca/ y el color provisional de las muestras.
//
// Tarea T3: solo el documento informativo (neutra y cálida) y una muestra con todos los datos
// vacíos y sin logo, para ver los huecos amarillos. El consentimiento se añade en la tarea T4,
// cuando el generador sepa dibujar las casillas, los huecos y las firmas.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

interface Muestra {
  /** Archivo de contenido/ (sin .md). */
  contenido: string;
  /** Nombre del Word que se guarda en salida/. */
  salida: string;
  datos: DatosClinica;
  logo: Logo | null;
}

const MUESTRAS: Muestra[] = [
  { contenido: 'informacion-neutra', salida: 'informacion-neutra.docx', datos: CLINICA_EJEMPLO, logo: logoEjemplo },
  { contenido: 'informacion-calida', salida: 'informacion-calida.docx', datos: CLINICA_EJEMPLO, logo: logoEjemplo },
  { contenido: 'informacion-neutra', salida: 'informacion-neutra-datos-vacios.docx', datos: DATOS_VACIOS, logo: null },
];

let hayErrores = false;
for (const m of MUESTRAS) {
  const archivo = `${m.contenido}.md`;
  try {
    const texto = readFileSync(new URL(`contenido/${archivo}`, raiz), 'utf8');
    const documento = leerContenido(texto, m.datos, archivo);
    const bytes = await generarWord(documento, { datos: m.datos, color: COLOR_POR_DEFECTO, logo: m.logo });
    writeFileSync(`${carpetaSalida}${m.salida}`, bytes);
    console.log(`✔ salida/${m.salida}  (${Math.round(bytes.length / 1024)} KB)`);
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
