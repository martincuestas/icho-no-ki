# ============================================================
# ACTUALIZAR GALERIA — Ichō no Ki
#
# Uso: doble clic en "Actualizar Galeria.bat" (en la raíz del sitio)
#
# Uso: doble clic en "Actualizar Galeria.bat" (en la raíz del sitio)
#
# Este script es el atajo para cargar MUCHAS fotos de una.
# Para subir o bajar fotos de a una, o para cargar eventos,
# usá el panel: https://TU-SITIO.netlify.app/admin
#
# Qué hace:
#   1. Toma las fotos originales de Fotos\Galeria\ y genera
#      versiones optimizadas para web en img\galeria\.
#   2. AGREGA a contenido\galeria.json las fotos que todavía no
#      estén listadas, de más nueva a más vieja.
#   3. Genera las versiones web de las fotos fijas del sitio
#      (sensei, Ueshiba, ginkgo) en img\.
#
# IMPORTANTE: este script solo agrega, nunca borra. Si sacás una
# foto desde el panel, el script no la vuelve a poner salvo que
# la foto original siga en Fotos\Galeria y la borres también de ahí.
# ============================================================

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$carpetaFotos      = Join-Path $raiz 'Fotos'
$carpetaOriginales = Join-Path $raiz 'Fotos\Galeria'
$carpetaImgWeb     = Join-Path $raiz 'img'
$carpetaGaleriaWeb = Join-Path $raiz 'img\galeria'
$carpetaEventosWeb = Join-Path $raiz 'img\eventos'
$archivoManifiesto = Join-Path $raiz 'contenido\galeria.json'

New-Item -ItemType Directory -Force -Path $carpetaGaleriaWeb | Out-Null
New-Item -ItemType Directory -Force -Path $carpetaEventosWeb | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $raiz 'contenido') | Out-Null

# ------------------------------------------------------------
# Funciones auxiliares
# ------------------------------------------------------------

