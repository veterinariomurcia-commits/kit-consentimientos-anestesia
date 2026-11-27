// Texto del LEEME.txt que va dentro del ZIP: una guía breve para la clínica.
// Usa saltos de línea de Windows (\r\n) para que el Bloc de notas lo abra bien.

import { VERSION_MODELO } from '../generador/generador.ts';

export interface DatosLeeme {
  /** Formato de los documentos del ZIP: la guía cambia un poco (en el PDF no se puede editar). */
  formato: 'word' | 'pdf';
  nombreClinica: string;
  variante: 'neutra' | 'calida';
  /** Nombres de los archivos Word del ZIP, con lo que es cada uno. */
  archivos: { nombre: string; descripcion: string }[];
  /** Apartados quitados de cada documento, ya en texto ("Valoración del riesgo…"). */
  quitados: { documento: string; apartados: string[] }[];
  /** Si el consentimiento lleva datos del paciente. */
  conPaciente: boolean;
  fecha: Date;
}

export function textoLeeme(d: DatosLeeme): string {
  const fecha = d.fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const lineas: string[] = [
    'KIT DE CONSENTIMIENTOS DE ANESTESIA',
    '===================================',
    '',
    `Preparado el ${fecha} para ${d.nombreClinica.trim() || 'tu clínica'}.`,
    `Modelo ${VERSION_MODELO} · Versión ${d.variante === 'calida' ? 'cálida (de tú)' : 'neutra (de usted)'}.`,
    '',
    'QUÉ HAY EN ESTE ZIP',
    '-------------------',
    ...d.archivos.map((a) => `- ${a.nombre}: ${a.descripcion}`),
    ...(d.formato === 'pdf' ? ['  Los dos en PDF: listos para imprimir o para subirlos a una plataforma de firma online.'] : []),
    '- LEEME.txt: esta guía.',
    '',
  ];

  const conQuitados = d.quitados.filter((q) => q.apartados.length > 0);
  if (conQuitados.length > 0) {
    lineas.push('Apartados que has quitado:');
    for (const q of conQuitados) lineas.push(`- ${q.documento}: ${q.apartados.join('; ')}.`);
    lineas.push('');
  }

  if (d.formato === 'pdf') {
    lineas.push(
      'ANTES DE USARLOS',
      '----------------',
      '1. Abre los dos documentos y revísalos enteros.',
      '2. Lo que sale resaltado en amarillo es un dato que falta (por ejemplo, [CIF]) o una',
      '   referencia a un apartado que has quitado ([apartado quitado]). Un PDF no se puede',
      '   corregir: vuelve a la web, completa el dato o el apartado y descárgalos otra vez.',
      '3. Los huecos y las casillas en blanco son para rellenarlos a mano al imprimir, o en la',
      '   plataforma de firma online.',
      '4. Si quieres cambiar algún texto, descarga los documentos en Word: se pueden editar.',
      '',
    );
  } else {
    lineas.push(
      'ANTES DE USARLOS',
      '----------------',
      '1. Abre los dos documentos y revísalos enteros.',
      '2. Lo que sale resaltado en amarillo es un dato que falta (por ejemplo, [CIF]) o una',
      '   referencia a un apartado que has quitado ([apartado quitado]). Escribe el dato o',
      '   corrige la frase, y quita el resaltado.',
      '3. Los huecos y las casillas en blanco son para rellenarlos a mano o en el ordenador.',
      '4. Puedes cambiar cualquier texto. Para cambiar el color o la letra de todo el documento,',
      '   cambia los estilos de Word (Normal, Título 1, Título 2…) en lugar de cada párrafo.',
      '5. Para poner otro logo: haz clic en el logo y elige "Cambiar imagen".',
      '',
    );
  }

  if (d.conPaciente) {
    lineas.push(
      'DATOS DEL PACIENTE',
      '------------------',
      `El consentimiento de este ZIP lleva datos del paciente y del ${d.variante === 'calida' ? 'tutor/a' : 'responsable legal'}. Guárdalo con el`,
      'mismo cuidado que la historia clínica, y bórralo de la carpeta de descargas cuando ya no',
      'lo necesites.',
      '',
    );
  }

  lineas.push(
    'AVISO',
    '-----',
    'Modelo orientativo. Cada clínica debe revisarlo y adaptarlo con su asesoría legal y su',
    'proveedor de protección de datos antes de usarlo.',
    '',
    'PRIVACIDAD',
    '----------',
    'Estos documentos se han preparado en tu propio navegador. No se ha enviado ningún dato',
    'a ningún sitio.',
    '',
  );
  // La marca BOM del principio ayuda a que los programas antiguos lean bien las tildes.
  return '﻿' + lineas.join('\r\n');
}
