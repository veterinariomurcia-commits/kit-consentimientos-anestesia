// Paso 1 · La clínica: datos, logo, color y versión del lenguaje.

import type { DatosClinica } from '../contenido/tipos.ts';
import { contraste, normalizarColor } from '../generador/color.ts';
import { detectarTipo, ErrorImagen, leerMedidas, type Logo } from '../generador/imagen.ts';
import type { Variante } from './contenidos.ts';
import { crear, porId } from './dom.ts';
import { avisarCambio, estado } from './estado.ts';

/** Tamaño máximo del logo: 2 MB (aprobado por Sira). */
export const LOGO_MAXIMO_BYTES = 2 * 1024 * 1024;

/** Los 6 colores sugeridos (opción A, aprobada por Sira). Todos se leen bien con texto blanco. */
export const COLORES = [
  { nombre: 'Azul petróleo', valor: '#2E6A80' },
  { nombre: 'Verde bosque', valor: '#2F6B4F' },
  { nombre: 'Azul marino', valor: '#2B4C7E' },
  { nombre: 'Granate', valor: '#8A2E3B' },
  { nombre: 'Morado', valor: '#5B4A8A' },
  { nombre: 'Gris pizarra', valor: '#4A5562' },
];

/** Campos del formulario, en el orden de la página. */
export const CAMPOS_CLINICA: (keyof DatosClinica)[] = [
  'nombreClinica',
  'razonSocial',
  'cif',
  'direccion',
  'localidad',
  'telefonos',
  'email',
  'emailPrivacidad',
  'web',
];

/** Los obligatorios, con el nombre que se muestra en los avisos. */
export const OBLIGATORIOS: Partial<Record<keyof DatosClinica, string>> = {
  nombreClinica: 'Nombre comercial',
  direccion: 'Dirección completa',
  localidad: 'Localidad para las firmas',
  telefonos: 'Teléfonos de contacto',
  email: 'Correo de contacto',
};

const entrada = (campo: keyof DatosClinica) => porId<HTMLInputElement>(campo);

/** Pone en la página lo que hay en `estado` (al recuperar los datos recordados). */
export function mostrarClinica(): void {
  for (const c of CAMPOS_CLINICA) entrada(c).value = estado.clinica[c];
  mostrarLogo();
  marcarColor();
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="variante"]')) {
    r.checked = r.value === estado.variante;
  }
}

export function iniciarPasoClinica(): void {
  // Datos de la clínica.
  for (const c of CAMPOS_CLINICA) {
    entrada(c).addEventListener('input', () => {
      estado.clinica[c] = entrada(c).value;
      entrada(c).removeAttribute('aria-invalid');
      avisarCambio();
    });
  }

  // Logo.
  const archivo = porId<HTMLInputElement>('logo-archivo');
  archivo.addEventListener('change', async () => {
    const f = archivo.files?.[0];
    archivo.value = ''; // Así se puede volver a elegir el mismo archivo.
    if (f) await cargarLogo(f);
  });
  porId('logo-quitar').addEventListener('click', () => {
    estado.logo = null;
    ocultarErrorLogo();
    mostrarLogo();
    avisarCambio();
    archivo.focus();
  });

  // Color.
  pintarColores();

  // Versión.
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="variante"]')) {
    r.addEventListener('change', () => {
      if (r.checked) {
        estado.variante = r.value as Variante;
        avisarCambio();
      }
    });
  }
}

// --- Logo ---

