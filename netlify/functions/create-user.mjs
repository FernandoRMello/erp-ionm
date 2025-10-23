import { sql } from './neon-client.mjs';
import { createHash } from 'crypto';
// Função para criar um hash da senha
function hashPassword(password) {
    return createHash('sha256').update(password).digest('hex');
}

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const userData = await req.json();
        const { company_id, name, email, login_user, password, user_type } = userData;

        if (!password) {
            return new Response(JSON.stringify({ error: 'A senha é obrigatória.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const password_hash = hashPassword(password);

        await sql`
            INSERT INTO users (company_id, name, email, login_user, password_hash, user_type)
            VALUES (${company_id}, ${name}, ${email}, ${login_user}, ${password_hash}, ${user_type});
        `;

        return new Response(JSON.stringify({ success: true, message: 'Usuário criado com sucesso!' }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao criar usuário.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

