// Paciente y titular ficticios para las muestras del consentimiento con datos (T7).
// Todos los datos son inventados (el DNI y el microchip son de ejemplo, no reales).
// Hay campos rellenos de todas las clases (huecos cortos, líneas, recuadros y casillas) y otros
// a propósito vacíos (la revocación, la firma en representación…), para ver las dos cosas juntas.

import type { DatosPaciente } from '../contenido/tipos.ts';

export const PACIENTE_EJEMPLO: DatosPaciente = {
  // Apartado 1 · Datos de identificación
  titular: 'María Ejemplo Ejemplo',
  dni: '00000000T',
  telefono: '600 000 002',
  paciente: 'Luna',
  gato: true,
  raza: 'Común europeo',
  sexo: 'Hembra',
  edad: '3 años',
  peso: '4,2',
  microchip: '000000000000000',
  procedimiento: 'Esterilización (ovariohisterectomía)',
  'anestesia-inhalatoria': true,
  'anestesia-locorregional': true,
  'asa-1': true,
  riesgos: 'Ninguno destacable en la exploración.\nCarácter nervioso en la consulta.',
  veterinario: 'Laura Ejemplo · Col. n.º 0000',
  'fecha-entrega': '20/11/2026, 10:30',

  // Apartado 5 · Pruebas preanestésicas
  'analitica-recomendada': true,
  'analitica-acepta': true,
  'presion-recomendada': true,
  'presion-acepta': true,

  // Apartado 6 · Colaboración
  'anestesia-previa-no': true,
  'medicacion-si': true,
  'medicacion-cual': 'Antiparasitario externo (pipeta mensual)',

  // Apartado 7 · Alternativas y decisiones
  alternativas: 'Aplazar el procedimiento. Tratamiento médico del celo.',
  consecuencias: 'Celos repetidos y posibilidad de gestación no deseada.',
  'ampliacion-autoriza': true,
  'ampliacion-importe': '150',
  'rcp-autoriza': true,
  presupuesto: '2026-0153',

  // Apartado 8 · Declaración y firmas
  preguntas:
    '¿Cuánto tiempo estará en la clínica? — Ingresa a las 9:00 y, si todo va bien, se va a casa por la tarde.\n' +
    '¿Podrá comer esa noche? — Sí, una cantidad pequeña de su comida habitual.',
  'veterinario-nombre': 'Laura Ejemplo',
  'veterinario-colegiado': '0000',
  'fecha-firma-titular': '20/11/2026',
  'hora-firma-titular': '10:45',
  'fecha-firma-veterinario': '20/11/2026',
  'hora-firma-veterinario': '10:45',
};
