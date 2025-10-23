import { sql } from './neon-client.mjs';

export default async (req, context) => {
    try {
        // Roteador baseado no Método HTTP
        if (req.method === 'GET') {
            return await handleGetUsers(req);
        } 
        
        if (req.method === 'POST') {
            return await handleCreateUser(req);
        }

        // Se for outro método (PUT, DELETE, etc.)
        return new Response(JSON.stringify({ error: 'Método não permitido' }), {
            status: 405, headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
};

// --- Lógica de 'get-users.mjs' ---
async function handleGetUsers(req) {
    // Aqui vai a sua lógica de 'get-users.mjs'
    const users = await sql`SELECT * FROM users;`; // Exemplo
    return new Response(JSON.stringify(users), {
        status: 200, headers: { 'Content-Type': 'application/json' }
    });
}

// --- Lógica de 'create-user.mjs' ---
async function handleCreateUser(req) {
    const body = await req.json();
    // Aqui vai a sua lógica de 'create-user.mjs'
    // Ex: const { name, email, ... } = body;
    // await sql`INSERT INTO users (name, email) VALUES (${name}, ${email});`;
    return new Response(JSON.stringify({ success: true, user: body }), {
        status: 201, headers: { 'Content-Type': 'application/json' }
    });
}
