/**
 * Manipulador para requisições POST (/api/renew-contract)
 * Renova o contrato de uma empresa, atualizando sua data de expiração.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const body = await context.request.json();

        const { companyId, renewalPeriodDays } = body;

        // Validação dos dados
        if (!companyId || !renewalPeriodDays) {
            return new Response(JSON.stringify({ error: 'ID da empresa e período de renovação são obrigatórios.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const daysToAdd = parseInt(renewalPeriodDays, 10);
        if (isNaN(daysToAdd) || daysToAdd <= 0) {
            return new Response(JSON.stringify({ error: 'Período de renovação inválido.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Buscar a data de expiração atual
        const stmtGetDate = db.prepare(`
            SELECT contract_expires_at FROM companies WHERE id = ?
        `);
        const company = await stmtGetDate.bind(companyId).first();

        if (!company) {
            return new Response(JSON.stringify({ error: 'Empresa não encontrada.' }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Calcular a nova data
        // Usa a data atual se a data de expiração for antiga (já expirou)
        // ou a data de expiração se ainda for futura.
        const baseDate = new Date(company.contract_expires_at) > new Date() 
            ? new Date(company.contract_expires_at)
            : new Date();
            
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        const newExpiryDate = baseDate.toISOString(); // Formato 'YYYY-MM-DDTHH:MM:SS.SSSZ'

        // 3. Atualizar o banco de dados
        const stmtUpdate = db.prepare(`
            UPDATE companies
            SET 
                contract_expires_at = ?,
                status = 'active'
            WHERE 
                id = ?
        `);
        
        await stmtUpdate.bind(newExpiryDate, companyId).run();

        return new Response(JSON.stringify({ message: 'Contrato renovado com sucesso!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao renovar contrato:', error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Manipulador principal da Cloudflare Function
 */
export default async (context) => {
    if (context.request.method === 'POST') {
        return await handlePost(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
