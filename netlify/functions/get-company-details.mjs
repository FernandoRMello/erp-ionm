import { sql } from './neon-client.mjs';
export default async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('id');

        if (!companyId) {
            return new Response(JSON.stringify({ error: 'ID da empresa é obrigatório' }), { status: 400 });
        }

        const result = await sql`SELECT * FROM companies WHERE id = ${companyId};`;

        if (result.length === 0) {
            return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), { status: 404 });
        }

        return new Response(JSON.stringify(result[0]), { status: 200 });
    } catch (error) {
        console.error('Erro ao buscar detalhes da empresa:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor.' }), { status: 500 });
    }
};
