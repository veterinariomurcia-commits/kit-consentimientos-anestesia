// Vista previa (T9): dibuja en la propia página, con HTML, cómo quedará cada documento.
//
// Es aproximada (D61): un navegador no coloca el texto como Word, así que no se sabe dónde corta
// Word cada página. Se dibuja un "folio" por cada salto de página que ponen los textos.
//
// Recorre el mismo Documento que el generador de Word (prepararDocumento, en paso-descarga.ts):
// mismos apartados quitados, misma numeración, mismos huecos amarillos y mismos datos del
// paciente. Las medidas siguen las del Word (generador.ts, estilos.ts y formulario.ts), en puntos.
// Los datos del paciente solo se dibujan aquí: no se guardan en ningún sitio (D60).

import type { Bloque, DatosClinica, Documento, Linea, Variable } from '../contenido/tipos.ts';
import { resolverVariable } from '../contenido/variables.ts';
import { crearPaleta, FONDO_CAMPO, GRIS, GRIS_BORDE, TEXTO_OSCURO } from '../generador/color.ts';
import {
  CASILLA,
  CASILLA_MARCADA,
  esSolo,
  firmaSola,
  partirPorFirma,
  soloCasillas,
  tieneFirma,
  valorDe,
  type Segmento,
} from '../generador/formulario.ts';
import { VERSION_MODELO } from '../generador/generador.ts';
import { encajar, leerMedidas, type Logo } from '../generador/imagen.ts';
import type { TipoDocumento } from './contenidos.ts';
import { crear, porId } from './dom.ts';
import { alCambiar, estado } from './estado.ts';
import { prepararDocumento } from './paso-descarga.ts';

const TIPOS: TipoDocumento[] = ['consentimiento', 'informacion'];

/** Espera tras el último cambio antes de volver a dibujar, para no ir a tirones al escribir. */
const ESPERA_MS = 200;

/** Logo como mucho de 5 cm × 2,4 cm (D28, D53), en puntos. */
const LOGO_MAXIMO_PT = { ancho: 141.7, alto: 68 };

let activo: TipoDocumento = 'consentimiento';
let temporizador: ReturnType<typeof setTimeout> | undefined;

export function iniciarVistaPrevia(): void {
  const pestanas = TIPOS.map((t) => porId<HTMLButtonElement>(`pestana-${t}`));
  pestanas.forEach((p, i) => {
    p.addEventListener('click', () => elegir(TIPOS[i]));
    // Teclado de las pestañas: flechas, Inicio y Fin (pauta de accesibilidad de WAI-ARIA).
    p.addEventListener('keydown', (ev) => {
      const destino =
        ev.key === 'ArrowRight' ? (i + 1) % TIPOS.length
        : ev.key === 'ArrowLeft' ? (i - 1 + TIPOS.length) % TIPOS.length
        : ev.key === 'Home' ? 0
        : ev.key === 'End' ? TIPOS.length - 1
        : null;
      if (destino === null) return;
      ev.preventDefault();
      elegir(TIPOS[destino]);
      pestanas[destino].focus();
    });
  });
  alCambiar(() => {
    clearTimeout(temporizador);
    temporizador = setTimeout(dibujar, ESPERA_MS);
  });
  dibujar();
}

function elegir(tipo: TipoDocumento): void {
  if (tipo === activo) return;
  activo = tipo;
  for (const t of TIPOS) {
    const p = porId(`pestana-${t}`);
    p.setAttribute('aria-selected', String(t === activo));
    p.tabIndex = t === activo ? 0 : -1;
  }
  porId('vista-previa').setAttribute('aria-labelledby', `pestana-${activo}`);
  porId('vista-previa').scrollTop = 0;
  dibujar();
}

