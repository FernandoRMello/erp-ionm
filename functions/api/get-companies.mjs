/**
 * Manipulador para requisições GET (/api/get-companies)
 * Lista todas as empresas cadastradas para popular menus de seleção.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1

        // Buscar ID e Nome Fantasia (trading_name) das empresas
        const stmt = db.prepare(`
            SELECT id, trading_name 
            FROM companies 
            ORDER BY trading_name ASC
        `);
        
        const { results } = await stmt.all();

        // Mapear os dados do D1 para o formato que o app.js espera
        // O app.js espera 'id' e 'nome_fantasia'
        const companiesForFrontend = results.map(company => ({
            id: company.id,
            nome_fantasia: company.trading_name
        }));

        return new Response(JSON.stringify(companiesForFrontend), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao listar empresas:', error);
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
