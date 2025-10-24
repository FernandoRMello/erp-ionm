/**
 * Manipulador para requisições GET (/api/get-modules)
 * Lista todos os módulos cadastrados no banco de dados D1.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1

        // Buscar os módulos no D1
        const stmt = db.prepare(`
            SELECT id, key, name 
            FROM modules
            ORDER BY name ASC
        `);
        
        const { results } = await stmt.all();

        // Mapear os dados do D1 para o formato que o app.js espera
        // O app.js espera 'id' e 'module_name'
        const modulesForFrontend = results.map(mod => ({
            id: mod.id,
            module_name: mod.name,
            // (Podemos incluir a 'key' se for útil para o frontend no futuro)
            // key: mod.key 
        }));

        return new Response(JSON.stringify(modulesForFrontend), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao listar módulos:', error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Manipulador principal da Cloudflare Function
 * Roteia métodos HTTP.
 */
export default async (context) => {
    if (context.request.method === 'GET') {
        return await handleGet(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
