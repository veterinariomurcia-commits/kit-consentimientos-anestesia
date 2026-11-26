// Paso 3 · El paciente (opcional). Los campos del consentimiento, agrupados y con etiquetas claras.
//
// Los datos solo viven en `estado.paciente`, en memoria: no se guardan en ningún sitio y
// desaparecen al cerrar o recargar la página (D60). El formulario lleva autocomplete="off" para
// que el navegador tampoco los recuerde por su cuenta.

import { elegirApartados } from '../contenido/bloques.ts';
import { listarCampos, type Campo } from '../contenido/campos.ts';
import { crear, porId } from './dom.ts';
import { alCambiar, avisarCambio, estado, estructura } from './estado.ts';
import { camposDeFila, conTitular, excluyentesDe, GRUPOS, type Fila, type Grupo } from './etiquetas-campos.ts';

/** Lo que había la última vez que se pintó: si no cambia, no se vuelve a pintar. */
let pintado = '';

export function iniciarPasoPaciente(): void {
  pintar();
  alCambiar(() => {
    if (claveActual() !== pintado) pintar();
  });
  porId('vaciar-paciente').addEventListener('click', () => {
    estado.paciente = {};
    pintar();
    avisarCambio();
    porId('estado-paciente').textContent = 'Datos del paciente vaciados.';
  });
}

const claveActual = () => `${estado.variante}|${estado.quitados.consentimiento.join(',')}`;

/** Los campos que hay en el consentimiento con los apartados elegidos. */
function camposPresentes(): Campo[] {
  const { documento } = elegirApartados(estructura('consentimiento'), estado.quitados.consentimiento);
  return listarCampos(documento);
}

/** Quita los datos de campos que ya no están (por ejemplo, de un apartado que se ha quitado). */
export function datosPacienteUsables(): typeof estado.paciente {
  const presentes = new Set(camposPresentes().map((c) => c.nombre));
  return Object.fromEntries(Object.entries(estado.paciente).filter(([n]) => presentes.has(n)));
}

function pintar(): void {
  pintado = claveActual();
  const presentes = camposPresentes();
  const nombres = new Set(presentes.map((c) => c.nombre));
  const conocidos = new Set(GRUPOS.flatMap((g) => g.filas.flatMap(camposDeFila)));

  const grupos: Grupo[] = GRUPOS.map((g) => ({
    titulo: g.titulo,
    filas: g.filas.map((f) => filtrar(f, nombres)).filter((f): f is Fila => f !== null),
  }));
  // Campos nuevos de contenido/ que no están en etiquetas-campos.ts.
  const otros = presentes.filter((c) => !conocidos.has(c.nombre));
  if (otros.length > 0) {
    grupos.push({
      titulo: 'Otros datos',
      filas: otros.map((c): Fila =>
        c.clase === 'casilla'
          ? { tipo: 'casillas', etiqueta: c.contexto, opciones: [{ campo: c.nombre, etiqueta: c.contexto }] }
          : c.clase === 'texto-largo'
            ? { tipo: 'largo', campo: c.nombre, etiqueta: c.contexto }
            : { tipo: 'texto', campo: c.nombre, etiqueta: c.contexto, ancho: c.clase === 'texto-corto' ? 'corto' : 'normal' },
      ),
    });
  }

  const visibles = grupos.filter((g) => g.filas.length > 0);
  const caja = porId('campos-paciente');
  caja.replaceChildren(
    ...visibles.map((g, i) => pintarGrupo(g, i === 0)),
    crear('p', { class: 'oculto-visual', id: 'estado-paciente', 'aria-live': 'polite' }),
  );
  if (visibles.length === 0) {
    caja.prepend(crear('p', { class: 'mensaje' }, 'Con los apartados que has elegido, el consentimiento no tiene datos del paciente.'));
  }
}

/** Deja en la fila solo los campos que existen en el documento; si no queda ninguno, null. */
function filtrar(f: Fila, nombres: Set<string>): Fila | null {
  switch (f.tipo) {
    case 'texto':
    case 'largo':
      return nombres.has(f.campo) ? f : null;
    case 'casillas': {
      const opciones = f.opciones.filter((o) => nombres.has(o.campo));
      const textos = (f.textos ?? []).filter((t) => nombres.has(t.campo));
      return opciones.length + textos.length > 0 ? { ...f, opciones, textos } : null;
    }
    case 'tabla': {
      const filas = f.filas.filter((r) => r.campos.some((c) => nombres.has(c)));
      return filas.length > 0 ? { ...f, filas } : null;
    }
  }
}

