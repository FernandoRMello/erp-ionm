/**
 * Manipulador para requisições GET (/api/get-subscriptions-by-company?companyId=...)
 * Busca os IDs dos módulos que uma empresa específica assina.
 *
 * O frontend app.js espera um array de IDs numéricos (ex: [1, 2, 3]).
 * Nosso schema D1 (company_modules) salva por 'module_key' (string).
 * Esta função faz a "tradução" de volta para IDs.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const url = new URL(context.request.url);
        const companyId = url.searchParams.get('companyId');

        if (!companyId) {
            return new Response(JSON.stringify({ error: 'ID da empresa é obrigatório' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Esta query busca em `company_modules` pelas 'module_key's da empresa
        // e faz um JOIN com a tabela `modules` para obter o 'id' numérico de cada módulo.
        const stmt = db.prepare(`
            SELECT 
                m.id
            FROM company_modules cm
            JOIN modules m ON cm.module_key = m.key
            WHERE cm.company_id = ?
        `);
        
        const { results } = await stmt.bind(companyId).all();

        // Mapeia os resultados para um array simples de IDs
        // ex: [{id: 1}, {id: 3}] -> [1, 3]
        const subscribedIds = results.map(item => item.id);

        return new Response(JSON.stringify(subscribedIds), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao buscar assinaturas da empresa:', error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Manipulador principal da Cloudflare Function
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
