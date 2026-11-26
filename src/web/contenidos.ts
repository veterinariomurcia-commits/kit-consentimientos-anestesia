// Los 4 textos de contenido/, metidos dentro de la web al construirla.
//
// El "?raw" le dice a Vite que copie el archivo tal cual, como texto. Así la web no descarga
// nada de fuera al funcionar (CLAUDE.md: sin recursos externos).

import consentimientoNeutra from '../../contenido/consentimiento-neutra.md?raw';
import consentimientoCalida from '../../contenido/consentimiento-calida.md?raw';
import informacionNeutra from '../../contenido/informacion-neutra.md?raw';
import informacionCalida from '../../contenido/informacion-calida.md?raw';

export type Variante = 'neutra' | 'calida';
export type TipoDocumento = 'consentimiento' | 'informacion';

export const TEXTOS: Record<TipoDocumento, Record<Variante, string>> = {
  consentimiento: { neutra: consentimientoNeutra, calida: consentimientoCalida },
  informacion: { neutra: informacionNeutra, calida: informacionCalida },
};

/** Nombre del archivo de contenido/, para los mensajes de error. */
export const archivo = (tipo: TipoDocumento, variante: Variante) => `${tipo}-${variante}.md`;

/** Nombre del documento para mostrar en la web. */
export const NOMBRE_DOCUMENTO: Record<TipoDocumento, string> = {
  consentimiento: 'Consentimiento informado de anestesia y sedación',
  informacion: 'Información sobre la anestesia y la sedación',
};
