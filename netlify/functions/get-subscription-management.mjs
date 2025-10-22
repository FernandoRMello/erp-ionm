import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const { companyId, newUserLimit } = await req.json();

        if (!companyId || newUserLimit === undefined || newUserLimit < 0) {
            return new Response(JSON.stringify({ error: 'ID da empresa e um novo limite válido são obrigatórios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        await sql`
            UPDATE companies
            SET user_limit = ${newUserLimit}
            WHERE id = ${companyId};
        `;

        return new Response(JSON.stringify({ success: true, message: 'Limite de usuários atualizado.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Erro ao atualizar limite de usuários:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao atualizar o limite.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
