# Prompts para cada sesión de Claude Code

## Primera sesión (T1)

```
Hola. Lee CLAUDE.md y los archivos de docs/ (plan-tareas.md, decisiones.md, buenas-practicas.md) y echa un vistazo a contenido/ y a referencia/.

Después:
1. Resúmeme en 5 líneas qué has entendido del proyecto.
2. Dime si ves algo contradictorio o que falte antes de empezar.
3. Propón cómo harías la tarea T1 y la lista exacta de archivos que vas a crear.

No toques nada hasta que te dé el visto bueno.
```

## Sesiones siguientes (T2 a T8)

```
Lee CLAUDE.md, docs/plan-tareas.md y docs/decisiones.md.
Vamos con la tarea T[número]: [nombre de la tarea].

Antes de empezar, dime qué archivos vas a crear o modificar y qué harás en cada uno. Espera mi aprobación.
Al terminar: marca la tarea en el plan, anota las decisiones nuevas en decisiones.md, explícame cómo comprobarlo yo y propón el mensaje de commit.
```

## Para revisar el diseño (T5)

```
Genera las muestras, conviértelas a PDF con LibreOffice y compara cada página con los PDF de referencia/.
Hazme una lista de diferencias, de mayor a menor importancia, y propón cómo corregir cada una. No corrijas nada todavía.
```

## Si algo se descuadra

```
En [programa: Word / LibreOffice / Google Docs], el documento [nombre] se ve mal en la página [X]: [describe lo que ves].
Busca la causa, explícamela en lenguaje sencillo y propón la solución antes de aplicarla.
```
