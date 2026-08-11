document.addEventListener('DOMContentLoaded', () => {

    const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ============================================
    // IMÁGENES
    //
    // Las fotos se suben desde el panel al tamaño que salieron
    // de la cámara. Netlify las redimensiona al vuelo, así que
    // el sitio pide siempre el ancho que necesita y nada más.
    // En local ese servicio no existe: ahí se usa la foto tal cual.
    // ============================================

    const enLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname)

    function urlImagen(ruta, ancho) {
        if (!ruta) return ''
        if (enLocal || !ruta.startsWith('/')) return ruta
        return `/.netlify/images?url=${encodeURIComponent(ruta)}&w=${ancho}&q=76`
    }

    async function leerJSON(ruta) {
        try {
            const respuesta = await fetch(ruta, { cache: 'no-cache' })
            if (!respuesta.ok) throw new Error(respuesta.status)
            return await respuesta.json()
        } catch (error) {
            console.error(`No se pudo leer ${ruta}:`, error)
            return null
        }
    }

    // ============================================
    // MENÚ HAMBURGUESA
    // ============================================

    const hamburguesa = document.getElementById('hamburguesa')
    const navMenu = document.getElementById('nav-menu')

    if (hamburguesa && navMenu) {
        const cerrarMenu = () => {
            hamburguesa.classList.remove('activo')
            navMenu.classList.remove('abierto')
            hamburguesa.setAttribute('aria-expanded', 'false')
            hamburguesa.setAttribute('aria-label', 'Abrir menú')
            document.body.style.overflow = ''
        }

        hamburguesa.addEventListener('click', () => {
            const abierto = navMenu.classList.toggle('abierto')
            hamburguesa.classList.toggle('activo', abierto)
            hamburguesa.setAttribute('aria-expanded', String(abierto))
            hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú')
            document.body.style.overflow = abierto ? 'hidden' : ''
        })

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', cerrarMenu)
        })

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && navMenu.classList.contains('abierto')) cerrarMenu()
        })
    }

    // ============================================
    // ANIMACIONES DE SCROLL
    // ============================================

    const observador = new IntersectionObserver((entradas, obs) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('visible')
                obs.unobserve(entrada.target)
            }
        })
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    })

    function animarAlAparecer(elementos) {
        elementos.forEach(elemento => observador.observe(elemento))
    }

    animarAlAparecer(document.querySelectorAll(
        '.tarjeta-clase, .bloque-filosofia, .bloque-dojo, .dato-contacto, .kanji-item, .grilla-galeria, .sensei, .encabezado-seccion'
    ))

    // ============================================
    // GALERÍA — se carga desde contenido/galeria.json
    // ============================================

    const grilla = document.getElementById('grilla-galeria')
    let fotos = []

    async function armarGaleria() {
        if (!grilla) return

        const datos = await leerJSON('contenido/galeria.json')
        fotos = (datos && Array.isArray(datos.fotos) ? datos.fotos : []).filter(f => f && f.imagen)

        if (!fotos.length) {
            // Sin fotos cargadas, la sección entera sobra
            const seccion = document.getElementById('galeria')
            if (seccion) seccion.hidden = true
            return
        }

        fotos.forEach((foto, indice) => {
            const boton = document.createElement('button')
            boton.type = 'button'
            boton.className = 'foto-galeria'
            boton.setAttribute('aria-label', foto.alt
                ? `Ampliar: ${foto.alt}`
                : `Ampliar foto ${indice + 1} de ${fotos.length}`)

            const img = document.createElement('img')
            img.src = urlImagen(foto.imagen, 600)
            img.alt = foto.alt || ''
            img.loading = 'lazy'

            boton.appendChild(img)
            boton.addEventListener('click', () => abrirLightbox(indice))
            grilla.appendChild(boton)
        })
    }

    // ============================================
    // EVENTOS — se cargan desde contenido/eventos.json
    // ============================================

    async function armarEventos() {
        const contenedor = document.getElementById('eventos')
        if (!contenedor) return

        const datos = await leerJSON('contenido/eventos.json')
        const eventos = (datos && Array.isArray(datos.eventos) ? datos.eventos : [])
            .filter(e => e && e.titulo)

        if (!eventos.length) return

        eventos.forEach(evento => {
            const bloque = document.createElement('div')
            bloque.className = 'evento'

            const marcoImagen = document.createElement('div')
            marcoImagen.className = 'evento-imagen'
            if (evento.imagen) {
                const img = document.createElement('img')
                img.src = urlImagen(evento.imagen, 900)
                img.alt = evento.alt || evento.titulo
                img.loading = 'lazy'
                marcoImagen.appendChild(img)
            }

            const texto = document.createElement('div')
            texto.className = 'evento-contenido'

            if (evento.fecha) {
                const fecha = document.createElement('span')
                fecha.className = 'evento-fecha'
                fecha.textContent = evento.fecha
                texto.appendChild(fecha)
            }

            const titulo = document.createElement('h3')
            titulo.textContent = evento.titulo
            texto.appendChild(titulo)

            if (evento.descripcion) {
                // Un párrafo por cada línea en blanco del texto cargado
                evento.descripcion.split(/\n{2,}/).forEach(parrafo => {
                    const p = document.createElement('p')
                    p.textContent = parrafo.trim()
                    texto.appendChild(p)
                })
            }

            bloque.appendChild(marcoImagen)
            bloque.appendChild(texto)
            contenedor.appendChild(bloque)
        })

        animarAlAparecer(contenedor.querySelectorAll('.evento'))
    }

    // ============================================
    // LIGHTBOX
    // ============================================

    const lightbox = document.getElementById('lightbox')
    const lightboxImg = document.getElementById('lightbox-img')
    const lightboxContador = document.getElementById('lightbox-contador')
    let indiceActual = 0
    let botonQueAbrio = null

    function mostrarFoto(indice) {
        if (!fotos.length) return
        indiceActual = (indice + fotos.length) % fotos.length
        const foto = fotos[indiceActual]
        lightboxImg.src = urlImagen(foto.imagen, 1600)
        lightboxImg.alt = foto.alt || ''
        lightboxContador.textContent = `${indiceActual + 1} / ${fotos.length}`
    }

    function abrirLightbox(indice) {
        if (!lightbox) return
        botonQueAbrio = document.activeElement
        mostrarFoto(indice)
        lightbox.hidden = false
        document.body.style.overflow = 'hidden'
        document.getElementById('lightbox-cerrar').focus()
    }

    function cerrarLightbox() {
        if (!lightbox) return
        lightbox.hidden = true
        lightboxImg.src = ''
        document.body.style.overflow = ''
        if (botonQueAbrio) botonQueAbrio.focus()
    }

    if (lightbox) {
        document.getElementById('lightbox-cerrar').addEventListener('click', cerrarLightbox)
        document.getElementById('lightbox-anterior').addEventListener('click', () => mostrarFoto(indiceActual - 1))
        document.getElementById('lightbox-siguiente').addEventListener('click', () => mostrarFoto(indiceActual + 1))

        // Clic en el fondo (no en la foto ni en los botones) cierra
        lightbox.addEventListener('click', e => {
            if (e.target === lightbox) cerrarLightbox()
        })

        document.addEventListener('keydown', e => {
            if (lightbox.hidden) return
            if (e.key === 'Escape') cerrarLightbox()
            if (e.key === 'ArrowLeft') mostrarFoto(indiceActual - 1)
            if (e.key === 'ArrowRight') mostrarFoto(indiceActual + 1)
        })
    }

    armarGaleria()
    armarEventos()

    // ============================================
    // NAV — se achica al scrollear y marca la sección actual
    // ============================================

    const nav = document.getElementById('nav')
    const enlacesNav = Array.from(document.querySelectorAll('#nav-menu a'))
    const secciones = enlacesNav
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean)

    const kanjiHero = document.querySelector('.hero-kanji-fondo')

    let pendiente = false

    function alScrollear() {
        const y = window.scrollY

        if (nav) nav.classList.toggle('compacta', y > 80)

        // Parallax del kanji de fondo del hero
        if (kanjiHero && !menosMovimiento && y < window.innerHeight) {
            kanjiHero.style.transform = `translate(-50%, calc(-50% + ${y * 0.2}px))`
        }

        // Sección activa: la última cuyo borde superior ya pasó el nav
        let activa = null
        const limite = y + 140
        secciones.forEach(seccion => {
            if (!seccion.hidden && seccion.offsetTop <= limite) activa = seccion
        })

        enlacesNav.forEach(a => {
            a.classList.toggle('activo', activa !== null && a.getAttribute('href') === `#${activa.id}`)
        })

        pendiente = false
    }

    window.addEventListener('scroll', () => {
        if (pendiente) return
        pendiente = true
        requestAnimationFrame(alScrollear)
    }, { passive: true })

    alScrollear()

})
