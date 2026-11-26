# CLAUDE.md — Kit de consentimientos de anestesia

## Qué es este proyecto

Una **mini herramienta web gratuita** para que otras clínicas veterinarias (compañeros de VetFamily) descarguen, personalizados con sus datos, dos documentos en **Word (.docx) editable o en PDF**:

1. **Consentimiento informado de anestesia y sedación** (6 páginas, con campos para rellenar y firmas).
2. **Información sobre la anestesia y la sedación** (3 páginas, solo informativo para el cliente).

Cada documento existe en **dos versiones de lenguaje**: **neutra** (usted, "paciente", "titular") y **cálida** (tú, "peludo", "peque", "tutor/a").

El veterinario sigue unos pasos en la web (ver D57–D60 en `docs/decisiones.md`):

1. Escribe los **datos de la clínica** (obligatorios), sube su logo y elige su color y su versión de lenguaje.
2. **Elige qué bloques** (apartados) lleva su documento. Puede quitar cualquiera; la responsabilidad del contenido final es de cada clínica y su asesoría.
3. Si quiere, rellena los **datos del paciente** y del titular. Si no, el documento sale con los huecos en blanco para rellenarlo a mano.
4. Ve una **vista previa** y **descarga en Word o en PDF**.

**Todo ocurre en su navegador**: no hay servidor y no se envía nada a ningún sitio. **Los datos del paciente nunca se guardan**, ni siquiera en el navegador.

## Quién trabaja aquí

- **Sira** dirige el proyecto. **No es desarrolladora**: explícale cada paso en español y en lenguaje sencillo, con analogías cuando ayuden. Antes de usar un término técnico, di qué significa en una frase.
- Si hay varias alternativas, explica pros y contras y **ofrece primero la opción gratuita**.

## Reglas de trabajo (obligatorias)

1. **Una tarea por sesión**, siguiendo `docs/plan-tareas.md`. No adelantes trabajo de otras tareas.
2. **Antes de tocar nada**, enumera los archivos que vas a crear o modificar y qué harás en cada uno. **Espera la aprobación de Sira.**
3. Al terminar cada tarea:
   - Marca la tarea como hecha en `docs/plan-tareas.md`.
   - Anota en `docs/decisiones.md` cualquier decisión nueva (qué y **por qué**).
   - Explica a Sira cómo comprobar el resultado ella misma (qué comando ejecutar y qué debe ver).
   - Propón el mensaje de commit de Git.
4. **No inventes contenido clínico ni legal.** Los textos de `contenido/` están revisados por el equipo veterinario. Si ves algo que parece un error, avisa con "⚠️ REVISAR", pero no lo cambies.
5. **Nunca uses la palabra "mascota"** en ningún texto (documentos, web, mensajes). En la versión cálida se usan "peludo", "peque" y "precioso"; en la neutra, "paciente", "perro o gato".
6. No añadas dependencias, servicios ni complejidad que no pida el plan. Si crees que hacen falta, propónlo y explica por qué.

## Arquitectura (decidida, ver `docs/decisiones.md`)

- **Web estática** (solo archivos HTML, CSS y JS), sin servidor ni base de datos.
- **Generación del Word en el navegador** con la librería `docx`.
- **Generación del PDF en el navegador** con una librería que dibuja el PDF aparte (se elige en la tarea del PDF, ver D59). Debe seguir las mismas reglas de diseño que el Word.
- **Descarga en ZIP** de los dos documentos con `jszip`.
- **Sin cookies, sin analítica y sin recursos externos en tiempo de ejecución** (ni CDN ni Google Fonts). Todo va empaquetado dentro de la web, para que funcione durante años sin mantenimiento.
- **Alojamiento:** GitHub Pages, con publicación automática mediante GitHub Actions al subir cambios a la rama `main`.

### Stack

| Pieza | Para qué |
|---|---|
| Node.js LTS | Entorno para desarrollar y construir la web (solo en el PC de Sira, no en producción) |
| Vite + TypeScript (sin framework) | Construye la web estática; sin React, para mantenerla simple |
| `docx` | Fabrica los archivos Word |
| `jszip` | Empaqueta los documentos en un ZIP |
| Librería de PDF (se elige en la tarea del PDF) | Dibuja el PDF en el navegador |
| Lector propio (`src/contenido/`) | Lee los textos en markdown de `contenido/` (`marked` se descartó, D18) |
| LibreOffice (instalado en el PC) | Solo para pruebas: convertir los Word de muestra a PDF y revisarlos visualmente |

El **mismo código generador** debe funcionar en el navegador y en Node (script `npm run muestras`), para poder fabricar documentos de prueba sin abrir la web.

## Estructura de carpetas

