// Paso 2 del login: GitHub vuelve con un code, lo canjeamos por un token
// y se lo entregamos al panel.
//
// El intercambio de mensajes es el que espera Decap CMS:
//   panel  ->  abre este popup
//   popup  ->  "authorizing:github"
//   panel  ->  responde con el mismo texto
//   popup  ->  "authorization:github:success:{token, provider}"
//
// Como el popup y el panel comparten dominio, ese ida y vuelta no cruza
// origenes: ahi es donde fallaba la version anterior.

const PROVEEDOR = 'github'

// La descripcion de error la escribe GitHub, asi que no la insertamos cruda
function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ))
}

function respuesta(estado, contenido) {
    const mensaje = `authorization:${PROVEEDOR}:${estado}:${JSON.stringify(contenido)}`
    const aviso = estado === 'success'
        ? 'Listo. Ya podes cerrar esta ventana.'
        : `No se pudo iniciar sesion: ${escapar(contenido.message)}`

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Panel — Icho no Ki</title></head>
<body style="font-family:system-ui,sans-serif;padding:40px;text-align:center;color:#16140f">
<p>${aviso}</p>
<script>
(function () {
    if (!window.opener) {
        document.body.insertAdjacentHTML('beforeend',
            '<p>Entra al panel desde /admin en vez de abrir esta direccion directo.</p>')
        return
    }
    function recibir(evento) {
        window.removeEventListener('message', recibir, false)
        window.opener.postMessage(${JSON.stringify(mensaje)}, evento.origin)
    }
    window.addEventListener('message', recibir, false)
    window.opener.postMessage('authorizing:${PROVEEDOR}', '*')
})()
</script>
</body>
</html>`

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            // El state ya se uso, no sirve mas
            'Set-Cookie': 'panel_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
        },
    })
}

export default async (request) => {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        return respuesta('error', {
            message: 'Faltan GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET en las variables de entorno de Netlify.',
        })
    }

    const url = new URL(request.url)

    if (url.searchParams.get('error')) {
        return respuesta('error', {
            message: url.searchParams.get('error_description') || url.searchParams.get('error'),
        })
    }

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
        return respuesta('error', { message: 'GitHub no devolvio el codigo de autorizacion.' })
    }

    const cookies = request.headers.get('cookie') || ''
    const esperado = cookies.match(/(?:^|;\s*)panel_state=([^;]+)/)?.[1]

    if (!esperado || esperado !== state) {
        return respuesta('error', {
            message: 'El pedido no coincide con el que iniciamos. Volve a intentar desde /admin.',
        })
    }

    let datos
    try {
        const r = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
        })
        datos = await r.json()
    } catch (error) {
        return respuesta('error', { message: 'No se pudo contactar a GitHub: ' + error.message })
    }

    if (datos.error || !datos.access_token) {
        return respuesta('error', {
            message: datos.error_description || datos.error || 'GitHub no devolvio un token.',
        })
    }

    return respuesta('success', { token: datos.access_token, provider: PROVEEDOR })
}
