/**
 * Manipulador para requisições POST (/api/update-user-limit)
 * Atualiza o limite de usuários (user_limit) para uma empresa na tabela 'subscriptions'.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const body = await context.request.json();

        const { companyId, newUserLimit } = body;

        // Validação dos dados recebidos
        if (!companyId || !newUserLimit) {
            return new Response(JSON.stringify({ error: 'ID da empresa e novo limite são obrigatórios.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const limit = parseInt(newUserLimit, 10);
        if (isNaN(limit) || limit <= 0) {
            return new Response(JSON.stringify({ error: 'O novo limite deve ser um número positivo.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Atualiza a tabela 'subscriptions'
        const stmt = db.prepare(`
            UPDATE subscriptions
            SET 
                user_limit = ?
            WHERE 
                company_id = ?
        `);
        
        const info = await stmt.bind(limit, companyId).run();

        if (info.changes === 0) {
            // Isso pode acontecer se o company_id não existir na tabela subscriptions
            return new Response(JSON.stringify({ error: 'Nenhuma assinatura encontrada para esta empresa.' }), { 
                status: 404, // Not Found
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ message: 'Limite de usuários atualizado com sucesso!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao atualizar limite de usuários:', error);
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
    if (context.request.method === 'POST') {
        return await handlePost(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
