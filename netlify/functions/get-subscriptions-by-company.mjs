import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');
        if (!companyId) return new Response(JSON.stringify({ error: 'ID da empresa é obrigatório' }), { status: 400 });
        
        const subscriptions = await sql`SELECT module_id FROM subscriptions WHERE company_id = ${companyId};`;
        return new Response(JSON.stringify(subscriptions.map(s => s.module_id)), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar assinaturas.' }), { status: 500 });
    }
};

