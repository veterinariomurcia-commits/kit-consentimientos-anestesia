// Datos de la clínica ficticia que se usan en las muestras y en las comprobaciones.
// Los comparten `npm run contenido` (scripts/ver-contenido.ts) y `npm run muestras` (scripts/muestras.ts).

import type { DatosClinica } from '../contenido/tipos.ts';

export const CLINICA_EJEMPLO: DatosClinica = {
  nombreClinica: 'Clínica Veterinaria Ejemplo',
  razonSocial: 'Ejemplo Veterinaria S.L.',
  cif: 'B00000000',
  direccion: 'Calle Ejemplo 1, 00000 Ciudad Ejemplo',
  localidad: 'Ciudad Ejemplo',
  telefonos: '900 000 000 · WhatsApp 600 000 000',
  email: 'hola@clinica-ejemplo.es',
  emailPrivacidad: '',
  web: 'www.clinica-ejemplo.es',
};
