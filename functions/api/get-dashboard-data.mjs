/**
 * Manipulador para requisições GET (/api/get-dashboard-data)
 * Busca os dados consolidados para o dashboard gerencial,
 * baseado no novo schema D1.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const { results } = await db.batch([
            // 1. Contagem total de empresas
            db.prepare("SELECT COUNT(*) as total FROM companies"),
            
            // 2. Contagem total de usuários
            db.prepare("SELECT COUNT(*) as total FROM users"),

            // 3. Receita mensal total (soma de todas as assinaturas ativas)
            db.prepare("SELECT SUM(monthly_cents) as total FROM subscriptions WHERE active = 1"),

            // 4. Receita por dia de faturamento (agrupado)
            db.prepare(`
                SELECT billing_day, SUM(monthly_cents) as total_cents
                FROM subscriptions 
                WHERE active = 1 AND billing_day IS NOT NULL
                GROUP BY billing_day
            `),

            // 5. Empresas com contrato expirando nos próximos 7 dias
            db.prepare(`
                SELECT id, trading_name, contract_expires_at 
                FROM companies 
                WHERE contract_expires_at BETWEEN datetime('now') AND datetime('now', '+7 days')
                ORDER BY contract_expires_at ASC
            `),

            // 6. Custo mensal por empresa (para o modal de renovação)
            db.prepare(`
                SELECT company_id, monthly_cents 
                FROM subscriptions 
                WHERE active = 1
            `)
        ]);

        // Processar os resultados do batch
        const total_companies = results[0]?.results[0]?.total || 0;
        const total_users = results[1]?.results[0]?.total || 0;
        const total_monthly_revenue_cents = results[2]?.results[0]?.total || 0;
        
        // Formatar receita por dia
        const revenue_by_day_cents = results[3]?.results || [];
        const revenue_by_day_formatted = { 5: "0.00", 10: "0.00", 15: "0.00", 20: "0.00", 25: "0.00" };
        revenue_by_day_cents.forEach(item => {
            if (revenue_by_day_formatted.hasOwnProperty(item.billing_day)) {
                revenue_by_day_formatted[item.billing_day] = (item.total_cents / 100).toFixed(2);
            }
        });

        // Formatar empresas expirando
        const companies_nearing_expiration = (results[4]?.results || []).map(c => ({
            id: c.id,
            // app.js espera 'nome_fantasia'
            nome_fantasia: c.trading_name,
            // app.js espera 'contract_end_date'
            contract_end_date: c.contract_expires_at
        }));

        // Formatar custos por empresa
        const company_monthly_costs_cents = results[5]?.results || [];
        const company_monthly_costs_formatted = {};
        company_monthly_costs_cents.forEach(item => {
            // app.js espera BRL (ex: 89.80)
            company_monthly_costs_formatted[item.company_id] = (item.monthly_cents / 100).toFixed(2);
        });

        // Montar o objeto de resposta final que o app.js espera
        const responseData = {
            total_companies: total_companies,
            total_users: total_users,
            // app.js espera BRL (ex: 239.50)
            total_monthly_revenue: (total_monthly_revenue_cents / 100).toFixed(2),
            revenue_by_day: revenue_by_day_formatted,
            companies_nearing_expiration: companies_nearing_expiration,
            company_monthly_costs: company_monthly_costs_formatted
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
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
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
};
