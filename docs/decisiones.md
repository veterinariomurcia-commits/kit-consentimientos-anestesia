# Registro de decisiones — Kit de consentimientos de anestesia

Aquí se anota **qué** se decidió y **por qué**. Claude Code añade las nuevas decisiones al final.

## Decisiones tomadas en la planificación (26/11/2026)

**D1 · Mini herramienta web, no solo plantillas sueltas.**
Por qué: la clínica personaliza sus datos, su logo y su color sin tocar el diseño, y obtiene un Word limpio. Da una imagen más profesional y evita que alguien rompa el formato desde el principio.

**D2 · Todo se genera en el navegador, sin servidor ni base de datos.**
Por qué: no hay nada que mantener ni que se pueda caer, no hay costes y no se guardan datos de otras clínicas, así que no hay obligaciones de protección de datos para Sira.

**D3 · Alojamiento en GitHub Pages.**
Por qué: es gratis, Sira ya tiene GitHub y la publicación es automática. El VPS de la clínica queda solo para los sistemas de la clínica. Implica que el repositorio es público; no contiene nada privado (los PDFs con los datos de la clínica de Sira están en `referencia/`, que no se sube).

**D4 · Solo se genera Word (.docx); el PDF lo saca cada clínica desde Word.**
Por qué: generar también el PDF en el navegador duplica el trabajo de diseño. Se puede añadir en una versión futura.

**D5 · Dos versiones de lenguaje (neutra y cálida), escritas como textos separados.**
Por qué: la diferencia no es solo de vocabulario ("peludo" frente a "paciente"), sino también de tratamiento (tú frente a usted), y eso cambia casi cada frase. Dos textos completos son más fáciles de revisar y corregir que un texto lleno de marcas. Contrapartida: un cambio en el contenido común hay que hacerlo en los dos archivos de cada documento.

**D6 · Todo el documento es libremente editable (sin zonas bloqueadas).**
Por qué: cada clínica puede adaptar el texto a sus protocolos. El texto de Sira sirve como modelo para quien lo quiera usar tal cual.

**D7 · Sin firma ni "cortesía de" en el pie.** Solo "Modelo v1.0", para saber qué versión tiene cada clínica.

**D8 · Datos vacíos = hueco amarillo entre corchetes.** Así la clínica ve qué le falta por rellenar.

**D9 · Casillas con el carácter ☐ y huecos con borde inferior, sin controles de contenido de Word.**
Por qué: los controles de contenido se rompen o desaparecen en Google Docs y LibreOffice.

**D10 · Fuente Arial.** Por qué: existe en todos los sistemas, y LibreOffice la sustituye por una fuente que mide exactamente lo mismo.

**D11 · Sin cookies, sin analítica y sin recursos externos.** Por qué: no hace falta aviso de cookies, la web no depende de terceros y funcionará durante años sin cambios.

## Contenido: cambios respecto a los documentos de la clínica

- Los datos de Clínica Veterinaria Murcia Norte se han sustituido por variables (nombre, dirección, teléfonos, email, CIF y localidad de las firmas).
- La versión de los documentos pasa a ser "Modelo v1.0".
- La **versión neutra** es el texto original revisado por el equipo (usted).
- La **versión cálida** es nueva: tú, "peludo" y "peque", y "tutor/a" en lugar de "titular". El contenido clínico y legal es el mismo.

## Pendiente de decidir

- [ ] **Licencia** de uso (por ejemplo, Creative Commons que permita usar y adaptar, pero no vender). Ojo: las licencias que exigen citar la autoría chocan con la decisión D7 de no poner "cortesía de" en el pie.
- [ ] **Revisión de la versión cálida** por el equipo veterinario, sobre todo "tutor/a" en lugar de "titular" en las partes legales.
- [ ] **Revisión legal** del texto genérico antes de compartirlo (asesoría o proveedor de protección de datos).
- [ ] **Color por defecto** de la herramienta.
- [ ] **Nombre y dirección de la web** (por ejemplo, un subdominio propio o la dirección de GitHub).
- [ ] **Firma digital online** (Autografus u otras plataformas): los Word ya se pueden convertir a PDF y subir a esas plataformas. Falta decidir si se añade al `LEEME.txt` una guía breve (rellenar casillas y huecos en Word antes de pasar a PDF) y si conviene dejar más espacio en los recuadros de firma.
- [ ] **Guardar los consentimientos firmados**: propuesta de NO hacerlo en la herramienta (ver la conversación de T1). Lo guarda cada clínica en su plataforma de firma, su programa de gestión o su nube.

## Decisiones de la tarea T1 (26/11/2026)

**D12 · Piezas instaladas con versión exacta.** `docx` 9.16.1, `jszip` 3.10.2 y `marked` 18.3.0 para la web; `vite` 8.4.0, `typescript` 7.0.2 y `@types/node` 26.6.11 solo para el taller.
Por qué: con versiones fijas, dentro de unos años `npm install` instala exactamente lo mismo y nada cambia sin que lo decidamos. `@types/node` es la "chuleta" que permite al corrector de TypeScript entender los scripts de Node; no va dentro de la web.

**D13 · Los scripts de Node se ejecutan sin herramientas extra.**
Por qué: Node 24 ya sabe ejecutar archivos TypeScript directamente. Condición: los `import` entre archivos deben llevar la extensión `.ts`, y no se usan las funciones de TypeScript que Node no admite (lo vigila la opción `erasableSyntaxOnly`).

**D14 · `marked` se instala ya, pero su uso se confirma en T2.**
Por qué: el formato de `contenido/` tiene muchas marcas propias (`:::`, `[linea]`, `::`). Si en T2 resulta más sencillo un lector propio, se desinstala.

**D15 · Logo de ejemplo fabricado por un script propio.** `scripts/crear-logo-ejemplo.ts` dibuja `marca/logo-ejemplo.png` (400 × 400 px): una huella blanca en un círculo gris azulado (#4A6378), con fondo transparente y sin texto.
Por qué: así no depende de ningún programa ni de ninguna imagen con derechos, y se puede volver a fabricar con `npm run logo-ejemplo`. El logo apaisado para la prueba de estrés se crea en T5.

**D16 · Git firma con la identidad que ya hay en el PC de Sira.**
Por qué: Sira acepta que su correo sea visible cuando el repositorio sea público. No hace falta el correo "tapadera" de GitHub.

**D17 · Word sirve para convertir a PDF; LibreOffice sigue haciendo falta.**
Word, que ya está instalado, puede convertir las muestras a PDF en las revisiones. LibreOffice se necesita en T5 y T7 porque muchas clínicas lo usan y hay que comprobar que el documento no se descuadra en él.
