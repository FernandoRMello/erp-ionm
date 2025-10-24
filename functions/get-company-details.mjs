/**
 * Manipulador para requisições GET (/api/get-company-details?id=...)
 * Busca os detalhes completos de uma empresa para o modal de edição.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const url = new URL(context.request.url);
        const companyId = url.searchParams.get('id');

        if (!companyId) {
            return new Response(JSON.stringify({ error: 'ID da empresa é obrigatório' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar dados da empresa e sua assinatura (para o billing_day)
        const stmt = db.prepare(`
            SELECT 
                c.id,
                c.name,
                c.trading_name,
                c.address,
                s.billing_day
            FROM companies c
            LEFT JOIN subscriptions s ON c.id = s.company_id
            WHERE c.id = ?
        `);
        
        const company = await stmt.bind(companyId).first();

        if (!company) {
            return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- Mapeamento para o app.js ---
        // O app.js (frontend) espera nomes de campos do schema ANTIGO.
        
        // 1. Reformata o endereço JSON (armazenado em D1) para a string (esperada pelo app.js)
        let addressString = "";
        if (company.address) {
            try {
                // O endereço foi salvo como string JSON
                const addr = JSON.parse(company.address); 
                addressString = [addr.logradouro, addr.numero, addr.bairro, addr.municipio, addr.uf].filter(Boolean).join(', ');
            } catch (e) {
                // Fallback caso o dado não seja JSON
                addressString = company.address; 
            }
        }

        // 2. Mapeia os campos
        const companyForFrontend = {
            id: company.id,
            razao_social: company.name,         // D1 'name' -> app.js 'razao_social'
            nome_fantasia: company.trading_name, // D1 'trading_name' -> app.js 'nome_fantasia'
            address: addressString,              // D1 'address' (JSON) -> app.js 'address' (string)
            billing_day: company.billing_day,    // D1 'billing_day' (da subscription)
            
            // Campos que o app.js espera, mas NÃO existem no novo schema D1
            ie: null, 
            company_type: null,
            business_branch: null
        };

        return new Response(JSON.stringify(companyForFrontend), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao buscar detalhes da empresa:', error);
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
    if (context.request.method === 'GET') {
        return await handleGet(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
