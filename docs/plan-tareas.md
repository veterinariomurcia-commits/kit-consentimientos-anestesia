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

## T2 · Lector de contenido [x]
Leer los 4 archivos de `contenido/` (cabecera + bloques `:::` + elementos `[ ]`, `[linea]`, `{{VARIABLE}}`…) y convertirlos en una estructura intermedia que el generador pueda recorrer. Sustituir las variables (o dejar el hueco amarillo si están vacías).
**Comprobación:** un script muestra por pantalla la lista de bloques de cada documento sin errores. → `npm run contenido`

## T3 · Generador Word: base [x]
Estilos (Normal, Título 1 y 2, listas), página A4 y márgenes, cabecera con logo y datos, pie con versión e iniciales y "Página X de Y", títulos, párrafos, listas, tablas normales y recuadros destacados y notas.
**Comprobación:** `npm run muestras` genera el documento informativo (versión neutra) y se abre bien en Word. → También genera la versión cálida y una muestra con los datos vacíos.

## T4 · Generador Word: elementos de formulario [x]
Tabla de datos, casillas ☐, huecos de línea, cajas, recuadros de firma, tabla de pruebas, tabla de firmas y recuadro de revocación.
**Comprobación:** las 4 muestras + la muestra con datos vacíos se generan sin errores. → `npm run muestras` genera 6 Word (también el consentimiento con los datos vacíos).

## T5 · Revisión visual frente a la referencia [x]
Convertir las muestras a PDF con LibreOffice, compararlas página a página con `referencia/` y corregir diferencias de diseño. Hacer la prueba de estrés (nombre largo y logo apaisado).
**Comprobación:** Sira revisa los PDF de muestra y da el visto bueno. → Visto bueno de Sira el 26/11/2026: 3 y 6 páginas, como la referencia.

> **Plan rehecho el 26/11/2026** (durante la T5), tras aclarar la idea de Sira: elegir bloques, datos del paciente opcionales, vista previa y descarga en Word o PDF (D57–D61). Las antiguas T6–T9 pasan a ser T8 y T11–T13.

## T6 · Bloques elegibles [ ]
Cada apartado (`## …`) de `contenido/` es un bloque que se puede quitar. El generador recibe la lista de bloques elegidos, se salta los demás y renumera los apartados. Las referencias a otros apartados ("ver apartado 3") pasan a ser marcas que el generador rellena con el número correcto (D58; solo cambia el número, no el texto). Si se quita un apartado al que otro hace referencia, el generador lo avisa (la web lo mostrará en la T8).
**Comprobación:** `npm run muestras` genera además una muestra con varios bloques quitados; los números y las referencias salen bien, y la firma sigue con su texto.

## T7 · Datos del paciente (opcionales) [ ]
Dar un nombre a cada hueco y casilla del consentimiento (titular, DNI, paciente, especie, peso, tipo de anestesia…). Si el campo tiene valor, el Word lleva el dato (y la casilla marcada ☒); si no, sale el hueco como ahora. Los datos del paciente no se guardan en ningún sitio (D60).
**Comprobación:** `npm run muestras` genera además un consentimiento con datos de un paciente ficticio, y se ve bien junto al de los huecos en blanco.

## T8 · Interfaz web [ ]
Página en pasos: 1) la clínica (datos obligatorios, logo, color y versión; teléfonos con el WhatsApp opcional, D24), 2) los bloques, 3) el paciente (opcional), 4) la descarga en Word (ZIP con los 2 documentos y `LEEME.txt`). Aviso legal. Diseño sencillo, profesional, accesible y adaptado a móvil.
**Comprobación:** con `npm run dev`, Sira hace los cuatro pasos y descarga un ZIP que se abre bien.

## T9 · Vista previa [ ]
Vista previa del documento en la propia página, antes de descargar. Es aproximada: un navegador no puede mostrar el Word exactamente como Word.
**Comprobación:** al cambiar un dato, un bloque o el color, la vista previa cambia.

## T10 · Descarga en PDF [ ]
Elegir una librería gratuita que dibuje el PDF en el navegador (proponer pros y contras a Sira antes de instalarla) y hacer que siga las reglas de diseño del Word. Embeber una fuente libre que mida como Arial (por ejemplo, Liberation Sans o Arimo), porque Arial no se puede incluir por su licencia. Botón "Descargar en PDF".
**Comprobación:** los PDF de muestra tienen las mismas páginas que los Word y se parecen a la referencia.

## T11 · Pruebas de compatibilidad [ ]
Abrir los Word descargados en Word, LibreOffice y Google Docs. En cada uno, cambiar un dato, alargar un texto y sustituir el logo. Comprobar que las firmas siguen con su texto (D56). Abrir los PDF en el móvil y en el ordenador. Guardar capturas en `pruebas/` y corregir lo que se descuadre.
**Comprobación:** se ve bien en los tres programas, o los problemas quedan anotados y aceptados en `decisiones.md`.

## T12 · Publicación en GitHub Pages [ ]
Crear el repositorio en GitHub (público, para que Pages sea gratis), configurar la GitHub Action de despliegue y publicar.
**Comprobación:** la web funciona en su dirección pública desde el móvil y desde otro ordenador.

## T13 · Prueba con usuarios (otro día) [ ]
Dos personas del equipo, o un compañero de otra clínica, la prueban con sus datos y su logo. Recoger sus comentarios y corregir. Revisión del texto genérico por la asesoría antes de compartirlo en VetFamily.
