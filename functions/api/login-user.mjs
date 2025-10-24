import { sql } from './neon-client.mjs';

export default async (req) => {
    try {
        const { login_user, password } = await req.json();
        const password_hash = `hashed_${password}`; // Simulação de hash

        const result = await sql`SELECT id, name, email, user_type, company_id FROM users WHERE login_user = ${login_user} AND password_hash = ${password_hash};`;
        if (result.length === 0) {
            return new Response(JSON.stringify({ error: 'Usuário ou senha inválidos.' }), { status: 401 });
        }
        const user = result[0];

        const permittedModules = await sql`
            SELECT m.id, m.module_name FROM modules m
            JOIN subscriptions s ON m.id = s.module_id
            WHERE s.company_id = ${user.company_id}
            AND ${user.user_type} = ANY(m.allowed_user_types);
        `;
        
        return new Response(JSON.stringify({ user, permittedModules }), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Erro no servidor durante o login.' }), { status: 500 });
    }
};