```
kit-consentimientos-anestesia/
├── CLAUDE.md
├── docs/            plan-tareas.md, decisiones.md, buenas-practicas.md, prompts-inicio.md
├── contenido/       los 4 textos en markdown (fuente única de verdad)
├── referencia/      PDFs originales de la clínica de Sira (solo consulta, NO se sube a GitHub)
├── marca/           logo de ejemplo neutro para las muestras
├── src/             código de la web y del generador
├── scripts/         script de muestras y utilidades
├── salida/          documentos generados en pruebas (NO se sube a GitHub)
└── pruebas/         capturas de las pruebas de compatibilidad
```

`.gitignore` debe excluir: `node_modules/`, `dist/`, `salida/` y `referencia/`.

## Contenido: formato de los archivos de `contenido/`

Cada archivo es markdown con una cabecera (frontmatter):

```yaml
documento: consentimiento | informacion
variante: neutra | calida
titulo, subtitulo, pie: textos del documento
iniciales_en_pie: texto de la casilla de iniciales en el pie, o "no"
```

Elementos del cuerpo:

| Sintaxis | Qué genera en Word |
|---|---|
| `## Título` | Título de apartado (estilo Título 1, en el color de la clínica) |
| `### Subtítulo` | Subtítulo (estilo Título 2, negrita oscura) |
| Párrafo, `**negrita**`, `*cursiva*` | Texto normal |
| `- elemento` | Lista con viñeta en el color de la clínica |
| `1. elemento` | Lista numerada con el número en el color de la clínica |
| `::: tabla-datos` … `:::` | Tabla de dos columnas: etiqueta en negrita a la izquierda (fondo suave del color) y contenido a la derecha. Cada fila es `- Etiqueta :: contenido` |
| `::: tabla` … `:::` | Tabla markdown con la fila de cabecera en el color de la clínica y el texto en blanco |
| `::: tabla primera-columna-etiquetas` | Igual, con la primera columna en negrita |
| `::: nota` | Texto pequeño en gris |
| `::: letra-pequena` | Texto pequeño en color normal (protección de datos) |
| `::: destacado` | Recuadro con borde y fondo suave del color de la clínica |
| `::: firma` | Línea con etiqueta y recuadro de firma |
| `::: salto-de-pagina` `:::` | Salto de página |
| `[ ]` | Casilla de verificación ☐ |
| `[linea]` | Hueco para escribir que ocupa el resto de la línea o celda |
| `[linea-corta]` | Hueco corto (unos 3 cm) |
| `[caja]` | Recuadro para escribir (unas 3 líneas) |
| `[caja-grande]` | Recuadro para escribir (unas 5 líneas) |
| `[firma: Texto]` | Recuadro de firma con borde discontinuo y el texto pequeño en gris abajo |
| `{{VARIABLE}}` | Dato de la clínica (ver la tabla de variables) |
| `[ref:N]` | Número del apartado N ("ver apartado [ref:3]"). Si se quitan apartados, sale el número nuevo; si se quita el apartado N, sale "[apartado quitado]" en amarillo y la web avisa (D64, D65). Los títulos `##` deben ir numerados 1, 2, 3… sin saltos |
| `#nombre` | Nombre de campo del paciente, pegado a un hueco o una casilla: `[linea#dni]`, `[caja#riesgos]`, `[ ]#perro`. Solo minúsculas sin tilde, números y guiones, y el mismo en las dos versiones. Si la web trae el dato, sale escrito sobre el hueco (o la casilla marcada ☒); si no, el hueco en blanco (D69–D71) |

### Variables de la clínica

| Variable | Campo del formulario | Obligatorio |
|---|---|---|
| `{{NOMBRE_CLINICA}}` | Nombre comercial | Sí |
| `{{RAZON_SOCIAL}}` | Razón social (si está vacío, se usa el nombre comercial) | No |
| `{{CIF}}` | CIF/NIF | No |
| `{{DIRECCION}}` | Dirección completa (calle, CP y localidad) | Sí |
| `{{LOCALIDAD}}` | Localidad para las firmas | Sí |
| `{{TELEFONOS}}` | Teléfono(s) y WhatsApp | Sí |
| `{{EMAIL}}` | Correo de contacto | Sí |
| `{{EMAIL_PRIVACIDAD}}` | Correo para ejercer los derechos de protección de datos (si está vacío, se usa `{{EMAIL}}`) | No |
| `{{WEB}}` | Página web | No |

**Si un dato se deja vacío**, en el Word aparece el hueco entre corchetes y **resaltado en amarillo**, por ejemplo `[CIF]`, para que la clínica lo vea y lo rellene después.

## Reglas de diseño del Word (para que no se descuadre al editarlo)

Es la parte más importante del proyecto. El documento debe aguantar que otra persona lo edite en Word, LibreOffice o Google Docs.

