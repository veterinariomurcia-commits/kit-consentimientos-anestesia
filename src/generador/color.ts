// Cálculos con el color de la clínica.
//
// La clínica elige un solo color. A partir de él se calculan:
//   - el fondo suave (el mismo color muy aclarado, mezclado con blanco),
//   - el color del texto que va encima del color (blanco u oscuro, según el contraste).
//
// Los colores se manejan como en Word: 6 cifras hexadecimales sin "#", por ejemplo "2E6A80".

/** Color provisional de las muestras (azul petróleo sobrio). Ver decisiones.md. */
export const COLOR_POR_DEFECTO = '2E6A80';

/** Texto oscuro del documento (casi negro, más suave que el negro puro). */
export const TEXTO_OSCURO = '262626';

/** Gris de las notas, el subtítulo y el pie. */
export const GRIS = '6B6B6B';

/** Gris claro de los bordes de las tablas y de la línea del pie. */
export const GRIS_BORDE = 'D0D0D0';

/** Fondo gris muy suave de los huecos y cajas para escribir (como los campos de la referencia). */
export const FONDO_CAMPO = 'F3F3F3';

/** Paleta completa que usa el generador. */
export interface Paleta {
  /** Color de la clínica: títulos, viñetas, cabeceras de tabla, línea de la cabecera… */
  principal: string;
  /** Fondo suave de los recuadros destacados y de las etiquetas. */
  fondoSuave: string;
  /** Fondo todavía más suave para las filas alternas de las tablas. */
  fondoFilas: string;
  /** Color del texto que va encima del color principal (cabeceras de tabla). */
  textoSobrePrincipal: string;
}

/**
 * Convierte lo que escriba la clínica ("#2e6a80", "2E6A80", "#abc") al formato de Word ("2E6A80").
 * Si no es un color válido, devuelve el color por defecto.
 */
export function normalizarColor(color: string): string {
  let c = color.trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(c)) c = c.replace(/./g, (x) => x + x);
  return /^[0-9A-F]{6}$/.test(c) ? c : COLOR_POR_DEFECTO;
}

function aRgb(color: string): [number, number, number] {
  const n = parseInt(color, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex(rgb: [number, number, number]): string {
  return rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Mezcla el color con blanco. `proporcion` = cuánto color queda (0,10 = 10 % de color y 90 % de blanco). */
export function aclarar(color: string, proporcion: number): string {
  const [r, g, b] = aRgb(color);
  return aHex([r, g, b].map((v) => 255 - (255 - v) * proporcion) as [number, number, number]);
}

/** Luminosidad relativa según las pautas de accesibilidad WCAG (0 = negro, 1 = blanco). */
function luminosidad(color: string): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = aRgb(color).map(canal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre dos colores según WCAG (de 1 a 21). Para texto normal se pide al menos 4,5. */
export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminosidad(a), luminosidad(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Calcula todos los colores del documento a partir del color elegido por la clínica. */
export function crearPaleta(colorClinica: string): Paleta {
  const principal = normalizarColor(colorClinica);
  return {
    principal,
    fondoSuave: aclarar(principal, 0.1),
    fondoFilas: aclarar(principal, 0.04),
    textoSobrePrincipal: contraste('FFFFFF', principal) >= 4.5 ? 'FFFFFF' : TEXTO_OSCURO,
  };
}
