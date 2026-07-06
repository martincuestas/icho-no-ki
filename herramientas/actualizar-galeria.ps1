# ============================================================
# ACTUALIZAR GALERIA — Ichō no Ki
#
# Uso: doble clic en "Actualizar Galeria.bat" (en la raíz del sitio)
#
# Qué hace:
#   1. Toma las fotos originales de Fotos\Galeria\ y genera
#      versiones optimizadas para web en img\galeria\
#      (una grande para el visor y una miniatura para la grilla).
#   2. Optimiza las imágenes fijas del sitio (hero, sensei, etc.)
#      desde Fotos\ hacia img\.
#   3. Regenera galeria.js con la lista de fotos de la galería,
#      ordenadas de más nueva a más vieja.
#
# Después de correrlo, subí el sitio al hosting y las fotos
# nuevas aparecen solas en la galería.
# ============================================================

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$carpetaOriginales = Join-Path $raiz 'Fotos\Galeria'
$carpetaGaleriaWeb = Join-Path $raiz 'img\galeria'
$carpetaImgWeb     = Join-Path $raiz 'img'
$archivoManifiesto = Join-Path $raiz 'galeria.js'

New-Item -ItemType Directory -Force -Path $carpetaGaleriaWeb | Out-Null

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
    $base   = Nombre-Web ([IO.Path]::GetFileNameWithoutExtension($foto.Name))
    $full   = Join-Path $carpetaGaleriaWeb "$base.jpg"
    $thumb  = Join-Path $carpetaGaleriaWeb "$base-mini.jpg"

    if (Optimizar-Imagen $foto.FullName $full 1600 82)  { $generadas++; Write-Host "  [nueva] $base.jpg" }
    if (Optimizar-Imagen $foto.FullName $thumb 600 78) { Write-Host "  [nueva] $base-mini.jpg" }

    $entradas += [pscustomobject]@{
        base  = $base
        fecha = Obtener-FechaFoto $foto.FullName
        alt   = ($base -replace '[-_]', ' ')
    }
}

# Borrar versiones web de fotos que ya no están en los originales
$basesValidas = $entradas | ForEach-Object { $_.base }
Get-ChildItem -Path $carpetaGaleriaWeb -Filter '*.jpg' -File | ForEach-Object {
    $nombre = $_.BaseName -replace '-mini$', ''
    if ($basesValidas -notcontains $nombre) {
        Remove-Item $_.FullName -Force -Confirm:$false
        Write-Host "  [borrada] $($_.Name) (ya no esta en Fotos\Galeria)" -ForegroundColor DarkYellow
    }
}

# Manifiesto: de más nueva a más vieja
$entradas = $entradas | Sort-Object fecha -Descending

$lineas = foreach ($e in $entradas) {
    "    { thumb: `"img/galeria/$($e.base)-mini.jpg`", full: `"img/galeria/$($e.base).jpg`", alt: `"$($e.alt)`" },"
}

$contenido = @"
// Archivo generado automaticamente por herramientas\actualizar-galeria.ps1
// NO EDITAR A MANO: se sobreescribe cada vez que se corre el script.
const GALERIA = [
$($lineas -join "`r`n")
];
"@

[IO.File]::WriteAllText($archivoManifiesto, $contenido, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "  galeria.js actualizado con $($entradas.Count) fotos ($generadas nuevas)" -ForegroundColor Green

# ------------------------------------------------------------
# 2. Imágenes fijas del sitio
# ------------------------------------------------------------

Write-Host ''
Write-Host '=== Imagenes fijas ===' -ForegroundColor Cyan

# origen (en Fotos\) => destino (en img\), ancho máximo, calidad
$fijas = @(
    @{ origen = 'Hero.JPG';            destino = 'hero.jpg';             ancho = 1920; calidad = 78 }
    @{ origen = 'WalterSensei.JPG';    destino = 'walter-sensei.jpg';    ancho = 1000; calidad = 82 }
    @{ origen = 'Ueshiba.jpg';         destino = 'ueshiba.jpg';          ancho = 800;  calidad = 82 }
    @{ origen = 'Ginkgo.jpg';          destino = 'ginkgo.jpg';           ancho = 1000; calidad = 82 }
    @{ origen = 'RamaGinkgo.png';      destino = 'rama-ginkgo.png';      ancho = 900;  calidad = 0 }
    @{ origen = 'HojaGinkgo.png';      destino = 'hoja-ginkgo.png';      ancho = 200;  calidad = 0 }
    @{ origen = 'WalterHombuDojo.JPG'; destino = 'walter-hombu.jpg';     ancho = 1400; calidad = 82 }
    @{ origen = 'Examen2025.JPG';      destino = 'examen-2025.jpg';      ancho = 1400; calidad = 82 }
)

foreach ($f in $fijas) {
    $origen  = Join-Path $raiz "Fotos\$($f.origen)"
    $destino = Join-Path $carpetaImgWeb $f.destino
    if (-not (Test-Path $origen)) {
        Write-Host "  [falta] Fotos\$($f.origen)" -ForegroundColor Yellow
        continue
    }
    if (Optimizar-Imagen $origen $destino $f.ancho $f.calidad) {
        Write-Host "  [nueva] img\$($f.destino)"
    }
}

Write-Host ''
Write-Host 'Listo. Ahora subi el sitio al hosting para publicar los cambios.' -ForegroundColor Green
