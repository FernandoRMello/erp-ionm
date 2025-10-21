import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async () => {
    try {
        const users = await sql`SELECT u.name, u.login_user, u.user_type, c.nome_fantasia as company_name FROM users u JOIN companies c ON u.company_id = c.id ORDER BY u.name;`;
        return new Response(JSON.stringify(users), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar usuários.' }), { status: 500 });
    }
};

