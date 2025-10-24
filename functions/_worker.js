/**
 * Worker Router para Cloudflare Functions
 * 
 * - Detecta automaticamente todos os endpoints dentro de /functions/api
 * - Cada arquivo .mjs deve exportar uma função padrão (default) que receba (request, env)
 * - Integra o banco Cloudflare D1 via env.D1_DATABASE
 * - Suporta métodos GET, POST, PUT, DELETE
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ===============================
    // 1️⃣ - FRONTEND (arquivos estáticos)
    // ===============================
    // Permite servir index.html, app.js, /modules e demais assets
    if (
      path === "/" ||
      path.endsWith(".html") ||
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.startsWith("/modules/")
    ) {
      return env.ASSETS.fetch(request);
    }

    // ===============================
    // 2️⃣ - BACKEND (API via Cloudflare Functions)
    // ===============================
    if (path.startsWith("/api/")) {
      try {
        // Extrai o nome da função do caminho: /api/login-user -> login-user.mjs
        const route = path.replace("/api/", "");
        const modulePath = `./api/${route}.mjs`;

        // Importa dinamicamente o módulo
        const module = await import(modulePath);

        // Verifica se o módulo possui export default
        if (typeof module.default !== "function") {
          return new Response(
            `O arquivo ${modulePath} não exporta uma função default.`,
            { status: 500 }
          );
        }

        // Executa a função exportada
        return await module.default(request, env, ctx);
      } catch (err) {
        console.error("Erro na API:", err);
        return new Response(
          JSON.stringify({
            error: "Rota não encontrada ou erro interno",
            message: err.message,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ===============================
    // 3️⃣ - ROTA PADRÃO (404)
    // ===============================
    return new Response("404 | Recurso não encontrado", { status: 404 });
  },
};
