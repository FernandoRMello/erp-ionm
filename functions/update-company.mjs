/**
 * Manipulador para requisições POST (/api/update-company)
 * Atualiza os dados de uma empresa existente no banco D1.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const formData = await context.request.json();

        const {
            id,
            razao_social,       // Mapeia para companies.name
            nome_fantasia,      // Mapeia para companies.trading_name
            address,            // Mapeia para companies.address (JSON)
            billing_day,        // Mapeia para subscriptions.billing_day
            // Campos do app.js que serão ignorados pois não existem no schema D1:
            // ie, company_type, business_branch
        } = formData;

        if (!id) {
            return new Response(JSON.stringify({ error: 'ID da empresa é obrigatório.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Converte a string de endereço do formulário de volta para um objeto JSON
        // O frontend envia "Rua, Numero, Bairro, Cidade, UF"
        const addressParts = (address || '').split(',').map(s => s.trim());
        const addressJson = JSON.stringify({
            logradouro: addressParts[0] || null,
            numero: addressParts[1] || null,
            bairro: addressParts[2] || null,
            municipio: addressParts[3] || null,
            uf: addressParts[4] || null,
        });

        // O D1 não suporta múltiplas queries na mesma transação via .batch() facilmente para UPDATEs
        // Vamos executar as atualizações em sequência.

        // 1. Atualiza a tabela 'companies'
        const stmtCompany = db.prepare(`
            UPDATE companies
            SET 
                name = ?,
                trading_name = ?,
                address = ?
            WHERE id = ?
        `);
        await stmtCompany.bind(
            razao_social,
            nome_fantasia,
            addressJson,
            id
        ).run();

        // 2. Atualiza a tabela 'subscriptions'
        const stmtSubscription = db.prepare(`
            UPDATE subscriptions
            SET 
                billing_day = ?
            WHERE company_id = ?
        `);
        await stmtSubscription.bind(billing_day, id).run();

        return new Response(JSON.stringify({ message: 'Empresa atualizada com sucesso!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
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
