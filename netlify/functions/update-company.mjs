import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const { companyId, moduleIds } = await req.json();

        if (!companyId || !Array.isArray(moduleIds)) {
            return new Response(JSON.stringify({ error: 'ID da empresa e um array de IDs de módulos são obrigatórios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Transação: Primeiro apaga os vínculos antigos e depois insere os novos.
        await sql.transaction(async (tx) => {
            await tx`DELETE FROM subscriptions WHERE company_id = ${companyId};`;
            if (moduleIds.length > 0) {
                for (const moduleId of moduleIds) {
                    await tx`INSERT INTO subscriptions (company_id, module_id) VALUES (${companyId}, ${moduleId});`;
                }
            }
        });

        return new Response(JSON.stringify({ success: true, message: 'Vínculos atualizados com sucesso!' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        // Corrigido: Usando a variável 'error' que é definida pelo catch.
        console.error('Erro ao atualizar vínculos:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao atualizar vínculos.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
