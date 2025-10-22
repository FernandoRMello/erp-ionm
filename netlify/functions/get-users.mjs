import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
    console.log("HANDLER: Iniciando get-users..."); // Log 1: Início da função

    if (req.method !== 'GET') {
        console.warn("HANDLER: Método não permitido:", req.method);
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        console.log("HANDLER: Tentando buscar usuários no banco..."); // Log 2: Antes da consulta
        
        // Consulta SQL atualizada para usar LEFT JOIN.
        const users = await sql`
            SELECT 
                u.id, 
                u.name, 
                u.login_user, 
                u.user_type, 
                c.nome_fantasia AS company_name 
            FROM 
                users u
            LEFT JOIN 
                companies c ON u.company_id = c.id
            ORDER BY 
                u.name ASC;
        `;
        
        console.log(`HANDLER: Consulta bem-sucedida, ${users.length} usuários encontrados.`); // Log 3: Após a consulta

        return new Response(JSON.stringify(users), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('HANDLER: Erro CRÍTICO ao buscar usuários:', error); // Log 4: Captura de erro
        return new Response(JSON.stringify({ error: 'Erro no servidor ao buscar usuários.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