1. **Todo con estilos de Word** (Normal, Título 1, Título 2, Lista…). Nada de formato aplicado a mano párrafo a párrafo. Cambiar el color o la fuente en el estilo debe actualizar todo el documento.
2. **Nada de espacios ni tabuladores para alinear.** Para alinear se usan tablas, con bordes invisibles si hace falta.
3. **Los huecos para escribir son celdas o tramos con borde inferior**, nunca guiones bajos (`____`).
4. **Las casillas son el carácter ☐** (U+2610) en una fuente que lo tenga en todos los sistemas. No uses controles de contenido de Word, porque se rompen en Google Docs y LibreOffice.
5. **El logo va en línea dentro de la cabecera** (en una tabla de cabecera con dos celdas: logo a la izquierda y datos de la clínica alineados a la derecha), nunca flotante. Debe tener un tamaño máximo y respetar su proporción.
6. **Fuente: Arial.** Existe en Windows, Mac y Google Docs, y LibreOffice la sustituye por Liberation Sans, que mide lo mismo. Tamaños (los de la referencia, D46): cuerpo 9,5 pt, tablas 8,5 pt, notas 8 pt, título del documento 16 pt y títulos de apartado 11,5 pt.
7. **Página A4**, con márgenes de 1,8 cm a los lados (D46).
8. **Tablas con ancho fijo** en porcentaje del ancho de la página, y filas que no se partan entre páginas. Los títulos de apartado van siempre con su texto siguiente ("conservar con el siguiente"), y cada firma va en la misma página que el texto que se firma (D56).
9. **Pie de página:** "{pie} · Modelo v1.0" y "Página X de Y" con campos de Word. Sin casilla de iniciales (D86: en veterinaria no se usa).
10. **Color de la clínica:** se elige en el formulario (por defecto, un azul o verde sobrio y neutro). Se aplica a los títulos, las viñetas, las cabeceras de tabla, la línea bajo la cabecera y los recuadros destacados. El fondo suave se calcula aclarando ese color. El texto blanco sobre el color debe tener buen contraste; si no lo tiene, se usa texto oscuro.
11. **Referencia visual:** los PDFs de `referencia/` muestran cómo debe quedar el diseño. Imita la estructura, no los datos ni el naranja de la clínica de Sira.

## La web (interfaz)

Una sola página, sencilla y profesional, en español, organizada en pasos:

1. **Cabecera:** qué es el kit, que es gratuito y que **los datos no salen de tu ordenador**.
2. **Paso 1 · La clínica:** los datos de la clínica (tabla de variables; los obligatorios, obligatorios), el logo (PNG o JPG, opcional, con vista previa), el color (selector con 6 colores sugeridos más uno personalizado) y la versión (cálida o neutra, con un ejemplo breve de cómo suena cada una).
3. **Paso 2 · Los bloques:** la lista de apartados de cada documento, todos marcados al principio. Se puede quitar cualquiera. Si se quita uno al que otro hace referencia, la web avisa, pero deja seguir.
4. **Paso 3 · El paciente (opcional):** los campos del consentimiento (titular, DNI, paciente, especie, peso, tipo de anestesia…). Lo que se deja vacío sale como hueco para rellenar a mano. Estos datos **nunca se guardan**.
5. **Paso 4 · Vista previa y descarga:** una vista previa aproximada del documento y los botones para descargar en **Word** o en **PDF** (los dos documentos, con una guía breve en `LEEME.txt`).
6. **Aviso visible:** "Modelo orientativo. Cada clínica debe revisarlo y adaptarlo con su asesoría legal y su proveedor de protección de datos antes de usarlo."
7. **Accesible y adaptada a móvil**, sin dependencias externas. Los datos de la clínica, como mucho, se recuerdan en `localStorage` si Sira lo aprueba; los del paciente, nunca.

## Pruebas obligatorias antes de dar una tarea por terminada

- `npm run muestras` genera los 4 Word de muestra (2 documentos × 2 versiones) con una clínica ficticia ("Clínica Veterinaria Ejemplo") y el logo de `marca/`, una muestra **con todos los datos vacíos** para comprobar los huecos amarillos y las muestras de la prueba de estrés (D45). Cuando existan, también las muestras con bloques quitados, con datos del paciente y en PDF.
- Convierte las muestras a PDF con LibreOffice (`soffice --headless --convert-to pdf`), mira las páginas y compáralas con `referencia/`.
- Prueba de estrés: un nombre de clínica muy largo y un logo apaisado. No debe descuadrarse nada.
- Ninguna firma debe quedar sola en una página, sin el texto que se firma.

## Comandos

- `npm run dev`: abre la web en local para probarla.
- `npm run build`: construye la web en `dist/`.
- `npm run muestras`: genera los documentos de prueba en `salida/`.
