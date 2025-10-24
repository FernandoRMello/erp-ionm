import { sql } from './neon-client.mjs';
export default async (context) => {
    const req = context.request;

    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
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
        
        console.log(`HANDLER: Consulta bem-sucedida, ${data.length} empresas encontradas para gerenciamento.`); // Log 3: Após consulta

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro no servidor', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

