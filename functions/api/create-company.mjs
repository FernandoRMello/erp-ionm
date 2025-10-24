/**
 * Manipulador para requisições POST (/api/create-company)
 * Cria uma nova empresa, uma assinatura trial e uma loja padrão no D1.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        
        // 1. Obter dados do formulário (enviados pelo app.js)
        const formData = await context.request.json();
        
        // Mapear os campos do formulário para o schema D1
        const companyData = {
            cnpj: formData.cnpj || null,
            name: formData.razao_social, // app.js -> D1
            trading_name: formData.nome_fantasia, // app.js -> D1
            address: JSON.stringify({ // O D1 espera JSON
                full_address: formData.address || '',
                ie: formData.ie || '', // Armazenamos o I.E. aqui
                // O app.js envia 'company_type' e 'business_branch'
                // O schema D1 não os possui na tabela 'companies'
                // Podemos adicioná-los ao JSON se necessário no futuro
            }),
            billing_day: parseInt(formData.billing_day, 10) || 5,
        };

        if (!companyData.name) {
            return new Response(JSON.stringify({ error: 'Razão Social é obrigatória.' }), { status: 400 });
        }

        // 2. Definir data de expiração do Trial (30 dias)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        const contract_expires_at = trialEndDate.toISOString();

        // 3. Usar db.batch() para uma transação com múltiplos inserts
        
        // Primeiro, inserir a empresa e obter seu ID
        const companyInsertStmt = db.prepare(`
            INSERT INTO companies (cnpj, name, trading_name, address, contract_expires_at, status)
            VALUES (?, ?, ?, ?, ?, 'active')
            RETURNING id;
        `);
        
        const newCompany = await companyInsertStmt.bind(
            companyData.cnpj,
            companyData.name,
            companyData.trading_name,
            companyData.address,
            contract_expires_at
        ).first();

        if (!newCompany || !newCompany.id) {
            throw new Error('Falha ao obter o ID da nova empresa.');
        }

        const newCompanyId = newCompany.id;

        // 4. Preparar as inserções dependentes (Assinatura e Loja)
        // Usamos db.batch() para garantir que tudo seja inserido
        
        const statements = [
            // Criar a assinatura 'trial' padrão
            db.prepare(`
                INSERT INTO subscriptions (company_id, plan_key, monthly_cents, user_limit, active, billing_day)
                VALUES (?, 'trial', 0, 5, 1, ?);
            `).bind(newCompanyId, companyData.billing_day),

            // Criar a 'loja-001' padrão (necessária para PDV, Estoque, etc)
            db.prepare(`
                INSERT INTO locations (company_id, code, name, active)
                VALUES (?, 'loja-001', 'Loja Principal', 1);
            `).bind(newCompanyId)
        ];
        
        await db.batch(statements);

        // 5. Retornar sucesso
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Empresa criada com sucesso!',
            companyId: newCompanyId
        }), {
            status: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        
        // Verificar se é um erro de constraint (ex: CNPJ duplicado)
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({ error: 'Erro de duplicidade (CNPJ ou outro campo único já existe).', details: error.message }), { status: 409 }); // 409 Conflict
        }
        
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { status: 500 });
    }
}

/**
 * Manipulador principal da Cloudflare Function
 * Roteia métodos HTTP.
 */
export default async (context) => {
    if (context.request.method === 'POST') {
        return await handlePost(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
};
