import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        // Busca todas as empresas e conta quantos usuários cada uma possui
        const data = await sql`
            SELECT 
                c.id, 
                c.nome_fantasia, 
                c.user_limit,
                (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS current_users
            FROM 
                companies c
            ORDER BY
                c.nome_fantasia ASC;
        `;
        
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Erro ao buscar dados de gerenciamento:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao buscar dados de gerenciamento.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