function dibujar(): void {
  clearTimeout(temporizador);
  const panel = porId('vista-previa');
  try {
    const doc = prepararDocumento(activo);
    panel.replaceChildren(dibujarDocumento(doc));
  } catch (e) {
    console.error(e);
    panel.replaceChildren(
      crear(
        'p',
        { class: 'mensaje mensaje--error' },
        `No se ha podido dibujar la vista previa. Detalle: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}

// --- Documento y folios ---

function dibujarDocumento(doc: Documento): HTMLElement {
  const paleta = crearPaleta(estado.color);
  const hojas = crear('div', { class: 'vp-hojas' });
  hojas.style.setProperty('--vp-principal', `#${paleta.principal}`);
  hojas.style.setProperty('--vp-suave', `#${paleta.fondoSuave}`);
  hojas.style.setProperty('--vp-filas', `#${paleta.fondoFilas}`);
  hojas.style.setProperty('--vp-sobre', `#${paleta.textoSobrePrincipal}`);
  hojas.style.setProperty('--vp-texto', `#${TEXTO_OSCURO}`);
  hojas.style.setProperty('--vp-gris', `#${GRIS}`);
  hojas.style.setProperty('--vp-gris-borde', `#${GRIS_BORDE}`);
  hojas.style.setProperty('--vp-campo', `#${FONDO_CAMPO}`);

  // Cada salto de página empieza un folio nuevo.
  const trozos: Bloque[][] = [[]];
  for (const b of doc.bloques) {
    if (b.tipo === 'salto-de-pagina') {
      if (trozos[trozos.length - 1].length > 0) trozos.push([]);
    } else {
      trozos[trozos.length - 1].push(b);
    }
  }

  const pie = `${doc.cabecera.pie} · Modelo ${VERSION_MODELO}`;
  trozos.forEach((bloques, i) => {
    const cuerpo = crear('div', { class: 'vp-cuerpo' });
    if (i === 0) {
      cuerpo.append(
        cabeceraClinica(estado.clinica, estado.logo),
        crear('p', { class: 'vp-titulo' }, doc.cabecera.titulo),
        crear('p', { class: 'vp-subtitulo' }, doc.cabecera.subtitulo),
      );
    } else {
      // Desde el segundo folio, solo el nombre de la clínica arriba (D47).
      cuerpo.append(crear('p', { class: 'vp-encabezado' }, dato('NOMBRE_CLINICA', estado.clinica)));
    }
    cuerpo.append(...dibujarBloques(bloques, false));
    hojas.append(
      crear('div', { class: 'vp-hoja' }, cuerpo, crear('p', { class: 'vp-pie' }, pie)),
    );
  });
  return hojas;
}

// --- Cabecera de la clínica ---

/** Un dato de la clínica (en amarillo si falta). */
function dato(variable: Variable, datos: DatosClinica): Node {
  const r = resolverVariable(variable, datos);
  return r.vacio ? crear('mark', { class: 'vp-pendiente' }, r.texto) : document.createTextNode(r.texto);
}

/** Igual que la cabecera del Word (generador.ts, D27): logo a la izquierda y datos a la derecha. */
function cabeceraClinica(datos: DatosClinica, logo: Logo | null): HTMLElement {
  const lleno = (s: string) => s.trim() !== '';
  const contacto: Node[] = [dato('EMAIL', datos)];
  if (lleno(datos.web)) contacto.push(document.createTextNode(' · '), dato('WEB', datos));
  const legal: Node[] = [];
  if (lleno(datos.razonSocial) && datos.razonSocial.trim() !== datos.nombreClinica.trim()) {
    legal.push(dato('RAZON_SOCIAL', datos), document.createTextNode(' · '));
  }
  if (lleno(datos.cif)) legal.push(document.createTextNode('CIF '));
  legal.push(dato('CIF', datos));
  const telefonos: Node[] = lleno(datos.telefonos)
    ? [document.createTextNode('Tel. '), dato('TELEFONOS', datos)]
    : [dato('TELEFONOS', datos)];

  return crear(
    'div',
    { class: 'vp-cabecera' },
    crear('div', { class: 'vp-cabecera__logo' }, imagenLogo(logo)),
    crear(
      'div',
      { class: 'vp-cabecera__datos' },
      crear('p', { class: 'vp-nombre-clinica' }, dato('NOMBRE_CLINICA', datos)),
      crear('p', {}, dato('DIRECCION', datos)),
      crear('p', {}, ...telefonos),
      crear('p', {}, ...contacto),
      crear('p', {}, ...legal),
    ),
  );
}

// El logo se convierte en una dirección interna del navegador (blob:) solo una vez por logo.
let logoDeLaUrl: Logo | null = null;
let urlLogo: string | null = null;

function imagenLogo(logo: Logo | null): HTMLElement | null {
  if (logo !== logoDeLaUrl) {
    if (urlLogo) URL.revokeObjectURL(urlLogo);
    logoDeLaUrl = logo;
    urlLogo = logo
      ? URL.createObjectURL(new Blob([logo.datos as BlobPart], { type: logo.tipo === 'png' ? 'image/png' : 'image/jpeg' }))
      : null;
  }
  if (!logo || !urlLogo) return null;
  const m = encajar(leerMedidas(logo.datos), LOGO_MAXIMO_PT);
  const img = crear('img', { src: urlLogo, alt: 'Logo de la clínica' });
  img.style.width = `calc(${m.ancho} * var(--pt))`;
  img.style.height = `calc(${m.alto} * var(--pt))`;
  return img;
}

// --- Bloques ---

function dibujarBloques(bloques: Bloque[], enNota: boolean): HTMLElement[] {
  return bloques.flatMap((b) => dibujarBloque(b, enNota));
}

function dibujarBloque(b: Bloque, enNota: boolean): HTMLElement[] {
  switch (b.tipo) {
    case 'titulo1':
      return [crear('p', { class: 'vp-t1' }, ...dibujarLinea(b.contenido))];
    case 'titulo2':
      return [crear('p', { class: 'vp-t2' }, ...dibujarLinea(b.contenido))];
    case 'parrafo':
      if (esSolo(b.contenido, 'caja')) return [caja('vp-caja', valorDe(b.contenido))];
      if (esSolo(b.contenido, 'caja-grande')) return [caja('vp-caja vp-caja--grande', valorDe(b.contenido))];
      if (tieneFirma(b.contenido)) return [lineaFirma(b.contenido)];
      return [crear('p', { class: 'vp-p' }, ...dibujarLinea(b.contenido))];
    case 'lista':
      return [
        crear(
          b.numerada ? 'ol' : 'ul',
          { class: enNota ? 'vp-lista vp-lista--nota' : 'vp-lista' },
          ...b.elementos.map((e) => crear('li', {}, ...dibujarLinea(e))),
        ),
      ];
    case 'tabla':
      return [tabla(b)];
    case 'tabla-datos':
      return [tablaDatos(b)];
    case 'destacado':
      return [crear('div', { class: 'vp-destacado' }, ...dibujarBloques(b.bloques, false))];
    case 'nota':
      return [crear('div', { class: 'vp-nota' }, ...dibujarBloques(b.bloques, true))];
    case 'letra-pequena':
      return [crear('div', { class: 'vp-letra-pequena' }, ...dibujarBloques(b.bloques, true))];
    case 'firma':
      return dibujarBloques(b.bloques, enNota);
    case 'salto-de-pagina':
      return []; // Ya se ha usado para partir los folios.
  }
}

/** Una línea de texto: texto, datos de la clínica, referencias, casillas y huecos. */
function dibujarLinea(linea: Linea, enCelda = false): Node[] {
  return linea.map((t, i): Node => {
    switch (t.tipo) {
      case 'texto': {
        // "☐ Perro" no se parte en dos líneas (como en el Word): espacio que no se parte (U+00A0).
        const texto = linea[i - 1]?.tipo === 'casilla' && t.texto.startsWith(' ') ? ' ' + t.texto.slice(1) : t.texto;
        return conFormato(document.createTextNode(texto), t.negrita, t.cursiva);
      }
      case 'dato':
        return conFormato(
          t.vacio ? crear('mark', { class: 'vp-pendiente' }, t.texto) : document.createTextNode(t.texto),
          t.negrita,
          t.cursiva,
        );
      case 'referencia':
        return conFormato(
          t.quitado ? crear('mark', { class: 'vp-pendiente' }, t.texto) : document.createTextNode(t.texto),
          t.negrita,
          t.cursiva,
        );
      case 'casilla':
        return crear('span', { class: 'vp-casilla' }, t.marcada ? CASILLA_MARCADA : CASILLA);
      case 'linea-corta':
        return crear('span', { class: enCelda ? 'vp-hueco vp-hueco--corto-celda' : 'vp-hueco vp-hueco--corto' }, t.valor ?? '');
      case 'linea':
        return crear('span', { class: 'vp-hueco vp-hueco--largo' }, t.valor ?? '');
      case 'caja':
      case 'caja-grande':
        return caja(t.tipo === 'caja' ? 'vp-caja' : 'vp-caja vp-caja--grande', t.valor);
      case 'firma':
        return crear('span', { class: 'vp-firma' }, crear('span', { class: 'vp-firma__texto' }, t.texto));
    }
  });
}

function conFormato(n: Node, negrita: boolean, cursiva: boolean): Node {
  let r = n;
  if (cursiva) r = crear('em', {}, r);
  if (negrita) r = crear('strong', {}, r);
  return r;
}

/** Recuadro para escribir; con un dato del paciente, lo lleva dentro. */
function caja(clase: string, valor?: string): HTMLElement {
  return crear('div', { class: clase }, valor ?? '');
}

/** Línea con recuadro de firma: un trozo en cada columna, a partes iguales (crearLineaFirma). */
function lineaFirma(linea: Linea): HTMLElement {
  const segmentos: Segmento[] = partirPorFirma(linea);
  if (segmentos.length === 1) segmentos.push({ tipo: 'texto', linea: [] });
  const fila = crear('div', { class: 'vp-linea-firma' });
  fila.style.gridTemplateColumns = `repeat(${segmentos.length}, minmax(0, 1fr))`;
  for (const s of segmentos) {
    fila.append(
      s.tipo === 'firma'
        ? crear('div', { class: 'vp-firma' }, crear('span', { class: 'vp-firma__texto' }, s.texto))
        : crear('div', { class: 'vp-linea-firma__texto' }, ...dibujarLinea(s.linea, true)),
    );
  }
  return fila;
}

// --- Tablas ---

/** Contenido de una celda, como contenidoCelda del generador. */
function celda(etiqueta: 'td' | 'th', linea: Linea, clases: string[] = []): HTMLTableCellElement {
  const valor = valorDe(linea);
  if (esSolo(linea, 'linea')) {
    return crear(etiqueta, { class: [...clases, 'vp-celda--campo'].join(' ') }, crear('div', { class: 'vp-campo' }, valor ?? ''));
  }
  if (esSolo(linea, 'caja') || esSolo(linea, 'caja-grande')) {
    const grande = esSolo(linea, 'caja-grande');
    return crear(etiqueta, { class: [...clases, 'vp-celda--caja', grande ? 'vp-celda--caja-grande' : ''].join(' ') }, valor ?? '');
  }
  const firma = firmaSola(linea);
  if (firma !== null) {
    return crear(etiqueta, { class: [...clases, 'vp-celda--firma'].join(' ') }, crear('span', { class: 'vp-firma__texto' }, firma));
  }
  if (soloCasillas(linea)) clases = [...clases, 'vp-celda--centro'];
  return crear(etiqueta, { class: clases.join(' ') || undefined }, ...dibujarLinea(linea, true));
}

function tabla(b: Extract<Bloque, { tipo: 'tabla' }>): HTMLElement {
  return crear(
    'table',
    { class: 'vp-tabla' },
    crear('thead', {}, crear('tr', {}, ...b.cabecera.map((l) => crear('th', {}, ...dibujarLinea(l, true))))),
    crear(
      'tbody',
      {},
      ...b.filas.map((fila) =>
        crear(
          'tr',
          {},
          ...b.cabecera.map((_c, c) =>
            celda(b.primeraColumnaEtiquetas && c === 0 ? 'th' : 'td', fila[c] ?? [], b.primeraColumnaEtiquetas && c === 0 ? ['vp-etiqueta'] : []),
          ),
        ),
      ),
    ),
  );
}

/** "::: tabla-datos": etiqueta (38 %) sobre el fondo suave y contenido (62 %). */
function tablaDatos(b: Extract<Bloque, { tipo: 'tabla-datos' }>): HTMLElement {
  return crear(
    'table',
    { class: 'vp-tabla-datos' },
    crear('colgroup', {}, crear('col', { style: 'width:38%' }), crear('col', { style: 'width:62%' })),
    crear(
      'tbody',
      {},
      ...b.filas.map((f) => crear('tr', {}, crear('th', {}, ...dibujarLinea(f.etiqueta, true)), celda('td', f.contenido))),
    ),
  );
}
