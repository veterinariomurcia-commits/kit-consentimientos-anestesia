// Sustitución de las {{VARIABLES}} por los datos de la clínica.
//
// Reglas (ver CLAUDE.md y la decisión D8):
//   - RAZON_SOCIAL vacía → se usa el nombre comercial.
//   - EMAIL_PRIVACIDAD vacío → se usa el correo general.
//   - Cualquier dato que siga vacío → hueco entre corchetes, por ejemplo "[CIF]",
//     marcado como vacío para que el generador lo resalte en amarillo.

import type { DatosClinica, Variable } from './tipos.ts';

interface ReglaVariable {
  /** Campo del formulario del que sale el dato. */
  campo: keyof DatosClinica;
  /** Campo de reserva si el principal está vacío. */
  reserva?: keyof DatosClinica;
  /** Texto del hueco si el dato falta. */
  hueco: string;
}

const REGLAS: Record<Variable, ReglaVariable> = {
  NOMBRE_CLINICA: { campo: 'nombreClinica', hueco: 'Nombre de la clínica' },
  RAZON_SOCIAL: { campo: 'razonSocial', reserva: 'nombreClinica', hueco: 'Razón social' },
  CIF: { campo: 'cif', hueco: 'CIF' },
  DIRECCION: { campo: 'direccion', hueco: 'Dirección' },
  LOCALIDAD: { campo: 'localidad', hueco: 'Localidad' },
  TELEFONOS: { campo: 'telefonos', hueco: 'Teléfonos' },
  EMAIL: { campo: 'email', hueco: 'Correo electrónico' },
  EMAIL_PRIVACIDAD: { campo: 'emailPrivacidad', reserva: 'email', hueco: 'Correo de protección de datos' },
  WEB: { campo: 'web', hueco: 'Web' },
};

/** Datos con todos los campos vacíos (útil para la muestra de huecos). */
export const DATOS_VACIOS: DatosClinica = {
  nombreClinica: '',
  razonSocial: '',
  cif: '',
  direccion: '',
  localidad: '',
  telefonos: '',
  email: '',
  emailPrivacidad: '',
  web: '',
};

/** Devuelve el texto que va en lugar de la variable y si es un hueco vacío. */
export function resolverVariable(
  variable: Variable,
  datos: DatosClinica,
): { texto: string; vacio: boolean } {
  const regla = REGLAS[variable];
  const valor = (datos[regla.campo] ?? '').trim() || (regla.reserva ? (datos[regla.reserva] ?? '').trim() : '');
  if (valor) return { texto: valor, vacio: false };
  return { texto: `[${regla.hueco}]`, vacio: true };
}