function Corregir-Orientacion([System.Drawing.Image]$imagen) {
    # Las cámaras y celulares guardan la rotación en EXIF (tag 274).
    # Sin esto, las fotos sacadas en vertical aparecen acostadas.
    if ($imagen.PropertyIdList -contains 274) {
        $orientacion = $imagen.GetPropertyItem(274).Value[0]
        switch ($orientacion) {
            3 { $imagen.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
            6 { $imagen.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
            8 { $imagen.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        }
        $imagen.RemovePropertyItem(274)
    }
}

function Obtener-FechaFoto([string]$rutaArchivo) {
    # Fecha de captura EXIF (tag 36867); si no existe, fecha del archivo.
    try {
        $img = [System.Drawing.Image]::FromFile($rutaArchivo)
        try {
            if ($img.PropertyIdList -contains 36867) {
                $bytes = $img.GetPropertyItem(36867).Value
                $texto = [System.Text.Encoding]::ASCII.GetString($bytes).Trim([char]0)
                return [datetime]::ParseExact($texto, 'yyyy:MM:dd HH:mm:ss', $null)
            }
        } finally { $img.Dispose() }
    } catch {}
    return (Get-Item $rutaArchivo).LastWriteTime
}

function Optimizar-Imagen([string]$origen, [string]$destino, [int]$maxAncho, [int]$calidad) {
    # Saltea si la versión web ya está al día
    if ((Test-Path $destino) -and ((Get-Item $destino).LastWriteTime -ge (Get-Item $origen).LastWriteTime)) {
        return $false
    }

    $original = [System.Drawing.Image]::FromFile($origen)
    try {
        Corregir-Orientacion $original

        $escala = [Math]::Min(1.0, $maxAncho / $original.Width)
        $ancho  = [int]($original.Width * $escala)
        $alto   = [int]($original.Height * $escala)

        $lienzo = New-Object System.Drawing.Bitmap($ancho, $alto)
        try {
            $g = [System.Drawing.Graphics]::FromImage($lienzo)
            $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.DrawImage($original, 0, 0, $ancho, $alto)
            $g.Dispose()

            if ([IO.Path]::GetExtension($destino) -eq '.png') {
                $lienzo.Save($destino, [System.Drawing.Imaging.ImageFormat]::Png)
            } else {
                $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
                         Where-Object { $_.MimeType -eq 'image/jpeg' }
                $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
                $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
                    [System.Drawing.Imaging.Encoder]::Quality, [long]$calidad)
                $lienzo.Save($destino, $codec, $params)
            }
        } finally { $lienzo.Dispose() }
    } finally { $original.Dispose() }
    return $true
}

function Nombre-Web([string]$nombreBase) {
    # Nombres seguros para URL: sin espacios ni caracteres raros
    return ($nombreBase -replace '[^a-zA-Z0-9_-]', '-')
}

# ------------------------------------------------------------
# 1. Galería
# ------------------------------------------------------------

Write-Host ''
Write-Host '=== Galeria ===' -ForegroundColor Cyan

$extensiones = '*.jpg', '*.jpeg', '*.png'
$fotos = Get-ChildItem -Path (Join-Path $carpetaOriginales '*') -Include $extensiones -File -ErrorAction SilentlyContinue |
         Sort-Object Name -Unique

if (-not $fotos) {
    Write-Host "No hay fotos en $carpetaOriginales" -ForegroundColor Yellow
}

$entradas = @()
$generadas = 0

foreach ($foto in $fotos) {
    $base = Nombre-Web ([IO.Path]::GetFileNameWithoutExtension($foto.Name))
    $web  = Join-Path $carpetaGaleriaWeb "$base.jpg"

    # Una sola version por foto: Netlify Image CDN se encarga de
    # generar la miniatura al vuelo cuando el sitio la pide
    if (Optimizar-Imagen $foto.FullName $web 1600 82) { $generadas++; Write-Host "  [nueva] $base.jpg" }

    $entradas += [pscustomobject]@{
        imagen = "/img/galeria/$base.jpg"
        fecha  = Obtener-FechaFoto $foto.FullName
        alt    = ($base -replace '[-_]', ' ')
    }
}

# Lo que ya esta publicado manda: el panel es la fuente de verdad.
# Aca solo sumamos las fotos que todavia no figuran en el JSON.
$yaListadas = @()
if (Test-Path $archivoManifiesto) {
    try {
        $json = Get-Content $archivoManifiesto -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($json.fotos) { $yaListadas = @($json.fotos) }
    } catch {
        Write-Host "  contenido\galeria.json ilegible, se regenera de cero" -ForegroundColor Yellow
    }
}

$rutasExistentes = $yaListadas | ForEach-Object { $_.imagen }
$nuevas = @($entradas | Where-Object { $rutasExistentes -notcontains $_.imagen } | Sort-Object fecha -Descending)

# Las nuevas van arriba, de mas nueva a mas vieja
$finales = @()
$finales += $nuevas | ForEach-Object { [pscustomobject]@{ imagen = $_.imagen; alt = $_.alt } }
$finales += $yaListadas | ForEach-Object { [pscustomobject]@{ imagen = $_.imagen; alt = $_.alt } }

$salida = [pscustomobject]@{ fotos = @($finales) } | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($archivoManifiesto, $salida, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "  contenido\galeria.json: $($finales.Count) fotos en total, $($nuevas.Count) agregadas" -ForegroundColor Green
if ($generadas -gt 0) { Write-Host "  $generadas imagenes optimizadas" -ForegroundColor Green }

# ------------------------------------------------------------
# 2. Fotos fijas del sitio
#
# Las originales de Fotos\ pesan varios MB y algunas tienen la
# extension en mayuscula (.JPG). El hosting distingue mayusculas
# de minusculas, asi que el sitio siempre apunta a estas copias
# de img\, con nombre en minuscula y peso para web.
# ------------------------------------------------------------

Write-Host ''
Write-Host '=== Fotos fijas ===' -ForegroundColor Cyan

# Las fotos de eventos van a img\eventos porque las administra el panel
$fotosFijas = @(
    @{ origen = 'HojaGinkgo.png';      destino = 'hoja-ginkgo.png';               ancho = 200;  calidad = 90 }
    @{ origen = 'RamaGinkgo.png';      destino = 'rama-ginkgo.png';               ancho = 900;  calidad = 90 }
    @{ origen = 'Ginkgo.jpg';          destino = 'ginkgo.jpg';                    ancho = 1200; calidad = 82 }
    @{ origen = 'Ueshiba.jpg';         destino = 'ueshiba.jpg';                   ancho = 900;  calidad = 84 }
    @{ origen = 'WalterSensei.JPG';    destino = 'walter-sensei.jpg';             ancho = 1000; calidad = 82 }
    @{ origen = 'WalterHombuDojo.JPG'; destino = 'eventos\walter-hombu-dojo.jpg'; ancho = 1400; calidad = 82 }
    @{ origen = 'Examen2025.JPG';      destino = 'eventos\examen-2025.jpg';       ancho = 1400; calidad = 82 }
)

foreach ($f in $fotosFijas) {
    # -Filter no distingue mayusculas, asi que encuentra .JPG y .jpg por igual
    $archivo = Get-ChildItem -Path $carpetaFotos -Filter $f.origen -File -ErrorAction SilentlyContinue |
               Select-Object -First 1

    if (-not $archivo) {
        Write-Host "  [falta] Fotos\$($f.origen)" -ForegroundColor Yellow
        continue
    }

    $destino = Join-Path $carpetaImgWeb $f.destino
    if (Optimizar-Imagen $archivo.FullName $destino $f.ancho $f.calidad) {
        $kb = [int]((Get-Item $destino).Length / 1KB)
        Write-Host "  [nueva] img\$($f.destino) ($kb KB)"
    }
}

Write-Host ''
Write-Host 'Listo. Ahora subi el sitio al hosting para publicar los cambios.' -ForegroundColor Green
