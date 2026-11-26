// Cómo se muestran en la web los campos del paciente (paso 3): agrupados y con una etiqueta clara.
//
// Los nombres ("dni", "perro"…) son los de contenido/ (D69). Las etiquetas salen de las palabras
// del propio documento. "{titular}" se cambia por "responsable legal" o "tutor/a" según la versión.
// Si en contenido/ aparece un campo que no está aquí, la web lo muestra igualmente en
// "Otros datos", con el texto de alrededor como etiqueta (así un cambio de texto no rompe nada).

/** Una casilla dentro de un grupo de casillas. */
export interface OpcionCasilla {
  campo: string;
  etiqueta: string;
}

export type Fila =
  /** Hueco para escribir. `ancho`: corto (sexo, peso…), normal o largo (recuadro de varias líneas). */
  | { tipo: 'texto'; campo: string; etiqueta: string; ancho?: 'corto' | 'normal'; ayuda?: string }
  | { tipo: 'largo'; campo: string; etiqueta: string; ayuda?: string }
  /** Varias casillas que van juntas, con un hueco opcional al lado de alguna (por ejemplo, "Sí: ___"). */
  | { tipo: 'casillas'; etiqueta: string; opciones: OpcionCasilla[]; textos?: { campo: string; etiqueta: string }[] }
  /** La tabla de pruebas: una fila por prueba y una casilla por columna. */
  | {
      tipo: 'tabla';
      etiqueta: string;
      columnas: string[];
      filas: { etiqueta: string; campos: string[]; campoTexto?: string }[];
    };

export interface Grupo {
  titulo: string;
  filas: Fila[];
}

const prueba = (etiqueta: string, base: string, campoTexto?: string) => ({
  etiqueta,
  campos: [`${base}-recomendada`, `${base}-acepta`, `${base}-rechaza`],
  campoTexto,
});

