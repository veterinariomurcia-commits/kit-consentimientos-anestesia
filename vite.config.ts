// Configuración de Vite (tarea T12).
//
// La web se publica en GitHub Pages dentro de una subcarpeta:
//   https://veterinariomurcia-commits.github.io/kit-consentimientos-anestesia/
// Con la ruta base relativa ('./'), cada archivo (logo, estilos, pdfmake, fuentes…) se busca
// "al lado de la página", sea cual sea la carpeta. Así la web sigue funcionando aunque cambie el
// nombre del repositorio o se use un dominio propio.

import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
