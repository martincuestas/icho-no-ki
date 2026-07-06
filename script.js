document.addEventListener('DOMContentLoaded', () => {

    const prefiereMenosMovimiento =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ============================================
    // MENÚ HAMBURGUESA
    // ============================================

    const hamburguesa = document.getElementById('hamburguesa')
    const navMenu = document.getElementById('nav-menu')

    if (hamburguesa && navMenu) {
        hamburguesa.addEventListener('click', () => {
            const abierto = navMenu.classList.toggle('abierto')
            hamburguesa.classList.toggle('activo', abierto)
            hamburguesa.setAttribute('aria-expanded', String(abierto))
            hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú')
        })

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburguesa.classList.remove('activo')
                navMenu.classList.remove('abierto')
                hamburguesa.setAttribute('aria-expanded', 'false')
            })
        })
    }

    // ============================================
    // GALERÍA DINÁMICA
    // (las fotos vienen de galeria.js, generado por
    //  herramientas\actualizar-galeria.ps1)
    // ============================================

    const grilla = document.getElementById('grilla-galeria')
    const fotos = (typeof GALERIA !== 'undefined') ? GALERIA : []

    if (grilla) {
        if (fotos.length === 0) {
            grilla.innerHTML = '<p class="galeria-vacia">Pronto vas a encontrar acá fotos de la práctica.</p>'
        } else {
            fotos.forEach((foto, indice) => {
                const boton = document.createElement('button')
                boton.type = 'button'
                boton.setAttribute('aria-label', `Ampliar foto: ${foto.alt}`)

                const img = document.createElement('img')
                img.src = foto.thumb
                img.alt = foto.alt
                img.loading = 'lazy'
                img.width = 600
                img.height = 600

                boton.appendChild(img)
                boton.addEventListener('click', () => abrirLightbox(indice))
                grilla.appendChild(boton)
            })
        }
    }

    // ============================================
    // LIGHTBOX
    // ============================================

    const lightbox = document.getElementById('lightbox')
    const lightboxImagen = document.getElementById('lightbox-imagen')
    const lightboxContador = document.getElementById('lightbox-contador')
    let fotoActual = 0
    let elementoConFoco = null

    function mostrarFoto(indice) {
        fotoActual = (indice + fotos.length) % fotos.length
        const foto = fotos[fotoActual]
        lightboxImagen.src = foto.full
        lightboxImagen.alt = foto.alt
        lightboxContador.textContent = `${fotoActual + 1} / ${fotos.length}`
    }

    function abrirLightbox(indice) {
        if (!lightbox || fotos.length === 0) return
        elementoConFoco = document.activeElement
        mostrarFoto(indice)
        lightbox.hidden = false
        requestAnimationFrame(() => lightbox.classList.add('abierto'))
        document.body.style.overflow = 'hidden'
        document.getElementById('lightbox-cerrar').focus()
    }

    function cerrarLightbox() {
        lightbox.classList.remove('abierto')
        document.body.style.overflow = ''
        setTimeout(() => {
            lightbox.hidden = true
            lightboxImagen.src = ''
        }, 300)
        if (elementoConFoco) elementoConFoco.focus()
    }

    if (lightbox) {
        document.getElementById('lightbox-cerrar').addEventListener('click', cerrarLightbox)
        document.getElementById('lightbox-anterior').addEventListener('click', () => mostrarFoto(fotoActual - 1))
        document.getElementById('lightbox-siguiente').addEventListener('click', () => mostrarFoto(fotoActual + 1))

        // Clic fuera de la imagen cierra el visor
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) cerrarLightbox()
        })

        document.addEventListener('keydown', (e) => {
            if (lightbox.hidden) return
            if (e.key === 'Escape') cerrarLightbox()
            if (e.key === 'ArrowLeft') mostrarFoto(fotoActual - 1)
            if (e.key === 'ArrowRight') mostrarFoto(fotoActual + 1)
        })

        // Swipe en celular
        let inicioX = null
        lightbox.addEventListener('touchstart', (e) => {
            inicioX = e.touches[0].clientX
        }, { passive: true })
        lightbox.addEventListener('touchend', (e) => {
            if (inicioX === null) return
            const distancia = e.changedTouches[0].clientX - inicioX
            if (Math.abs(distancia) > 50) {
                mostrarFoto(distancia > 0 ? fotoActual - 1 : fotoActual + 1)
            }
            inicioX = null
        }, { passive: true })
    }

    // ============================================
    // ANIMACIONES DE SCROLL (reveals)
    // ============================================

    const elementosAnimados = document.querySelectorAll(
        '.tarjeta-clase, .bloque-filosofia, .bloque-osensei h3, .osensei-destacado, ' +
        '.timeline-item, .evento, .bloque-dojo, .dato-contacto, .kanji-item, ' +
        '.grilla-galeria, .sensei'
    )

    const observerReveal = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible')
                observerReveal.unobserve(entry.target)
            }
        })
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    })

    elementosAnimados.forEach(elemento => observerReveal.observe(elemento))

    // ============================================
    // LINK ACTIVO EN LA NAVEGACIÓN
    // ============================================

    const linksNav = document.querySelectorAll('#nav-menu a[href^="#"]')
    const seccionesNav = [...linksNav]
        .map(link => document.querySelector(link.getAttribute('href')))
        .filter(Boolean)

    const observerSecciones = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                linksNav.forEach(link => {
                    link.classList.toggle(
                        'activo',
                        link.getAttribute('href') === `#${entry.target.id}`
                    )
                })
            }
        })
    }, {
        rootMargin: '-40% 0px -55% 0px'
    })

    seccionesNav.forEach(seccion => observerSecciones.observe(seccion))

    // ============================================
    // SCROLL: nav, barra de progreso, WhatsApp, parallax
    // ============================================

    const nav = document.getElementById('nav')
    const barraProgreso = document.getElementById('barra-progreso')
    const whatsapp = document.getElementById('whatsapp-flotante')
    const kanjiHero = document.querySelector('.hero-kanji-fondo')
    const alturaHero = () => document.getElementById('hero').offsetHeight

    let scrollPendiente = false

    function alScrollear() {
        const scroll = window.scrollY

        nav.classList.toggle('scrolled', scroll > 80)

        const total = document.documentElement.scrollHeight - window.innerHeight
        barraProgreso.style.width = total > 0 ? `${(scroll / total) * 100}%` : '0%'

        whatsapp.classList.toggle('visible', scroll > alturaHero() * 0.6)

        if (kanjiHero && !prefiereMenosMovimiento && scroll < alturaHero()) {
            kanjiHero.style.transform =
                `translate(-50%, calc(-50% + ${scroll * 0.25}px))`
        }

        scrollPendiente = false
    }

    window.addEventListener('scroll', () => {
        if (!scrollPendiente) {
            scrollPendiente = true
            requestAnimationFrame(alScrollear)
        }
    }, { passive: true })

    alScrollear()
})