export const GRUPOS: Grupo[] = [
  {
    titulo: 'El {titular} y el paciente',
    filas: [
      { tipo: 'texto', campo: 'titular', etiqueta: '{Titular}: nombre y apellidos' },
      { tipo: 'texto', campo: 'dni', etiqueta: 'DNI/NIE', ancho: 'corto' },
      { tipo: 'texto', campo: 'telefono', etiqueta: 'Teléfono de contacto el día del procedimiento', ancho: 'corto' },
      { tipo: 'texto', campo: 'paciente', etiqueta: 'Nombre del paciente' },
      {
        tipo: 'casillas',
        etiqueta: 'Especie',
        opciones: [
          { campo: 'perro', etiqueta: 'Perro' },
          { campo: 'gato', etiqueta: 'Gato' },
        ],
      },
      { tipo: 'texto', campo: 'raza', etiqueta: 'Raza' },
      { tipo: 'texto', campo: 'sexo', etiqueta: 'Sexo', ancho: 'corto' },
      { tipo: 'texto', campo: 'edad', etiqueta: 'Edad', ancho: 'corto' },
      { tipo: 'texto', campo: 'peso', etiqueta: 'Peso actual (kg)', ancho: 'corto' },
      { tipo: 'texto', campo: 'microchip', etiqueta: 'Microchip', ancho: 'corto' },
    ],
  },
  {
    titulo: 'El procedimiento y la anestesia',
    filas: [
      { tipo: 'texto', campo: 'procedimiento', etiqueta: 'Procedimiento previsto' },
      {
        tipo: 'casillas',
        etiqueta: 'Tipo de anestesia prevista',
        opciones: [
          { campo: 'anestesia-sedacion', etiqueta: 'Sedación' },
          { campo: 'anestesia-inhalatoria', etiqueta: 'General inhalatoria' },
          { campo: 'anestesia-tiva', etiqueta: 'General intravenosa (TIVA)' },
          { campo: 'anestesia-locorregional', etiqueta: 'Locorregional' },
          { campo: 'anestesia-combinada', etiqueta: 'Combinada' },
        ],
      },
      {
        tipo: 'casillas',
        etiqueta: 'Clasificación ASA asignada',
        opciones: [
          { campo: 'asa-1', etiqueta: 'I' },
          { campo: 'asa-2', etiqueta: 'II' },
          { campo: 'asa-3', etiqueta: 'III' },
          { campo: 'asa-4', etiqueta: 'IV' },
          { campo: 'asa-5', etiqueta: 'V' },
          { campo: 'asa-urgencia', etiqueta: 'Urgencia (E)' },
        ],
      },
      { tipo: 'largo', campo: 'riesgos', etiqueta: 'Riesgos particulares de este paciente' },
      { tipo: 'texto', campo: 'veterinario', etiqueta: 'Veterinario/a responsable y n.º de colegiado/a' },
      { tipo: 'texto', campo: 'fecha-entrega', etiqueta: 'Fecha y hora de entrega de este documento', ancho: 'corto' },
    ],
  },
  {
    titulo: 'Pruebas preanestésicas',
    filas: [
      {
        tipo: 'tabla',
        etiqueta: 'Pruebas preanestésicas',
        columnas: ['Recomendada', 'Acepta', 'Rechaza'],
        filas: [
          prueba('Análisis de sangre (hemograma y bioquímica)', 'analitica'),
          prueba('Electrocardiograma', 'ecg'),
          prueba('Medición de la presión arterial', 'presion'),
          prueba('Radiografía de tórax', 'rx-torax'),
          prueba('Ecocardiografía / valoración cardiológica', 'cardio'),
          prueba('Pruebas de coagulación', 'coagulacion'),
          prueba('Otras', 'otras', 'otras-pruebas'),
        ],
      },
    ],
  },
  {
    titulo: 'Anestesias previas y medicación',
    filas: [
      {
        tipo: 'casillas',
        etiqueta: '¿Ha tenido alguna anestesia antes?',
        opciones: [
          { campo: 'anestesia-previa-no', etiqueta: 'No' },
          { campo: 'anestesia-previa-sin-incidencias', etiqueta: 'Sí, sin incidencias' },
          { campo: 'anestesia-previa-con-incidencias', etiqueta: 'Sí, con incidencias' },
        ],
        textos: [{ campo: 'anestesia-previa-incidencias', etiqueta: 'Incidencias' }],
      },
      {
        tipo: 'casillas',
        etiqueta: '¿Toma medicación actualmente?',
        opciones: [
          { campo: 'medicacion-no', etiqueta: 'No' },
          { campo: 'medicacion-si', etiqueta: 'Sí' },
        ],
        textos: [{ campo: 'medicacion-cual', etiqueta: 'Qué medicación' }],
      },
    ],
  },
  {
    titulo: 'Alternativas y decisiones del {titular}',
    filas: [
      { tipo: 'largo', campo: 'alternativas', etiqueta: 'Alternativas comentadas' },
      { tipo: 'largo', campo: 'consecuencias', etiqueta: 'Consecuencias de no realizar el procedimiento' },
      {
        tipo: 'casillas',
        etiqueta: 'Ampliación del procedimiento si no se localiza al {titular}',
        opciones: [
          { campo: 'ampliacion-autoriza', etiqueta: 'Autoriza ampliar hasta un importe adicional' },
          { campo: 'ampliacion-no-autoriza', etiqueta: 'No autoriza ampliaciones sin consultarle' },
        ],
        textos: [{ campo: 'ampliacion-importe', etiqueta: 'Importe adicional (€)' }],
      },
      {
        tipo: 'casillas',
        etiqueta: 'Reanimación cardiopulmonar',
        opciones: [
          { campo: 'rcp-autoriza', etiqueta: 'Autoriza maniobras de reanimación' },
          { campo: 'rcp-no-autoriza', etiqueta: 'No desea maniobras de reanimación' },
        ],
      },
      { tipo: 'texto', campo: 'presupuesto', etiqueta: 'N.º de presupuesto', ancho: 'corto' },
    ],
  },
  {
    titulo: 'Declaración y firmas',
    filas: [
      {
        tipo: 'largo',
        campo: 'preguntas',
        etiqueta: 'Preguntas planteadas por el {titular} y respuestas del veterinario',
      },
      // Por parejas en la misma línea (campos cortos): nombre y colegiado, fecha y hora de cada firma.
      { tipo: 'texto', campo: 'veterinario-nombre', etiqueta: 'Nombre del veterinario/a que firma', ancho: 'corto' },
      { tipo: 'texto', campo: 'veterinario-colegiado', etiqueta: 'N.º de colegiado/a', ancho: 'corto' },
      { tipo: 'texto', campo: 'fecha-firma-titular', etiqueta: 'Fecha de la firma del {titular}', ancho: 'corto' },
      { tipo: 'texto', campo: 'hora-firma-titular', etiqueta: 'Hora de la firma del {titular}', ancho: 'corto' },
      { tipo: 'texto', campo: 'fecha-firma-veterinario', etiqueta: 'Fecha de la firma del veterinario/a', ancho: 'corto' },
      { tipo: 'texto', campo: 'hora-firma-veterinario', etiqueta: 'Hora de la firma del veterinario/a', ancho: 'corto' },
      {
        tipo: 'casillas',
        etiqueta: 'Firma en representación',
        opciones: [
          {
            campo: 'representacion',
            etiqueta: 'Firma en representación del {titular} (se adjunta autorización y copia del DNI de ambos)',
          },
        ],
      },
      { tipo: 'texto', campo: 'revocacion-fecha-hora', etiqueta: 'Revocación: fecha y hora' },
    ],
  },
];

