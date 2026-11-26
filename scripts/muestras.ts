// Genera los documentos Word de muestra en la carpeta salida/.
// Uso: npm run muestras
//
// De momento solo prepara la carpeta: el generador de Word llega en la tarea T3.

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const carpetaSalida = fileURLToPath(new URL('../salida/', import.meta.url));

mkdirSync(carpetaSalida, { recursive: true });

console.log(`Carpeta de muestras lista: ${carpetaSalida}`);
console.log('Todavía no se genera ningún documento: el generador de Word llega en la tarea T3.');
