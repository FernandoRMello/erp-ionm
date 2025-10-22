import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        // Consulta SQL que junta a tabela de usuários com a de empresas para obter o nome da empresa.
        const users = await sql`
            SELECT 
                u.id, 
                u.name, 
                u.login_user, 
                u.user_type, 
                c.nome_fantasia AS company_name 
            FROM 
                users u
            JOIN 
                companies c ON u.company_id = c.id
            ORDER BY 
                u.name ASC;
        `;

        return new Response(JSON.stringify(users), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao buscar usuários.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};


