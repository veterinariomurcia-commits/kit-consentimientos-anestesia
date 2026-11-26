# Buenas prácticas — Kit de consentimientos de anestesia

## Cómo trabajar cada sesión con Claude Code

1. Abre la carpeta del proyecto en VS Code y abre Claude Code.
2. Pega el prompt de la tarea (ver `prompts-inicio.md`).
3. Claude Code te dirá qué archivos va a tocar. **Lee la lista y aprueba** solo si encaja con la tarea.
4. Al terminar, **compruébalo tú** con lo que dice la casilla "Comprobación" del plan.
5. Haz el commit (es como guardar una "foto" del proyecto a la que puedes volver si algo se estropea).
6. Cierra la sesión. La siguiente tarea va en una sesión nueva: así Claude Code trabaja con la mente despejada.

## Si algo sale mal

- Si el resultado no te gusta, dilo con un ejemplo concreto: "la tabla de firmas se sale del margen en la página 6".
- Si se ha liado, puedes volver al último commit. Pídele: "deshaz los cambios desde el último commit".
- Si una sesión se hace muy larga y Claude Code empieza a dar vueltas, ciérrala y empieza otra con un resumen de dónde estabas.

## Cómo actualizar el contenido más adelante

1. Edita el texto en `contenido/` (recuerda cambiarlo en **las dos versiones**, neutra y cálida).
2. Cambia la versión del modelo (v1.0 → v1.1) y anótalo en `decisiones.md`.
3. Ejecuta `npm run muestras` y revisa el resultado.
4. Haz commit y "push" (subir a GitHub). La web se actualiza sola en un par de minutos.

## Reglas de oro

- El texto clínico y legal no lo cambia Claude: lo cambia el equipo.
- Nunca "mascota".
- Cada cambio, probado en Word **y** en LibreOffice antes de publicarlo.
- La carpeta `referencia/` nunca se sube a GitHub, porque lleva tus datos y tu logo.

## Skills útiles

- **Skill `docx`** (si la tienes en Claude Code): ayuda a revisar los Word generados por dentro.
- No hace falta ninguna skill más para este proyecto.