function tamanoLegible(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) return `${mb.toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function cargarLogo(f: File): Promise<void> {
  ocultarErrorLogo();
  if (f.size > LOGO_MAXIMO_BYTES) {
    errorLogo(
      `Tu logo pesa ${tamanoLegible(f.size)} y el máximo es 2 MB. No es un fallo de la herramienta: ` +
        'el límite es para que el Word no pese demasiado. Prueba con una versión más ligera ' +
        '(por ejemplo, la que usas en tu web o en redes sociales).',
    );
    return;
  }
  const datos = new Uint8Array(await f.arrayBuffer());
  try {
    const tipo = detectarTipo(datos);
    leerMedidas(datos); // Comprueba que la imagen se puede leer.
    estado.logo = { datos, tipo };
  } catch (e) {
    if (!(e instanceof ErrorImagen)) throw e;
    errorLogo(
      `No hemos podido usar «${f.name}». ${e.message} Si tu logo está en otro formato (SVG, PDF, WEBP…), ` +
        'guárdalo antes como PNG o JPG.',
    );
    return;
  }
  mostrarLogo();
  avisarCambio();
}

function errorLogo(texto: string): void {
  const p = porId('logo-error');
  p.textContent = texto;
  p.hidden = false;
}

function ocultarErrorLogo(): void {
  porId('logo-error').hidden = true;
}

let urlLogo: string | null = null;

/** Dirección interna para mostrar el logo en la página (no sale del navegador). */
export function urlDeLogo(logo: Logo): string {
  if (urlLogo) URL.revokeObjectURL(urlLogo);
  const tipo = logo.tipo === 'png' ? 'image/png' : 'image/jpeg';
  urlLogo = URL.createObjectURL(new Blob([logo.datos as BlobPart], { type: tipo }));
  return urlLogo;
}

function mostrarLogo(): void {
  const vista = porId('logo-vista');
  vista.replaceChildren(
    estado.logo
      ? crear('img', { src: urlDeLogo(estado.logo), alt: 'Vista previa de tu logo' })
      : crear('span', { class: 'logo__vacio' }, 'Sin logo'),
  );
  porId('logo-quitar').hidden = !estado.logo;
  porId('logo-archivo').previousElementSibling!.textContent = estado.logo ? 'Cambiar imagen…' : 'Elegir imagen…';
}

// --- Color ---

const ID_PERSONALIZADO = 'color-personalizado';

function pintarColores(): void {
  const caja = porId('colores');
  for (const c of COLORES) {
    const id = `color-${c.valor.slice(1)}`;
    caja.append(
      crear(
        'label',
        { class: 'color', for: id },
        crear('input', { type: 'radio', name: 'color', id, value: c.valor }),
        crear('span', { class: 'color__muestra', style: `background:${c.valor}`, 'aria-hidden': 'true' }),
        crear('span', { class: 'color__nombre' }, c.nombre),
      ),
    );
  }
  // Color personalizado: el selector de color del propio navegador.
  const selector = crear('input', {
    type: 'color',
    id: 'color-selector',
    value: estado.color,
    'aria-label': 'Elegir otro color',
  });
  caja.append(
    crear(
      'label',
      { class: 'color color--otro', for: ID_PERSONALIZADO },
      crear('input', { type: 'radio', name: 'color', id: ID_PERSONALIZADO, value: 'otro' }),
      crear('span', { class: 'color__muestra color__muestra--otro', 'aria-hidden': 'true' }),
      crear('span', { class: 'color__nombre' }, 'Otro color'),
    ),
    crear('div', { class: 'color__selector', id: 'color-selector-caja', hidden: true }, selector),
  );

  for (const r of caja.querySelectorAll<HTMLInputElement>('input[name="color"]')) {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      if (r.value === 'otro') {
        porId('color-selector-caja').hidden = false;
        cambiarColor(selector.value);
      } else {
        porId('color-selector-caja').hidden = true;
        cambiarColor(r.value);
      }
    });
  }
  // Mientras se arrastra por el selector ("input"), solo se pinta el circulito de "Otro color":
  // si la página cambia de tamaño o de forma (por ejemplo, al aparecer el aviso de color claro),
  // el navegador cierra el selector a medio elegir. El resto se hace al soltar ("change").
  const muestraOtro = () => porId(ID_PERSONALIZADO).parentElement!.querySelector<HTMLElement>('.color__muestra--otro')!;
  selector.addEventListener('input', () => {
    muestraOtro().style.background = selector.value;
  });
  selector.addEventListener('change', () => {
    porId<HTMLInputElement>(ID_PERSONALIZADO).checked = true;
    cambiarColor(selector.value);
  });
  marcarColor();
}

function cambiarColor(color: string): void {
  estado.color = `#${normalizarColor(color)}`;
  revisarContraste();
  // El circulito de "Otro color" muestra el color personalizado mientras esté elegido.
  const otro = porId<HTMLInputElement>(ID_PERSONALIZADO);
  otro.parentElement!.querySelector<HTMLElement>('.color__muestra--otro')!.style.background = otro.checked
    ? estado.color
    : '';
  avisarCambio();
}

/** Marca en la página el color que hay en `estado`. */
function marcarColor(): void {
  const sugerido = COLORES.find((c) => c.valor.toUpperCase() === estado.color.toUpperCase());
  const id = sugerido ? `color-${sugerido.valor.slice(1)}` : ID_PERSONALIZADO;
  porId<HTMLInputElement>(id).checked = true;
  porId('color-selector-caja').hidden = Boolean(sugerido);
  if (!sugerido) {
    porId<HTMLInputElement>('color-selector').value = estado.color.toLowerCase();
    porId(ID_PERSONALIZADO).parentElement!.querySelector<HTMLElement>('.color__muestra--otro')!.style.background =
      estado.color;
  }
  revisarContraste();
}

/**
 * Un color muy claro se lee mal en los títulos, sobre el fondo blanco (pendiente de la T3).
 * Se avisa, pero se deja usar: la cabecera de las tablas ya cambia sola a texto oscuro (D29).
 */
function revisarContraste(): void {
  const aviso = porId('color-aviso');
  const c = contraste('FFFFFF', normalizarColor(estado.color));
  aviso.hidden = c >= 4.5;
  aviso.textContent =
    c >= 4.5
      ? ''
      : 'Este color es bastante claro: los títulos del documento se leerán peor sobre el fondo blanco. ' +
        'Te recomendamos un tono más oscuro. Si lo prefieres, puedes usarlo igualmente.';
}
