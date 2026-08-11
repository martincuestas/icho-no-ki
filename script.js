document.addEventListener('DOMContentLoaded', () => {

    const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
    // GALERÍA — las fotos vienen de galeria.js,
    // generado por "Actualizar Galeria.bat"
    // ============================================

    const grilla = document.getElementById('grilla-galeria')
    const fotos = typeof GALERIA !== 'undefined' ? GALERIA : []

    if (grilla && fotos.length) {
        fotos.forEach((foto, indice) => {
            const boton = document.createElement('button')
            boton.type = 'button'
            boton.className = 'foto-galeria'
            boton.setAttribute('aria-label', `Ampliar foto ${indice + 1} de ${fotos.length}`)

            const img = document.createElement('img')
            img.src = foto.thumb
            img.alt = foto.alt
            img.loading = 'lazy'

            boton.appendChild(img)
            boton.addEventListener('click', () => abrirLightbox(indice))
            grilla.appendChild(boton)
        })
    }

    // ============================================
    // LIGHTBOX — usa la versión "full" de cada foto
    // ============================================

    const lightbox = document.getElementById('lightbox')
    const lightboxImg = document.getElementById('lightbox-img')
    const lightboxContador = document.getElementById('lightbox-contador')
    let indiceActual = 0
    let botonQueAbrio = null

    function mostrarFoto(indice) {
        indiceActual = (indice + fotos.length) % fotos.length
        const foto = fotos[indiceActual]
        lightboxImg.src = foto.full
        lightboxImg.alt = foto.alt
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

    // ============================================
    // ANIMACIONES DE SCROLL
    // ============================================

    const elementosAnimados = document.querySelectorAll(
        '.tarjeta-clase, .bloque-filosofia, .evento, .bloque-dojo, .dato-contacto, .kanji-item, .grilla-galeria, .sensei, .encabezado-seccion'
    )

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

    elementosAnimados.forEach(elemento => observador.observe(elemento))

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
            if (seccion.offsetTop <= limite) activa = seccion
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