const t = (texto: string) => conTitular(texto, estado.variante);
const idDe = (campo: string) => `p-${campo}`;

function pintarGrupo(g: Grupo, abierto: boolean): HTMLElement {
  return crear(
    'details',
    { class: 'grupo', open: abierto },
    crear('summary', {}, crear('span', {}, t(g.titulo))),
    crear('div', { class: 'grupo__cuerpo' }, ...g.filas.map(pintarFila)),
  );
}

function entradaTexto(campo: string, largo = false): HTMLInputElement | HTMLTextAreaElement {
  const valor = estado.paciente[campo];
  const el = largo
    ? crear('textarea', { id: idDe(campo), rows: '4' })
    : crear('input', { id: idDe(campo), type: 'text' });
  el.value = typeof valor === 'string' ? valor : '';
  el.addEventListener('input', () => {
    if (el.value.trim() === '') delete estado.paciente[campo];
    else estado.paciente[campo] = el.value;
    avisarCambio();
  });
  return el;
}

function entradaCasilla(campo: string, etiquetaAccesible?: string): HTMLInputElement {
  const el = crear('input', {
    type: 'checkbox',
    id: idDe(campo),
    checked: estado.paciente[campo] === true,
    'aria-label': etiquetaAccesible,
  });
  el.addEventListener('change', () => {
    if (el.checked) {
      estado.paciente[campo] = true;
      // Casillas excluyentes: se desmarcan las otras del mismo grupo.
      for (const otra of excluyentesDe(campo)) {
        delete estado.paciente[otra];
        const casilla = document.getElementById(idDe(otra));
        if (casilla instanceof HTMLInputElement) casilla.checked = false;
      }
    } else {
      delete estado.paciente[campo];
    }
    avisarCambio();
  });
  return el;
}

function pintarFila(f: Fila): HTMLElement {
  switch (f.tipo) {
    case 'texto':
      return crear(
        'div',
        { class: `campo${f.ancho === 'corto' ? ' campo--corto' : ''}` },
        crear('label', { for: idDe(f.campo) }, t(f.etiqueta)),
        entradaTexto(f.campo),
      );
    case 'largo':
      return crear(
        'div',
        { class: 'campo campo--ancho' },
        crear('label', { for: idDe(f.campo) }, t(f.etiqueta)),
        entradaTexto(f.campo, true),
      );
    case 'casillas':
      return crear(
        'fieldset',
        { class: 'campo campo--ancho grupo-casillas' },
        crear('legend', {}, t(f.etiqueta)),
        crear(
          'div',
          { class: 'opciones' },
          ...f.opciones.map((o) =>
            crear('label', { class: 'casilla', for: idDe(o.campo) }, entradaCasilla(o.campo), crear('span', {}, t(o.etiqueta))),
          ),
        ),
        ...(f.textos ?? []).map((x) =>
          crear(
            'div',
            { class: 'campo campo--corto' },
            crear('label', { for: idDe(x.campo) }, t(x.etiqueta)),
            entradaTexto(x.campo),
          ),
        ),
      );
    case 'tabla':
      return crear(
        'div',
        { class: 'campo campo--ancho tabla-pruebas' },
        crear(
          'table',
          {},
          crear('caption', { class: 'oculto-visual' }, t(f.etiqueta)),
          crear(
            'thead',
            {},
            crear('tr', {}, crear('th', { scope: 'col' }, 'Prueba'), ...f.columnas.map((c) => crear('th', { scope: 'col' }, c))),
          ),
          crear(
            'tbody',
            {},
            ...f.filas.map((r) =>
              crear(
                'tr',
                {},
                crear(
                  'th',
                  { scope: 'row' },
                  r.campoTexto
                    ? crear(
                        'span',
                        { class: 'prueba-otra' },
                        crear('label', { for: idDe(r.campoTexto) }, `${r.etiqueta}:`),
                        entradaTexto(r.campoTexto),
                      )
                    : r.etiqueta,
                ),
                ...r.campos.map((c, i) => crear('td', {}, entradaCasilla(c, `${r.etiqueta}: ${f.columnas[i]}`))),
              ),
            ),
          ),
        ),
      );
  }
}
