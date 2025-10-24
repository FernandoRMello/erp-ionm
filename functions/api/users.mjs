import { sql } from '../neon-client.mjs'; // Ajuste o caminho
import { createHash } from 'crypto';

// --- Lógica do create-user.mjs ---
function hashPassword(password) {
    return createHash('sha256').update(password).digest('hex');
}

async function handlePost(req) {
    try {
        const userData = await req.json();
        const { company_id, name, email, login_user, password, user_type } = userData;

        if (!password) {
            return new Response(JSON.stringify({ error: 'A senha é obrigatória.' }), { status: 400 });
        }

        const password_hash = hashPassword(password);
        await sql`INSERT INTO users ...`; // Sua lógica de insert

        return new Response(JSON.stringify({ success: true, message: 'Usuário criado!' }), { status: 201 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro no servidor', details: error.message }), { status: 500 });
    }
}

// --- Lógica do get-users.mjs ---
async function handleGet(req) {
    try {
        const users = await sql`SELECT u.id, u.name, ... FROM users u ...`; // Sua lógica de select

        return new Response(JSON.stringify(users), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro no servidor', details: error.message }), { status: 500 });
    }
}

// --- O Manipulador Principal (Handler) ---
export default async (context) => {
    const req = context.request;

    if (req.method === 'GET') {
        return await handleGet(req);
    }

    if (req.method === 'POST') {
        return await handlePost(req);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
};