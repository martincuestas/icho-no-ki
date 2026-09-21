// Paso 1 del login del panel: mandar al usuario a autorizar en GitHub.
//
// Esta funcion vive en nuestro propio dominio a proposito. Antes el login
// pasaba por el proxy compartido de Netlify (api.netlify.com), que esta
// discontinuado: como era otro origen, el popup no lograba devolverle el
// token al panel y se colgaba mostrando "Authorized".

const SCOPE = 'repo' // el minimo que necesita Decap para commitear

export default async (request) => {
    const clientId = process.env.GITHUB_CLIENT_ID

    if (!clientId) {
        return new Response(
            'Falta cargar GITHUB_CLIENT_ID en las variables de entorno de Netlify.',
            { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
        )
    }

    const url = new URL(request.url)
    const sitio = `${url.protocol}//${url.host}`

    // El state va a GitHub y vuelve en el callback. Lo guardamos tambien en
    // una cookie para comparar: si no coinciden, el pedido no lo iniciamos
    // nosotros y lo rechazamos.
    const state = crypto.randomUUID()

    const parametros = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${sitio}/.netlify/functions/callback`,
        scope: SCOPE,
        state,
    })

    return new Response(null, {
        status: 302,
        headers: {
            Location: `https://github.com/login/oauth/authorize?${parametros}`,
            'Set-Cookie': `panel_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
            'Cache-Control': 'no-store',
        },
    })
}
