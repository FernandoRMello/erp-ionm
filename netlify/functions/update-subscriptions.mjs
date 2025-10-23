import { neon } from '@netlify/neon';

// Use a variável de ambiente correta (provavelmente DATABASE_URL, não NETLIFY_DATABASE_URL)
// Verifique no seu painel Netlify -> Site configuration -> Environment variables
const sql = neon(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL);

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

        // ====================================================================
        // PASSO 1: LOGGING DE DEPURAÇÃO (CRUCIAL)
        // Verifique os logs da sua função no painel Netlify para ver esta linha
        // ====================================================================
        console.log('[update-subscriptions] Dados recebidos:', JSON.stringify(body));

        // Validação
        if (!companyId || !Array.isArray(moduleIds)) {
            console.error('[update-subscriptions] Falha na validação:', { companyId, moduleIds });
            return new Response(JSON.stringify({ error: 'ID da empresa e um array de IDs de módulos são obrigatórios.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ====================================================================
        // PASSO 2: GARANTIR TIPOS DE DADOS (A CORREÇÃO MAIS PROVÁVEL)
        // Converte todos os IDs para Inteiros para evitar erros de SQL.
        // ====================================================================
        const numericCompanyId = parseInt(companyId, 10);
        const numericModuleIds = moduleIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)); // Filtra IDs inválidos

        if (isNaN(numericCompanyId)) {
             console.error('[update-subscriptions] ID da empresa é inválido:', companyId);
             return new Response(JSON.stringify({ error: 'ID da empresa é inválido.' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
             });
        }
        
        // Log para vermos os dados "limpos"
        console.log(`[update-subscriptions] A processar: CompanyID=${numericCompanyId}, ModuleIDs=${numericModuleIds.join(',')}`);


        // Transação: Deleta as assinaturas antigas e insere as novas
        await sql.transaction(async (tx) => {
            // 1. Deleta todas as assinaturas existentes para esta empresa
            console.log(`[update-subscriptions] A deletar assinaturas antigas para company_id: ${numericCompanyId}`);
            await tx`DELETE FROM subscriptions WHERE company_id = ${numericCompanyId};`;
            
            // 2. Insere as novas assinaturas (se houver alguma)
            if (numericModuleIds.length > 0) {
                const subscriptionsToInsert = numericModuleIds.map(moduleId => ({
                    company_id: numericCompanyId,
                    module_id: moduleId
                }));
                
                console.log(`[update-subscriptions] A inserir ${subscriptionsToInsert.length} novas assinaturas.`);
                
                // A função `sql` pode inserir múltiplos registros de uma vez
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
        // ====================================================================
        // PASSO 3: LOGGING DE ERRO DETALHADO
        // ====================================================================
        console.error('[update-subscriptions] Erro catastrófico:', error);
        console.error('[update-subscriptions] Request Body que falhou:', JSON.stringify(req.body)); // Loga o body que causou o erro

        return new Response(JSON.stringify({ 
            error: 'Erro no servidor ao atualizar assinaturas.',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
