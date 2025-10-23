// PASSO 1: Importar o 'sql' pronto do nosso cliente central
import { sql } from './neon-client.mjs';

// ====================================================================
// INÍCIO DA LÓGICA DA FUNÇÃO
// ====================================================================
export default async (req, context) => {
    // Apenas aceite o método POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Método não permitido' }), {
            status: 405, headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        let { companyId, moduleIds } = body;

        // LOGGING DE DEPURAÇÃO
        console.log('[update-subscriptions] Dados recebidos:', JSON.stringify(body));

        // Validação
        if (companyId === undefined || companyId === null || !Array.isArray(moduleIds)) {
            console.error('[update-subscriptions] Falha na validação:', { companyId, moduleIds });
            return new Response(JSON.stringify({ error: 'ID da empresa e um array de IDs de módulos são obrigatórios.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // GARANTIR TIPOS DE DADOS (Inteiros)
        const numericCompanyId = parseInt(companyId, 10);
        const numericModuleIds = moduleIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

        if (isNaN(numericCompanyId)) {
             console.error('[update-subscriptions] ID da empresa é inválido:', companyId);
             return new Response(JSON.stringify({ error: 'ID da empresa é inválido.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
             });
        }
        
        console.log(`[update-subscriptions] A processar: CompanyID=${numericCompanyId}, ModuleIDs=${numericModuleIds.join(',')}`);

        // Transação: Deleta as assinaturas antigas e insere as novas
        await sql.transaction(async (tx) => {
            // 1. Deleta todas as assinaturas existentes
            console.log(`[update-subscriptions] A deletar assinaturas antigas para company_id: ${numericCompanyId}`);
            await tx`DELETE FROM subscriptions WHERE company_id = ${numericCompanyId};`;
            
            // 2. Insere as novas assinaturas (se houver alguma)
            if (numericModuleIds.length > 0) {
                const subscriptionsToInsert = numericModuleIds.map(moduleId => ({
                    company_id: numericCompanyId,
                    module_id: moduleId
                }));
                
                console.log(`[update-subscriptions] A inserir ${subscriptionsToInsert.length} novas assinaturas.`);
                await tx`INSERT INTO subscriptions ${sql(subscriptionsToInsert, 'company_id', 'module_id')};`;
            } else {
                 console.log(`[update-subscriptions] Nenhum módulo selecionado. Apenas o DELETE foi executado.`);
            }
        });

        console.log(`[update-subscriptions] Sucesso para company_id: ${numericCompanyId}`);
        return new Response(JSON.stringify({ success: true, message: 'Assinaturas atualizadas com sucesso!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // LOGGING DE ERRO DETALHADO
        console.error('[update-subscriptions] Erro catastrófico:', error.message, error.stack);
        
        return new Response(JSON.stringify({ 
            error: 'Erro no servidor ao atualizar assinaturas.',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

