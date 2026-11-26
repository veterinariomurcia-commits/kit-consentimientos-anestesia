// Comprueba los textos de contenido/ con el lector y muestra sus bloques.
//
// Uso:
//   npm run contenido                          → los 4 documentos
//   npm run contenido -- consentimiento-neutra → solo uno
//
// Cada documento se lee dos veces:
//   1. Con los datos de la "Clínica Veterinaria Ejemplo": se muestra la lista completa de bloques.
//   2. Con todos los datos vacíos: se muestran los huecos que saldrían en amarillo.
// Si algún texto tiene un problema, se explica con su número de línea y el script termina con error.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ErrorContenido, leerContenido } from '../src/contenido/lector.ts';
import type { Bloque, DatosClinica, Linea, Tramo } from '../src/contenido/tipos.ts';
import { DATOS_VACIOS } from '../src/contenido/variables.ts';

const CLINICA_EJEMPLO: DatosClinica = {
  nombreClinica: 'Clínica Veterinaria Ejemplo',
  razonSocial: 'Ejemplo Veterinaria S.L.',
  cif: 'B00000000',
  direccion: 'Calle Ejemplo 1, 00000 Ciudad Ejemplo',
  localidad: 'Ciudad Ejemplo',
  telefonos: '900 000 000 · WhatsApp 600 000 000',
  email: 'hola@clinica-ejemplo.es',
  emailPrivacidad: '',
  web: 'www.clinica-ejemplo.es',
};

const carpeta = fileURLToPath(new URL('../contenido/', import.meta.url));
const filtro = process.argv[2];
const archivos = readdirSync(carpeta)
  .filter((a) => a.endsWith('.md'))
  .filter((a) => !filtro || a.replace(/\.md$/, '') === filtro.replace(/\.md$/, ''))
  .sort();

if (archivos.length === 0) {
  console.error(`No hay ningún archivo en contenido/ que se llame "${filtro}".`);
  process.exit(1);
}

// --- Cómo se escribe cada pieza en pantalla ---

function tramoATexto(t: Tramo): string {
  switch (t.tipo) {
    case 'texto':
      return t.negrita ? `**${t.texto}**` : t.cursiva ? `*${t.texto}*` : t.texto;
    case 'dato':
      return t.vacio ? `«${t.texto}»` : `‹${t.texto}›`;
    case 'casilla':
      return '☐';
    case 'linea':
      return '[____________]';
    case 'linea-corta':
      return '[____]';
    case 'caja':
      return '[CAJA 3 líneas]';
    case 'caja-grande':
      return '[CAJA 5 líneas]';
    case 'firma':
      return `[FIRMA: ${t.texto}]`;
  }
}

const lineaATexto = (l: Linea) => l.map(tramoATexto).join('');
const recortar = (s: string, max = 90) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function mostrarBloques(bloques: Bloque[], sangria: string): void {
  for (const b of bloques) {
    switch (b.tipo) {
      case 'titulo1':
        console.log(`${sangria}TÍTULO 1      ${lineaATexto(b.contenido)}`);
        break;
      case 'titulo2':
        console.log(`${sangria}TÍTULO 2      ${lineaATexto(b.contenido)}`);
        break;
      case 'parrafo':
        console.log(`${sangria}párrafo       ${recortar(lineaATexto(b.contenido))}`);
        break;
      case 'lista':
        console.log(`${sangria}lista ${b.numerada ? 'numerada' : 'viñetas '} (${b.elementos.length} elementos)`);
        b.elementos.forEach((e, i) =>
          console.log(`${sangria}   ${b.numerada ? `${i + 1}.` : '•'} ${recortar(lineaATexto(e), 80)}`),
        );
        break;
      case 'tabla-datos':
        console.log(`${sangria}tabla-datos   (${b.filas.length} filas)`);
        for (const f of b.filas) {
          console.log(`${sangria}   ${recortar(`${lineaATexto(f.etiqueta)}  │  ${lineaATexto(f.contenido)}`, 100)}`);
        }
        break;
      case 'tabla':
        console.log(
          `${sangria}tabla         (${b.cabecera.length} columnas × ${b.filas.length} filas` +
            `${b.primeraColumnaEtiquetas ? ', primera columna en negrita' : ''})`,
        );
        console.log(`${sangria}   cabecera: ${b.cabecera.map(lineaATexto).join(' │ ')}`);
        for (const f of b.filas) console.log(`${sangria}   ${recortar(f.map(lineaATexto).join(' │ '), 100)}`);
        break;
      case 'salto-de-pagina':
        console.log(`${sangria}─── salto de página ───`);
        break;
      default:
        console.log(`${sangria}recuadro ${b.tipo}`);
        mostrarBloques(b.bloques, `${sangria}   `);
    }
  }
}

function buscarHuecos(bloques: Bloque[]): string[] {
  const huecos: string[] = [];
  const enLinea = (l: Linea) => l.forEach((t) => t.tipo === 'dato' && t.vacio && huecos.push(t.texto));
  for (const b of bloques) {
    if ('contenido' in b) enLinea(b.contenido);
    if (b.tipo === 'lista') b.elementos.forEach(enLinea);
    if (b.tipo === 'tabla-datos') b.filas.forEach((f) => (enLinea(f.etiqueta), enLinea(f.contenido)));
    if (b.tipo === 'tabla') [b.cabecera, ...b.filas].forEach((f) => f.forEach(enLinea));
    if ('bloques' in b) huecos.push(...buscarHuecos(b.bloques));
  }
  return huecos;
}

// --- Lectura de los documentos ---

let hayErrores = false;
console.log('Leyenda: ‹dato de la clínica›   «hueco vacío, saldrá en amarillo»   ☐ casilla\n');

for (const archivo of archivos) {
  const texto = readFileSync(`${carpeta}${archivo}`, 'utf8');
  console.log('═'.repeat(100));
  console.log(`${archivo}`);
  console.log('═'.repeat(100));
  try {
    const doc = leerContenido(texto, CLINICA_EJEMPLO, archivo);
    const c = doc.cabecera;
    console.log(`Documento: ${c.documento} · Variante: ${c.variante}`);
    console.log(`Título:    ${c.titulo}`);
    console.log(`Subtítulo: ${c.subtitulo}`);
    console.log(`Pie:       ${c.pie} · Iniciales en el pie: ${c.inicialesEnPie ?? 'no'}`);
    console.log('');
    mostrarBloques(doc.bloques, '  ');

    const vacio = leerContenido(texto, DATOS_VACIOS, archivo);
    const huecos = buscarHuecos(vacio.bloques);
    console.log('');
    console.log(`Con todos los datos vacíos salen ${huecos.length} hueco(s) amarillo(s): ${huecos.join(', ') || '—'}`);
    console.log(`✔ ${archivo}: ${doc.bloques.length} bloques leídos sin errores.\n`);
  } catch (e) {
    hayErrores = true;
    if (e instanceof ErrorContenido) console.error(`✘ ${e.message}\n`);
    else throw e;
  }
}

if (hayErrores) {
  console.error('Hay problemas en el contenido. Revisa los mensajes de arriba.');
  process.exit(1);
}
console.log(`Todo correcto: ${archivos.length} documento(s) leídos sin errores.`);
