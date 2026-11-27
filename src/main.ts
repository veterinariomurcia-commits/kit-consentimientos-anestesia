// Punto de arranque de la web: conecta los cuatro pasos de la página (index.html).
// Todo ocurre en el navegador: no se envía nada a ningún sitio.

import { iniciarPasoBloques } from './web/paso-bloques.ts';
import { iniciarPasoClinica } from './web/paso-clinica.ts';
import { iniciarPasoDescarga } from './web/paso-descarga.ts';
import { iniciarPasoPaciente } from './web/paso-paciente.ts';
import { iniciarRecordar } from './web/recordar.ts';
import { iniciarVistaPrevia } from './web/vista-previa.ts';

try {
  iniciarPasoClinica();
  iniciarPasoBloques();
  iniciarPasoPaciente();
  iniciarPasoDescarga();
  iniciarVistaPrevia();
  // Al final: si hay datos recordados, se ponen en todos los pasos ya preparados.
  iniciarRecordar();
} catch (e) {
  // Solo pasa si un texto de contenido/ tiene un error (D20): mejor decirlo que dejar la página a medias.
  console.error(e);
  const aviso = document.createElement('p');
  aviso.className = 'mensaje mensaje--error';
  aviso.setAttribute('role', 'alert');
  aviso.textContent = `La herramienta no ha podido arrancar. Detalle: ${e instanceof Error ? e.message : String(e)}`;
  document.getElementById('contenido')?.prepend(aviso);
}
