# Convierte cada página de uno o varios PDF en una imagen PNG, para revisarlas a simple vista.
# Usa una función que ya trae Windows 10/11 (Windows.Data.Pdf): no hay que instalar nada.
#
# Uso (desde la terminal de VS Code, en la carpeta del proyecto):
#   powershell -ExecutionPolicy Bypass -File scripts/pdf-a-imagenes.ps1 salida/pdf/informacion-neutra.pdf
#   powershell -ExecutionPolicy Bypass -File scripts/pdf-a-imagenes.ps1 salida/pdf/*.pdf -Carpeta salida/imagenes -Ancho 1000
#
# Cada página se guarda como <nombre-del-pdf>-p1.png, -p2.png… en la carpeta indicada
# (por defecto, salida/imagenes).

param(
  [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)]
  [string[]] $Pdfs,
  [string] $Carpeta = 'salida/imagenes',
  [int] $Ancho = 1000
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# Las funciones de Windows son "asíncronas" (avisan cuando terminan); esto espera a que terminen.
$asTaskGenerico = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
function Esperar($operacion, [Type] $tipo) {
  $tarea = $asTaskGenerico.MakeGenericMethod($tipo).Invoke($null, @($operacion))
  $tarea.Wait() | Out-Null
  $tarea.Result
}
function EsperarAccion($accion) {
  $metodo = [System.WindowsRuntimeSystemExtensions].GetMethod('AsTask', [Type[]] @([Windows.Foundation.IAsyncAction]))
  $metodo.Invoke($null, @($accion)).Wait() | Out-Null
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

New-Item -ItemType Directory -Force $Carpeta | Out-Null
$carpetaAbsoluta = (Resolve-Path $Carpeta).Path

foreach ($patron in $Pdfs) {
  foreach ($archivo in (Get-ChildItem $patron)) {
    $fichero = Esperar ([Windows.Storage.StorageFile]::GetFileFromPathAsync($archivo.FullName)) ([Windows.Storage.StorageFile])
    $pdf = Esperar ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($fichero)) ([Windows.Data.Pdf.PdfDocument])
    for ($i = 0; $i -lt $pdf.PageCount; $i++) {
      $pagina = $pdf.GetPage($i)
      $opciones = New-Object Windows.Data.Pdf.PdfPageRenderOptions
      $opciones.DestinationWidth = $Ancho
      $flujo = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
      EsperarAccion ($pagina.RenderToStreamAsync($flujo, $opciones))
      $destino = Join-Path $carpetaAbsoluta ("{0}-p{1}.png" -f $archivo.BaseName, ($i + 1))
      $lector = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($flujo.GetInputStreamAt(0))
      $salida = [System.IO.File]::Create($destino)
      $lector.CopyTo($salida)
      $salida.Close(); $lector.Close(); $flujo.Dispose(); $pagina.Dispose()
    }
    Write-Output ("{0}: {1} páginas -> {2}" -f $archivo.Name, $pdf.PageCount, $carpetaAbsoluta)
  }
}
