import { sql } from './neon-client.mjs';

export default async (req) => {
    try {
        const { companyId, moduleIds } = await req.json();

        if (!companyId || !Array.isArray(moduleIds)) {
            return new Response(JSON.stringify({ error: 'ID da empresa e um array de IDs de módulos são obrigatórios.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Transação: Deleta as assinaturas antigas e insere as novas
        // Isso garante que a operação seja atômica (ou tudo funciona, ou nada)
        await sql.transaction(async (tx) => {
            // 1. Deleta todas as assinaturas existentes para esta empresa
            await tx`DELETE FROM subscriptions WHERE company_id = ${companyId};`;

            // 2. Insere as novas assinaturas (se houver alguma)
            if (moduleIds.length > 0) {
                const subscriptionsToInsert = moduleIds.map(moduleId => ({
                    company_id: companyId,
                    module_id: moduleId
                }));
                
                // A função `sql` pode inserir múltiplos registros de uma vez
                await tx`INSERT INTO subscriptions ${sql(subscriptionsToInsert, 'company_id', 'module_id')};`;
            }
        });

        return new Response(JSON.stringify({ success: true, message: 'Assinaturas atualizadas com sucesso!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao atualizar assinaturas:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao atualizar assinaturas.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

