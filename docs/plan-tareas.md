# Plan de tareas — Kit de consentimientos de anestesia

Una tarea por sesión de Claude Code. Marca cada una con [x] al terminarla.

## T0 · Preparación (la hace Sira, sin Claude Code) [ ]
- Instalar **Node.js LTS** (nodejs.org) si no lo tienes ya. Para comprobarlo, escribe `node -v` en la terminal de VS Code.
- Instalar **Git** (git-scm.com) si no lo tienes ya. Para comprobarlo, escribe `git --version`.
- Instalar **LibreOffice** (libreoffice.org, gratis).
- Crear la carpeta `C:\Proyectos\kit-consentimientos-anestesia` y copiar dentro el contenido del ZIP.
- Copiar los dos PDFs originales en `referencia/`.
- Abrir la carpeta en VS Code (Archivo → Abrir carpeta).

## T1 · Esqueleto del proyecto [x]
Crear el proyecto Vite + TypeScript, instalar `docx`, `jszip` y `marked`, preparar `.gitignore` y los scripts `dev`, `build` y `muestras`, y crear un logo de ejemplo neutro en `marca/`. Iniciar Git y hacer el primer commit.
**Comprobación:** `npm run dev` abre una página en blanco con el título del kit.

## T2 · Lector de contenido [ ]
Leer los 4 archivos de `contenido/` (cabecera + bloques `:::` + elementos `[ ]`, `[linea]`, `{{VARIABLE}}`…) y convertirlos en una estructura intermedia que el generador pueda recorrer. Sustituir las variables (o dejar el hueco amarillo si están vacías).
**Comprobación:** un script muestra por pantalla la lista de bloques de cada documento sin errores.

## T3 · Generador Word: base [ ]
Estilos (Normal, Título 1 y 2, listas), página A4 y márgenes, cabecera con logo y datos, pie con versión e iniciales y "Página X de Y", títulos, párrafos, listas, tablas normales y recuadros destacados y notas.
**Comprobación:** `npm run muestras` genera el documento informativo (versión neutra) y se abre bien en Word.

## T4 · Generador Word: elementos de formulario [ ]
Tabla de datos, casillas ☐, huecos de línea, cajas, recuadros de firma, tabla de pruebas, tabla de firmas y recuadro de revocación.
**Comprobación:** las 4 muestras + la muestra con datos vacíos se generan sin errores.

## T5 · Revisión visual frente a la referencia [ ]
Convertir las muestras a PDF con LibreOffice, compararlas página a página con `referencia/` y corregir diferencias de diseño. Hacer la prueba de estrés (nombre largo y logo apaisado).
**Comprobación:** Sira revisa los PDF de muestra y da el visto bueno.

## T6 · Interfaz web [ ]
Formulario, carga y vista previa del logo, selector de color, elección de versión, botón de descarga (ZIP con los 2 Word + LEEME.txt), aviso legal e instrucción para el PDF. Diseño sencillo, profesional y adaptado a móvil.
**Comprobación:** con `npm run dev`, Sira rellena el formulario y descarga un ZIP que se abre bien.

## T7 · Pruebas de compatibilidad [ ]
Abrir los Word descargados en Word, LibreOffice y Google Docs. En cada uno, cambiar un dato, alargar un texto y sustituir el logo. Guardar capturas en `pruebas/` y corregir lo que se descuadre.
**Comprobación:** se ve bien en los tres programas, o los problemas quedan anotados y aceptados en `decisiones.md`.

## T8 · Publicación en GitHub Pages [ ]
Crear el repositorio en GitHub (público, para que Pages sea gratis), configurar la GitHub Action de despliegue y publicar.
**Comprobación:** la web funciona en su dirección pública desde el móvil y desde otro ordenador.

## T9 · Prueba con usuarios (otro día) [ ]
Dos personas del equipo, o un compañero de otra clínica, la prueban con sus datos y su logo. Recoger sus comentarios y corregir. Revisión del texto genérico por la asesoría antes de compartirlo en VetFamily.
