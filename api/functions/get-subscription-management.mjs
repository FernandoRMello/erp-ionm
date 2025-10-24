/**
 * Manipulador para requisições GET (/api/get-subscription-management)
 * Lista todas as empresas com seus limites de usuários (do plano)
 * e a contagem atual de usuários ativos.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1

        // Esta query busca a empresa, o limite de usuários da sua assinatura,
        // e usa uma sub-query para contar quantos usuários ativos ela possui.
        const stmt = db.prepare(`
            SELECT 
                c.id,
                c.trading_name,
                s.user_limit,
                (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.active = 1) as current_users
            FROM companies c
            LEFT JOIN subscriptions s ON c.id = s.company_id
            ORDER BY c.trading_name ASC
        `);
        
        const { results } = await stmt.all();

        // Mapear os dados do D1 para o formato que o app.js espera
        // O app.js espera 'id', 'nome_fantasia', 'current_users', 'user_limit'
        const managementData = results.map(item => ({
            id: item.id,
            nome_fantasia: item.trading_name, // D1 'trading_name' -> app.js 'nome_fantasia'
            current_users: item.current_users,
            user_limit: item.user_limit || 0 // Garante que não seja null
        }));

        return new Response(JSON.stringify(managementData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao buscar dados de gestão de assinaturas:', error);
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
