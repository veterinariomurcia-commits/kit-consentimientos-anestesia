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
- [ ] **Color por defecto** de la herramienta. (Provisional para las muestras: azul petróleo #2E6A80, ver D29.)
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

## Decisiones de la tarea T2 (26/11/2026)

**D18 · Lector propio en lugar de `marked`; `marked` desinstalado.** (Cierra la D14.)
Por qué: casi todas las marcas de `contenido/` son propias (`:::`, `::`, `[linea]`, `[firma: …]`), y del markdown normal solo usamos títulos, listas, tablas sencillas, negrita y cursiva. Un lector propio es más corto y claro que enseñarle a `marked` nuestras marcas, y es una pieza menos que mantener.

**D19 · El lector recibe el texto, no el archivo.** Está en `src/contenido/` (`tipos.ts`, `lector.ts` y `variables.ts`) y no usa nada propio de Node.
Por qué: así el mismo código sirve en la web (navegador) y en los scripts de muestras (Node), como pide CLAUDE.md. Cada lado carga el texto a su manera.

**D20 · El lector es estricto: si algo no encaja, avisa y no se lo salta.** Reúne todos los problemas con su número de línea (bloque `:::` sin cerrar o desconocido, marca o variable que no existe, negrita sin cerrar, tabla con columnas de más, cabecera incompleta, la palabra "mascota"…) y los muestra juntos.
Por qué: un error en el texto debe verse antes de publicar, no aparecer como un hueco raro en el Word de otra clínica.

**D21 · Textos de los huecos cuando falta un dato:** `[Nombre de la clínica]`, `[Razón social]`, `[CIF]`, `[Dirección]`, `[Localidad]`, `[Teléfonos]`, `[Correo electrónico]`, `[Correo de protección de datos]` y `[Web]`. Un campo con solo espacios cuenta como vacío. La razón social vacía usa el nombre comercial y el correo de privacidad vacío usa el correo general; solo si también faltan sale el hueco.
Por qué: la clínica entiende mejor "[Correo electrónico]" que el nombre técnico de la variable.

**D22 · Varias líneas seguidas forman un solo párrafo, y un `[caja]` solo en su línea es un párrafo.** El generador (T4) decide cómo dibujar ese párrafo-caja.
Por qué: es como funciona el markdown, y así el lector no tiene casos especiales.

**D23 · Comando `npm run contenido`** (`scripts/ver-contenido.ts`): lee los 4 textos con la "Clínica Veterinaria Ejemplo" y con todos los datos vacíos, y muestra sus bloques y sus huecos. Con `npm run contenido -- informacion-neutra` muestra solo uno. Los datos de la clínica de ejemplo están de momento en ese script; en T3 se pueden pasar a un archivo compartido con `npm run muestras`.
Por qué: sirve para comprobar el contenido cada vez que el equipo cambie un texto, sin generar el Word.

**D24 · En la web, el campo de teléfonos se llamará "Teléfonos de contacto" y el WhatsApp será opcional.** (Se aplica en T6.) Ejemplo en gris dentro del campo: "968 000 000 · WhatsApp 600 000 000 (el WhatsApp es opcional)".
Por qué: los textos solo usan `{{TELEFONOS}}` y ponen tal cual lo que escriba la clínica, sin mencionar WhatsApp. Si el campo se llamara "Teléfono(s) y WhatsApp", una clínica sin WhatsApp podría pensar que es obligatorio.

## Decisiones de la tarea T3 (26/11/2026)

**D25 · El generador está en `src/generador/` y no usa nada propio de Node.** `generador.ts` (montaje del documento), `estilos.ts` (estilos de Word y listas), `color.ts` (colores) e `imagen.ts` (tamaño del logo). Devuelve el Word como bytes: los scripts los guardan en disco y la web los meterá en el ZIP.
Por qué: así el mismo código sirve en la web y en `npm run muestras`, como pide CLAUDE.md (igual que el lector, D19).

**D26 · La cabecera con el logo y los datos va al principio del cuerpo de la primera página, no en la zona de "encabezado" de Word.** Es una tabla sin bordes de dos celdas (logo a la izquierda y datos a la derecha) con una línea del color de la clínica debajo. Las demás páginas no llevan cabecera, como en la referencia.
Por qué: las tablas e imágenes dentro del encabezado de Word son lo que peor aguanta Google Docs, y así la clínica cambia el logo o los datos como cualquier otro texto. Se comprobará en T7.

**D27 · Qué datos lleva la cabecera:** el nombre comercial en negrita; la dirección; "Tel." y los teléfonos; el correo y la web; la razón social y el CIF. La web es opcional: si está vacía, no se pone ni el hueco. La razón social solo se pone si es distinta del nombre comercial. Si falta cualquier otro dato, sale su hueco amarillo.
Por qué: muchas clínicas no tienen web, y un hueco amarillo de `[Web]` en la cabecera parecería un error. El CIF sí debe estar, así que su hueco se queda.

**D28 · Logo como mucho de 5 cm de ancho y 2,6 cm de alto, sin deformarlo.** Se ajusta al recuadro hasta tocar el ancho o el alto máximo; un logo pequeño también se amplía para que todos se vean de un tamaño parecido. El tamaño se lee directamente del archivo PNG o JPG, sin instalar nada.

**D29 · Colores calculados a partir del color de la clínica.** Fondo suave de los recuadros: 10 % del color y 90 % de blanco. Filas alternas de las tablas: 4 % del color. Texto de las cabeceras de tabla: blanco si el contraste con el color es de al menos 4,5 (la pauta de accesibilidad WCAG); si no, texto casi negro (#262626). Color provisional de las muestras: **azul petróleo #2E6A80**, aprobado por Sira.
Por qué: así la clínica elige un solo color y todo combina. El 4,5 es el contraste mínimo recomendado para leer texto normal.

**D30 · Los datos que faltan llevan el estilo "Dato pendiente" y, además, el resaltado amarillo directo en el texto.**
Por qué: en las pruebas, LibreOffice no mostraba el amarillo que venía solo en el estilo (y Google Docs tampoco suele hacerlo). Es la única excepción a "todo con estilos": es una marca provisional que la clínica borra al rellenar el dato.

**D31 · Las tablas tienen anchos fijos en "twips" (la medida interna de Word), calculados a partir de porcentajes del ancho de la página.** Cada columna se reparte según su texto más largo, con un mínimo del 10 %. Las filas no se parten entre páginas, y la fila de cabecera se repite si la tabla continúa en la página siguiente.
Por qué: Google Docs ignora los anchos guardados directamente como porcentaje y descuadra la tabla.

**D32 · El párrafo que va justo después de una tabla o de un recuadro lleva 6 pt de espacio por encima.**
Por qué: Word no deja espacio debajo de las tablas, y el texto quedaba pegado al recuadro. Los títulos no lo necesitan porque ya traen su espacio.

**D33 · El salto de página se aplica como "salto de página antes" en el párrafo siguiente**, en lugar de añadir un párrafo vacío.
Por qué: así no queda una línea en blanco arriba de la página nueva. Si lo siguiente es una tabla, se usa un salto normal.

**D34 · (Sustituida por la D36.) Si un texto usa un elemento de la T4** (casillas, huecos, cajas, firmas o tabla de datos), el generador se para con un mensaje claro ("llega en la tarea T4") en lugar de dibujarlo mal. Por eso en T3 `npm run muestras` genera solo el documento informativo: `informacion-neutra.docx`, `informacion-calida.docx` e `informacion-neutra-datos-vacios.docx` (todos los datos vacíos y sin logo).

**D35 · La versión del modelo ("v1.0") está en `VERSION_MODELO`, en `src/generador/generador.ts`.** Cuando cambie el contenido (ver `buenas-practicas.md`), se cambia ahí.

**Pendiente para T5 (revisión visual):**
- ⚠️ REVISAR: el documento informativo ocupa 4 páginas (la referencia ocupa 3) y la cuarta queda casi vacía. Habrá que ajustar márgenes, tamaños o espacios comparando con la referencia.
- En el último recuadro, "¿Tiene alguna duda?" y el texto siguiente salen en la misma línea, porque en `contenido/` están en líneas seguidas y forman un solo párrafo (D22). Hay que decidir si se separan.

**Pendiente para T6 (web):** con colores muy claros (por ejemplo, un amarillo), los títulos de apartado se leen mal sobre el blanco. Conviene que el selector avise o que solo ofrezca colores con contraste suficiente.

## Decisiones de la tarea T4 (26/11/2026)

**D36 · Las piezas de formulario están en `src/generador/formulario.ts`** (casilla, huecos, medidas y cómo partir una línea con firma). El montaje de las tablas sigue en `generador.ts`. Ya no hay avisos de "llega en la tarea T4": `npm run muestras` genera también el consentimiento (6 Word en total). (Sustituye a la D34.)

**D37 · Casillas ☐ con el estilo de carácter "Casilla", en la fuente Segoe UI Symbol.**
Por qué: Arial no tiene el símbolo ☐. Segoe UI Symbol viene con Windows; en Mac, LibreOffice y Google Docs, el programa pone sola otra fuente que lo tenga (en LibreOffice se ve bien). Se comprueba en T7. El espacio que va detrás de una casilla es un espacio que no se parte, para que "☐ Perro" nunca quede dividido entre dos líneas.

**D38 · Huecos para escribir:**
- Un `[linea]` que ocupa él solo una celda deja la celda vacía: la propia celda es el hueco.
- Un hueco dentro de una frase es un trozo de espacios fijos subrayados en gris, con el estilo de carácter "Hueco". No lleva guiones bajos.
- `[linea-corta]` mide unos 3 cm en el texto y 1,8 cm dentro de una tabla, para que quepan dos en la misma celda ("Sexo / Edad / Peso").
- `[linea]` dentro de una frase llega más o menos hasta el final de la línea. Si queda menos de 3 cm, ocupa una línea entera.
Por qué: si alguien escribe más texto delante, el hueco baja entero a la línea siguiente y no descuadra nada. El cálculo del final de la línea es aproximado, porque Word no lo deja saber de antemano.

**D39 · Tabla de datos (`::: tabla-datos`):** la etiqueta ocupa el 38 % del ancho, en negrita sobre el fondo suave del color, y el contenido el 62 %. Solo lleva líneas horizontales grises, así que la línea de debajo de cada fila es la línea sobre la que se escribe. Las filas miden como mínimo 0,75 cm, y la fila con `[caja]` es más alta, con la etiqueta arriba.

**D40 · Cajas:** `[caja]` mide 1,6 cm de alto (unas 3 líneas) y `[caja-grande]` 2,6 cm (unas 5 líneas). Son una tabla de una celda con borde gris y altura mínima, así que crecen si se escribe más.

**D41 · Recuadros de firma (2 cm de alto, con el texto pequeño en gris abajo):**
- **En una línea de texto** (bloque `::: firma` o revocación): una tabla sin bordes, con cada trozo en una celda a partes iguales. Por ejemplo, la etiqueta a la izquierda y el recuadro con borde discontinuo a la derecha.
- **En la tabla de firmas:** la celda es el recuadro, pero sin borde discontinuo, porque la tabla ya la enmarca. Por qué: en las pruebas, el borde discontinuo de la celda chocaba con las líneas de la tabla y LibreOffice lo dibujaba a medias.
- **Dentro de un `::: destacado`** (revocación): la línea con la firma va en una fila propia del mismo recuadro, con una columna estrecha de relleno a cada lado y una fila de relleno debajo. Por qué: meter una tabla dentro de otra es lo que peor aguanta Google Docs, y el relleno evita que el borde discontinuo se coma el borde de color del recuadro.

**D42 · Dos tablas seguidas se separan con un párrafo vacío muy bajito (6 pt).**
Por qué: Word y LibreOffice funden en una sola dos tablas seguidas (pasaba con la caja de "Preguntas" y la tabla de firmas).

**D43 · Un elemento en un sitio donde no se puede dibujar avisa con un error claro.** Por ejemplo: un `[caja]` en medio de una frase, una firma dentro de un título o de una lista, o una caja dentro de un `::: destacado`.
Por qué: igual que la D20, un fallo en el texto debe verse al generar, no en el Word de otra clínica.

**Comprobado en T4:** los 6 Word se generan sin errores. LibreOffice los convierte a PDF, y Word abre el consentimiento y lo exporta a PDF sin problemas.

**Pendiente para T5 (revisión visual):**
- ⚠️ REVISAR: el consentimiento ocupa 7 páginas (la referencia, 6). La página 5 queda casi vacía porque `contenido/` pone un salto de página antes del apartado 7, y el apartado 6 no cabe entero en la página 4.
- En la tabla de pruebas, la cabecera "Recomendada" se parte en "Recomendad / a" porque la columna es estrecha. Hay que ajustar el reparto de anchos de las columnas.
- En la tabla de firmas, "Lugar, fecha y hora" con una localidad larga ("Ciudad Ejemplo") hace que el segundo hueco baje a otra línea.
- Para ver los PDF como imágenes sin instalar nada se puede usar una función de Windows (`Windows.Data.Pdf`) desde PowerShell. Se usó en T4 con un script temporal; si hace falta en T5, se puede guardar en `scripts/`.

## Decisiones de la tarea T5 · primera parte: revisión (26/11/2026)

**D44 · Script `scripts/pdf-a-imagenes.ps1` para convertir las páginas de un PDF en imágenes PNG.** Usa una función que ya trae Windows (`Windows.Data.Pdf`), sin instalar nada. Uso: `powershell -ExecutionPolicy Bypass -File scripts/pdf-a-imagenes.ps1 salida/pdf/*.pdf` (deja las imágenes en `salida/imagenes/`). El archivo se guarda con la marca BOM al principio, porque sin ella el PowerShell de Windows lee mal las tildes.
Por qué: se queda en el proyecto en lugar de ser de usar y tirar porque hará falta otra vez en T7. Solo sirve para revisar; no forma parte de la web.

**D45 · Prueba de estrés dentro de `npm run muestras`.** Se generan 8 Word (antes, 6). Las dos muestras nuevas son `informacion-neutra-estres.docx` y `consentimiento-neutra-estres.docx`: llevan una clínica ficticia con todos los datos muy largos y el logo apaisado `marca/logo-apaisado.png` (1200 × 250 px). Ese logo es un rectángulo gris azulado con la huella y tres barras que imitan un texto, y se fabrica con `npm run logo-ejemplo`, igual que el logo cuadrado (D15). El logo cuadrado sale idéntico al anterior.
Por qué: así la prueba de estrés se repite sola cada vez que se generan las muestras.

**Medidas reales de la referencia** (leídas del PDF, que está hecho con ReportLab y Helvetica, una fuente equivalente a Arial). Márgenes laterales de 1,8 cm. Cabecera a unos 0,9 cm del borde superior. Cuerpo de 9,3 pt con un interlineado de 12,4 pt. Título del documento de 16 pt, apartados de 11,5 pt y subtítulo de 9,5 pt. Tablas y recuadro destacado de 8,6 pt, con filas de 16,8 pt. Nota de protección de datos de 8 pt y pie de 7,3 pt. En la cabecera, el nombre va a 10,5 pt, los datos a 8,3 pt y el logo mide 2,4 cm. Las viñetas van pegadas al margen y el texto empieza a 0,39 cm. Columnas de la tabla ASA: 8 %, 41 % y 51 %.

⚠️ REVISAR la D26: dice que las páginas 2 y siguientes no llevan cabecera "como en la referencia". No es exacto: los dos PDF de referencia repiten la cabecera completa (logo, datos y línea) en **todas** las páginas. La D26 sigue vigente hasta que Sira decida (ver la diferencia 2 de la lista).

**Diferencias encontradas (pendientes de que Sira apruebe las correcciones):**
1. Más páginas: la información ocupa 4 (la referencia, 3) y el consentimiento 7 (la referencia, 6). Causa: letra más grande, márgenes de 2 cm y un margen superior que deja mucho blanco encima de la cabecera.
2. La cabecera solo sale en la primera página; en la referencia sale en todas.
3. Los huecos dentro de una frase parecen guiones bajos, y las celdas vacías de la tabla de datos no muestran ningún hueco. En la referencia son campos con un fondo suave y una línea debajo.
4. Casillas ☐ pequeñas y opciones demasiado juntas ("☐ Perro ☐ Gato Raza:").
5. Viñetas con 0,7 cm de sangría; en la referencia van pegadas al margen.
6. Tabla de pruebas: "Recomendada" se parte en dos líneas.
7. Tabla de firmas: los huecos de "Lugar, fecha y hora" bajan de línea, y las etiquetas "N.º de colegiado/a" y "Lugar, fecha y hora" se parten en dos líneas.
8. Firmas: la tabla de firmas no tiene recuadro discontinuo (la referencia sí). En la revocación, el discontinuo es grueso, "Firma del titular" queda pisado por la línea y se ve una raya vertical suelta a la derecha.
9. Firma "en caso de rechazo": el recuadro mide 2 cm (en la referencia, 1,1 cm) y la etiqueta va abajo en lugar de centrada.
10. "¿Tiene alguna duda?" sale en la misma línea que el texto siguiente.
11. Pequeños detalles: el pie no lleva dos puntos tras "Iniciales del titular"; la etiqueta "Riesgos particulares" va arriba y no centrada; las filas de las tablas son más altas.
12. Prueba de estrés: no se sale nada de la página, pero la cabecera crece hasta unos 4,5 cm y el logo apaisado queda abajo del todo.
La muestra con los datos vacíos se ve bien: los huecos amarillos salen en la cabecera y en el texto.

## Decisiones de la tarea T5 · segunda parte: correcciones (26/11/2026)

Sira aprobó las tres decisiones de la revisión: bajar los tamaños de letra, la opción (b) para la cabecera y la línea en blanco en `contenido/`. Resultado: la información ocupa **3 páginas** y el consentimiento **6**, igual que la referencia. Pasa en las 8 muestras, también en la prueba de estrés.

**D46 · Tamaños de letra y márgenes como en la referencia.** Cuerpo de 9,5 pt; título de 16 pt; apartados de 11,5 pt; subapartados de 10 pt; subtítulo de 9,5 pt; tablas de 8,5 pt; nota y protección de datos de 8 pt; textos de firma y pie de 7,5 pt; nombre de la clínica de 10,5 pt. Márgenes de 1,8 cm a los lados, 1,4 cm arriba y 1,8 cm abajo. Las filas de las tablas tienen menos relleno (2,5 pt arriba y abajo).
Por qué: con los tamaños anteriores sobraba una página en cada documento. ⚠️ Los "tamaños orientativos" de CLAUDE.md (10 / 18 / 13 pt) quedan sustituidos por estos. Conviene actualizar CLAUDE.md cuando Sira lo apruebe.

**D47 · Encabezado de la página 2 en adelante (modifica la D26).** La cabecera completa (logo, datos y línea de color) sigue solo en la primera página. Desde la segunda, el encabezado de Word lleva solo el nombre de la clínica: texto pequeño y gris, alineado a la derecha, con una raya fina debajo. Si falta el nombre, sale el hueco amarillo.
Por qué: es la opción (b) que eligió Sira. Cada hoja queda identificada sin meter tablas ni imágenes en el encabezado de Word, que es lo que peor aguanta Google Docs.

**D48 · Huecos y campos para escribir (modifica la D38 y la D40).**
- Un `[linea]` que ocupa él solo una celda es ahora un párrafo con el estilo "Campo para escribir": fondo gris muy suave (#F3F3F3) y una línea gris debajo, como los campos de la referencia.
- Las cajas (`[caja]`, `[caja-grande]` y la caja de "Riesgos particulares") llevan el mismo fondo gris suave.
- Los huecos dentro de una frase siguen siendo solo una línea gris, **sin fondo**. Por qué: se probó con fondo, pero LibreOffice lo pinta espacio a espacio y se ven rayitas verticales entre ellos.
- `[linea-corta]` dentro de una celda mide ahora 1,5 cm.

**D49 · Casillas más grandes y opciones más separadas (modifica la D37).** El estilo "Casilla" tiene 11 pt. Antes de cada casilla, el espacio normal se sustituye por un espacio ancho (U+2003, de 1 em), y por él se puede partir la línea igual que por un espacio normal.
Por qué: en la referencia las casillas se ven bien y las opciones no van amontonadas. No es un espacio para alinear (regla 2 de diseño): solo separa una opción de la siguiente.

**D50 · Viñetas casi pegadas al margen.** La viñeta va en el margen y el texto empieza a 0,45 cm (antes, a 0,7 cm), como en la referencia.

**D51 · Anchos mínimos de las columnas (completa la D31).** Ninguna columna es más estrecha que la palabra más larga de su cabecera; así "Recomendada" no se parte. En las tablas con la primera columna de etiquetas, esa columna mide lo que ocupe la etiqueta más larga, como mucho el 25 %. Lo que hace falta se quita de las demás columnas, en proporción.

**D52 · Recuadros de firma (modifica la D41).**
- Borde discontinuo fino, de guiones cortos.
- Un poco de aire bajo "Firma…", para que la línea no lo pise.
- 1,4 cm de alto en una línea de texto (firma de rechazo y revocación) y 1,7 cm en la tabla de firmas.
- El texto que acompaña al recuadro va centrado en vertical.
- En la revocación, las columnas de relleno llevan por fuera el borde de color del recuadro y por dentro ninguno, así que ya no aparece la raya suelta.
- La tabla de firmas sigue **sin** borde discontinuo en las celdas de firma (como decía la D41). La propia celda hace de recuadro. Es la única diferencia con la referencia que queda en esa tabla.

**D53 · Logo como mucho de 2,4 cm de alto, centrado en vertical (modifica la D28).** Los datos de la clínica también van centrados en vertical. Por qué: es el tamaño del logo de la referencia, y con un logo apaisado ya no se queda abajo del todo.

**D54 · Dos puntos tras el texto de las iniciales del pie:** "Iniciales del titular:". Los pone el generador, así que no hace falta tocar `contenido/`.

**D55 · Línea en blanco tras "¿Tiene alguna duda?" / "¿Tienes alguna duda?"** en `contenido/informacion-neutra.md` y `contenido/informacion-calida.md`. Solo separa la pregunta del texto en dos párrafos; no cambia ninguna palabra. Aprobado por Sira.

**Queda pendiente (no se ha cambiado):**
- El texto del recuadro destacado sigue al tamaño del cuerpo (9,5 pt); en la referencia mide 8,6 pt. Al final no ha hecho falta bajarlo para ajustar las páginas.
- "☐ Gato Raza:" sigue con un espacio normal entre "Gato" y "Raza", porque así está escrito en `contenido/`.
- Comprobar en Word. Se intentó exportar el PDF con Word desde un script, pero Word se quedó esperando (seguramente por algún aviso propio) y hubo que cerrarlo. Se comprobará a mano en la T7.

**D56 · Cada firma va en la misma página que el texto que se firma.** Una firma (una línea con `[firma: …]` o una tabla con celdas de firma) se "ata" con "conservar con el siguiente" de Word a los bloques de texto que tiene justo encima: hasta 3 bloques (párrafos, tablas o notas). Se para en un título, un salto de página o un recuadro. Si no cabe todo, baja junto a la página siguiente. Por ejemplo, la firma "en caso de rechazo" se lleva "Pruebas preanestésicas…", la tabla de pruebas y "Si rechaza…", como en la referencia.
Por qué: Sira vio que, en la muestra con datos vacíos, la firma quedaba sola al principio de la página 4, sin el texto que se firma. Dónde cae el corte de página depende de los datos y de lo que edite cada clínica, así que tiene que ser una regla y no un salto de página fijo. Comprobado: las 8 muestras siguen con 3 y 6 páginas. ⚠️ Google Docs no siempre respeta esta opción dentro de las tablas: se comprueba en la T11.

## Nueva idea de la herramienta y plan rehecho (26/11/2026, durante la T5)

Sira aclaró cómo imagina la herramienta: un panel donde el veterinario rellena los datos, elige el contenido, ve una vista previa y descarga en Word o en PDF. Lo hecho hasta ahora (lector, generador de Word y diseño) se aprovecha entero. Cambian la web y el plan (`plan-tareas.md`: tareas nuevas T6, T7, T9 y T10; la antigua T6 pasa a ser la T8 y las antiguas T7–T9, las T11–T13). Donde este registro dice "se aplica en T6 (web)" (D24 y el pendiente de T3 sobre los colores claros), ahora es la **T8**.

**D57 · Cada veterinario elige libremente los bloques.** Cualquier apartado se puede quitar; no hay apartados obligatorios.
Por qué: decisión de Sira. Cada clínica es responsable de su documento y lo revisa con su asesoría. La web solo avisa si se quita un apartado al que otro hace referencia.

**D58 · Las referencias a otros apartados se numeran solas.** En `contenido/` se cambia solo el número ("ver apartado 3") por una marca que el generador rellena con el número que corresponda después de quitar bloques. El texto revisado no cambia. Aprobado por Sira. Se hace en la T6.

**D59 · Descarga en Word y en PDF, con el PDF dibujado aparte (sustituye a la D4).** La librería se elegirá en la T10, gratuita y empaquetada dentro de la web (D11). Llevará una fuente libre que mida como Arial, porque Arial no se puede incluir.
Por qué: decisión de Sira. Contrapartida aceptada: hay dos diseños, el del Word y el del PDF, que hay que mantener iguales.

**D60 · Datos de la clínica obligatorios; datos del paciente opcionales y nunca guardados.** El veterinario puede rellenar los datos del paciente y del titular en la web, o dejarlos vacíos para rellenarlos a mano. Los datos del paciente no se guardan en ningún sitio, ni en `localStorage`: al cerrar la página desaparecen. Los de la clínica, como mucho, se recuerdan en el navegador si Sira lo aprueba en la T8.
Por qué: decisión de Sira (la herramienta debe servir para las dos formas de trabajar). No guardar datos de clientes evita riesgos y obligaciones de protección de datos para la herramienta; el documento descargado es responsabilidad de cada clínica.

**D61 · La vista previa es aproximada.** Se dibuja en la propia página (T9). No puede ser idéntica al Word, porque cada programa coloca el texto a su manera.

**CLAUDE.md actualizado** con la nueva descripción de la herramienta y de la web, el PDF en la arquitectura, los tamaños de letra de la D46, la regla de las firmas (D56) y las pruebas nuevas.

**D62 · El recuadro de "Preguntas planteadas… y respuestas del veterinario" mide 4 cm de alto (antes, 2,6 cm).** Es el único `[caja-grande]` de los textos. Es texto libre, sin límite de caracteres, y crece si se escribe más (alto mínimo). Por la D56, la tabla de firmas va siempre en la misma página que este recuadro.
Por qué: Sira lo pidió para que haya sitio suficiente al escribir a mano. Sigue cabiendo en 6 páginas.
Pendiente: en la T7, este recuadro será un campo de texto opcional del paso del paciente. En la T11, comprobar qué pasa si alguien escribe dentro más de una página, porque las filas de tabla no se parten entre páginas.

## Decisiones de la tarea T6 · Bloques elegibles (26/11/2026)

**D63 · Cada apartado se identifica por su número original en `contenido/`.** Es el mismo en la versión neutra y en la cálida, así que la elección de bloques sirve para las dos. El lector comprueba que los títulos `##` van numerados 1, 2, 3… sin saltos; si no, avisa del error (como la D20).
Por qué: no hace falta añadir marcas nuevas a los títulos ni tocar el texto revisado.

**D64 · Marca `[ref:N]` para las referencias a otros apartados (aplica la D58).** En `contenido/consentimiento-*.md` se cambió solo el número: "(ver apartado [ref:3])" y "queda anotado en el apartado [ref:1]". El generador pone el número que corresponda después de quitar bloques. El lector avisa si un `[ref:N]` apunta a un apartado que no existe. Aprobado por Sira.

**D65 · Si se quita un apartado al que otro hace referencia:** sale un **aviso en pantalla** ("Cuidado: el apartado «Datos de identificación» hace referencia al apartado «Valoración del riesgo…», que has quitado"), y en el Word la referencia sale como **"[apartado quitado]" en amarillo**, igual que un dato que falta (D8).
Por qué: Sira prefiere el aviso en pantalla (la web lo mostrará en la T8; `npm run muestras` lo muestra con ⚠). El amarillo en el Word es una red de seguridad: el texto revisado no se puede cambiar solo, y un número equivocado sería peor que un hueco visible.

**D66 · Lo que nunca se quita:**
- El texto que va antes del primer apartado (por ejemplo, el recuadro de introducción de la información).
- La **protección de datos** (`::: letra-pequena`). Si se quita su apartado (el 7 del consentimiento), la nota se queda en su sitio, al final del apartado anterior que siga en el documento.
Por qué: decisión de Sira. La protección de datos debe estar siempre en el consentimiento. (Completa la D57.)

**D67 · Un salto de página que va justo antes de un título pertenece a ese apartado.** Si se quita el apartado, su salto también se quita; si se queda, sigue empezando en página nueva. Si un salto quedara al principio del documento, se quita, para no dejar la primera página casi vacía. Aprobado por Sira.
Consecuencia vista en las muestras: al quitar el apartado 6, la página anterior al apartado 7 queda medio vacía, porque el 7 sigue empezando en página nueva. No es un error, pero se puede revisar más adelante.

**D68 · Las funciones de los bloques están en `src/contenido/bloques.ts`** y no usan nada propio de Node (como la D19). `listarApartados` da la lista para la web; `revisarReferencias` da los avisos sin generar el Word (para que la web avise al marcar o desmarcar); `elegirApartados` quita, numera de nuevo y pone las referencias.
`npm run muestras` genera 3 muestras nuevas (11 Word en total): `consentimiento-neutra-bloques-quitados.docx` (sin los apartados 2, 3 y 7: sale el aviso, la protección de datos se queda y el apartado de las firmas sigue empezando en página nueva; ocupa 4 páginas), `consentimiento-calida-bloques-quitados.docx` (sin el 6) e `informacion-calida-bloques-quitados.docx` (sin el 2 y el 4). Comprobado en PDF: los números y la referencia en amarillo salen bien, y cada firma sigue con su texto.

**Pendiente:**
- ⚠️ REVISAR: "…firmando el apartado de revocación" (apartado 7 del consentimiento) se refiere al recuadro de revocación del apartado 8. Como no lleva número, no se avisa si se quita el apartado 8. Se puede explicar en la web en la T8.
- Hecho: la marca `[ref:N]` está en la tabla de formato de `CLAUDE.md` (aprobado por Sira).

## Decisiones de la tarea T7 · Datos del paciente (26/11/2026)

**D69 · Cada hueco y cada casilla del consentimiento lleva un nombre en `contenido/`.** Se escribe pegado a la marca: `[linea#dni]`, `[linea-corta#peso]`, `[caja#riesgos]`, `[ ]#perro`. Solo minúsculas sin tilde, números y guiones. El texto revisado no cambia, solo las marcas (como en la D64). Las dos versiones tienen los mismos huecos en el mismo orden, así que llevan los mismos nombres, y los mismos datos del paciente sirven para las dos. Aprobado por Sira, también la nueva fila en la tabla de formato de `CLAUDE.md`.
Por qué: para rellenar un hueco hay que saber qué es. Un nombre en el texto no depende del orden ni de la redacción, y sigue funcionando aunque se quiten apartados.

**D70 · Se pueden rellenar todos los huecos y casillas, salvo las firmas** (opción c de Sira): 72 campos, también los que decide el cliente (acepta o rechaza las pruebas, ampliaciones, reanimación, representación y revocación). La responsabilidad de lo que se rellena es de cada clínica (como la D57).
- Un mismo nombre puede salir en varios sitios y se rellena en todos: `titular` va en el apartado 1 y en la tabla de firmas. El lector avisa si un nombre se usa a la vez para una casilla y para un hueco.
- El recuadro de preguntas y respuestas (D62) es el campo `preguntas`.

**D71 · Cómo sale un campo relleno** (aprobado por Sira):
- **Hueco (`[linea]`, `[linea-corta]`):** el dato escrito sobre la misma línea subrayada; si el dato es más corto, el resto del hueco sigue subrayado. Así se ve que es un campo y se puede corregir a mano encima.
- **Celda que es solo un hueco** (tabla de datos, tabla de firmas): el dato dentro del campo gris con la línea debajo.
- **Recuadro (`[caja]`, `[caja-grande]`):** el texto dentro, empezando arriba. Los saltos de línea se respetan y el recuadro crece si hace falta.
- **Casilla marcada:** ☒ (U+2612), en la misma fuente que ☐.
- **Campo vacío:** sale como antes, con el hueco en blanco.

**D72 · Las funciones de los campos están en `src/contenido/campos.ts`** y no usan nada propio de Node (como la D19 y la D68).
- `listarCampos` da la lista para el paso 3 de la web (T8): nombre, clase (casilla, texto corto, texto o texto largo), apartado y un texto de contexto (la etiqueta de la fila o la línea donde está; en los recuadros sueltos, el párrafo de antes).
- `rellenarCampos` pone los datos en una copia del documento. Se usa **antes** de quitar apartados, para comprobar los nombres con el documento entero. Si llega un nombre que no existe, o un texto para una casilla (o al revés), ese dato no se usa y se devuelve un aviso.
- Los datos del paciente solo se usan para fabricar el Word: no se guardan en ningún sitio (D60).

**D73 · Muestras con paciente.** `npm run muestras` genera 2 muestras nuevas (13 Word en total): `consentimiento-neutra-con-paciente.docx` y `consentimiento-calida-con-paciente.docx`, con la paciente ficticia «Luna» (`src/muestras/paciente-ejemplo.ts`, todos los datos inventados). Hay campos rellenos de todas las clases y otros vacíos a propósito. Comprobado en PDF: siguen siendo 6 páginas, nada se descuadra y cada firma sigue con su texto. `npm run contenido` muestra ahora el nombre de cada campo y la lista de campos, y avisa si queda algún hueco del consentimiento sin nombre.
Además, si un Word de `salida/` está abierto en Word, `npm run muestras` avisa ("el archivo está abierto en otro programa") y sigue con las demás muestras, en lugar de pararse con un error incomprensible.

**Pendiente:**
- T8: en la web, agrupar las casillas que van juntas (perro/gato, tipo de anestesia, ASA…) y escribir una etiqueta clara para cada campo, a partir del contexto que da `listarCampos`.
- T11: qué pasa si se escribe más de una página en un recuadro (ya estaba en la D62; ahora también se puede escribir desde la web).
