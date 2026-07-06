// ============================================
// MENÚ HAMBURGUESA
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    const hamburguesa = document.getElementById('hamburguesa')
    const navMenu = document.getElementById('nav-menu')

    if (hamburguesa && navMenu) {
        hamburguesa.addEventListener('click', () => {
            hamburguesa.classList.toggle('activo')
            navMenu.classList.toggle('abierto')
        })

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburguesa.classList.remove('activo')
                navMenu.classList.remove('abierto')
            })
        })
    }

    // ============================================
    // ANIMACIONES DE SCROLL
    // ============================================

    const elementosAnimados = document.querySelectorAll(
        '.tarjeta-clase, .bloque-filosofia, .evento, .bloque-dojo, .dato-contacto, .kanji-item, .grilla-galeria, .sensei'
    )

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible')
            }
        })
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    })

    elementosAnimados.forEach(elemento => {
        observer.observe(elemento)
    })

    // ============================================
    // NAV — se achica al hacer scroll
    // ============================================

    const nav = document.querySelector('nav')

    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            nav.style.padding = '12px 60px'
            nav.style.borderBottomColor = 'rgba(255,255,255,0.12)'
        } else {
            nav.style.padding = '20px 60px'
            nav.style.borderBottomColor = 'rgba(255,255,255,0.08)'
        }
    })

    // ============================================
    // PARALLAX HERO
    // ============================================

    const kanjiHero = document.querySelector('.hero-kanji-fondo')

    window.addEventListener('scroll', () => {
        const scroll = window.scrollY
        if (kanjiHero) {
            kanjiHero.style.transform = `translate(-50%, calc(-50% + ${scroll * 0.2}px))`
        }
    })

})