/**
 * Casillas excluyentes en la web (pedido por Sira): dentro de cada lista solo puede haber una
 * marcada; al marcar otra, la anterior se desmarca sola. Volver a hacer clic en la marcada la
 * desmarca, así la pregunta puede quedar en blanco. En el Word las casillas siguen siendo libres.
 * - ASA: solo del I al V. La «Urgencia (E)» se añade al grado, así que va aparte.
 * - Pruebas: «Acepta» y «Rechaza» no a la vez; «Recomendada» va aparte.
 */
export const EXCLUYENTES: string[][] = [
  ['perro', 'gato'],
  ['asa-1', 'asa-2', 'asa-3', 'asa-4', 'asa-5'],
  ...['analitica', 'ecg', 'presion', 'rx-torax', 'cardio', 'coagulacion', 'otras'].map((p) => [
    `${p}-acepta`,
    `${p}-rechaza`,
  ]),
  ['anestesia-previa-no', 'anestesia-previa-sin-incidencias', 'anestesia-previa-con-incidencias'],
  ['medicacion-no', 'medicacion-si'],
  ['ampliacion-autoriza', 'ampliacion-no-autoriza'],
  ['rcp-autoriza', 'rcp-no-autoriza'],
];

/** Las casillas que se desmarcan al marcar `campo` (vacío si no es excluyente). */
export function excluyentesDe(campo: string): string[] {
  return EXCLUYENTES.filter((g) => g.includes(campo)).flatMap((g) => g.filter((c) => c !== campo));
}

/** Todos los nombres de campo que aparecen en GRUPOS. */
export function camposDeFila(f: Fila): string[] {
  switch (f.tipo) {
    case 'texto':
    case 'largo':
      return [f.campo];
    case 'casillas':
      return [...f.opciones.map((o) => o.campo), ...(f.textos ?? []).map((t) => t.campo)];
    case 'tabla':
      return f.filas.flatMap((r) => [...(r.campoTexto ? [r.campoTexto] : []), ...r.campos]);
  }
}

/**
 * Cambia "{titular}" / "{Titular}" por la palabra de la versión elegida. En la web se dice
 * "responsable legal" (neutra) o "tutor/a" (cálida), como en los documentos; nunca "titular" (Sira).
 */
export function conTitular(texto: string, variante: 'neutra' | 'calida'): string {
  const palabra = variante === 'calida' ? 'tutor/a' : 'responsable legal';
  return texto
    .replaceAll('{titular}', palabra)
    .replaceAll('{Titular}', palabra[0].toUpperCase() + palabra.slice(1));
}
