// ============================================================
// OPTIMIZAR IMAGENES — Icho no Ki
//
// Las fotos que se suben desde el panel (/admin) entran al repo tal
// como salieron de la camara: 4 o 5 MB cada una. Al sitio no lo afecta
// (Netlify Image CDN las sirve achicadas), pero el repositorio crece
// rapido. Este script las reescribe con el MISMO nombre, asi las rutas
// ya guardadas en contenido/*.json siguen siendo validas.
//
// Lo corre solo la accion de GitHub .github/workflows/optimizar-imagenes.yml
// cada vez que entra una foto nueva. Tambien se puede correr a mano:
//
//     npm install sharp
//     node herramientas/optimizar-imagenes.mjs          (aplica los cambios)
//     node herramientas/optimizar-imagenes.mjs --simular (solo muestra)
// ============================================================

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, extname, relative, sep } from 'node:path'
import sharp from 'sharp'

const CARPETA = 'img'
const ANCHO_MAXIMO = 1600
const PESO_MAXIMO = 600 * 1024 // 600 KB
const CALIDAD_JPEG = 82

const simular = process.argv.includes('--simular')

function kb(bytes) {
    return `${Math.round(bytes / 1024)} KB`
}

async function listarImagenes(carpeta) {
    const encontradas = []
    for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
        const ruta = join(carpeta, entrada.name)
        if (entrada.isDirectory()) {
            encontradas.push(...(await listarImagenes(ruta)))
        } else if (['.jpg', '.jpeg', '.png'].includes(extname(entrada.name).toLowerCase())) {
            encontradas.push(ruta)
        }
    }
    return encontradas
}

async function optimizar(ruta) {
    const original = await readFile(ruta)
    const meta = await sharp(original).metadata()
    const esPng = meta.format === 'png'

    // Los PNG del sitio (hoja y rama de ginkgo) ya estan bien y tienen
    // transparencia: solo los tocamos si son enormes.
    const hayQueTocarlo = esPng
        ? meta.width > ANCHO_MAXIMO
        : meta.width > ANCHO_MAXIMO || original.length > PESO_MAXIMO

    if (!hayQueTocarlo) return null

    let proceso = sharp(original).rotate() // respeta la orientacion EXIF
    if (meta.width > ANCHO_MAXIMO) {
        proceso = proceso.resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
    }
    proceso = esPng
        ? proceso.png({ compressionLevel: 9 })
        : proceso.jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })

    const nuevo = await proceso.toBuffer()

    // Si no mejora, lo dejamos como esta. Sin esto, cada corrida volveria
    // a comprimir la misma foto y la calidad se iria degradando sola.
    if (nuevo.length >= original.length) return null

    if (!simular) await writeFile(ruta, nuevo)
    return { antes: original.length, despues: nuevo.length }
}

const imagenes = (await listarImagenes(CARPETA)).sort()
let tocadas = 0
let ahorro = 0

for (const ruta of imagenes) {
    const resultado = await optimizar(ruta)
    // En Windows las rutas vienen con barra invertida; las mostramos con barra normal
    const nombre = relative('.', ruta).split(sep).join('/')

    if (resultado) {
        tocadas++
        ahorro += resultado.antes - resultado.despues
        console.log(`  optimizada  ${nombre}  ${kb(resultado.antes)} -> ${kb(resultado.despues)}`)
    } else {
        console.log(`  sin cambios ${nombre}  ${kb((await stat(ruta)).size)}`)
    }
}

console.log('')
console.log(`${tocadas} de ${imagenes.length} imagenes optimizadas, ${kb(ahorro)} recuperados${simular ? ' (simulacion)' : ''}`)
