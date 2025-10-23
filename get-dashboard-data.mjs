import { sql } from './neon-client.mjs';
const USER_PRICES = {
    'ADMINISTRADOR': 49.90, 'GERENTE': 29.90, 'VENDEDOR': 19.90,
    'ESTOQUE': 19.90, 'USUARIO': 9.90
};

export default async () => {
    try {
        const companyCountResult = await sql`SELECT COUNT(*) FROM companies;`;
        const userCountResult = await sql`SELECT COUNT(*) FROM users;`;
        const total_companies = parseInt(companyCountResult[0].count, 10);
        const total_users = parseInt(userCountResult[0].count, 10);

        const usersWithBilling = await sql`SELECT u.user_type, c.billing_day FROM users u JOIN companies c ON u.company_id = c.id;`;
        let total_monthly_revenue = 0;
        const revenue_by_day = { 5: 0, 10: 0, 15: 0, 20: 0, 25: 0 };
        usersWithBilling.forEach(user => {
            const price = USER_PRICES[user.user_type] || 0;
            total_monthly_revenue += price;
            if (revenue_by_day.hasOwnProperty(user.billing_day)) {
                revenue_by_day[user.billing_day] += price;
            }
        });

        const companies_nearing_expiration = await sql`SELECT id, nome_fantasia, contract_end_date FROM companies WHERE contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' ORDER BY contract_end_date;`;
        
        const companyCostsResult = await sql`SELECT c.id as company_id, u.user_type FROM companies c JOIN users u ON c.id = u.company_id;`;
        const company_monthly_costs = {};
        companyCostsResult.forEach(row => {
            if (!company_monthly_costs[row.company_id]) company_monthly_costs[row.company_id] = 0;
            company_monthly_costs[row.company_id] += USER_PRICES[row.user_type] || 0;
        });

        const dashboardData = {
            total_companies, total_users,
            total_monthly_revenue: total_monthly_revenue.toFixed(2),
            total_contract_value: total_monthly_revenue.toFixed(2),
            revenue_by_day: Object.fromEntries(Object.entries(revenue_by_day).map(([day, value]) => [day, value.toFixed(2)])),
            companies_nearing_expiration, company_monthly_costs
        };

        return new Response(JSON.stringify(dashboardData), { status: 200 });
    } catch (error) {
        console.error('Erro ao buscar dados da dashboard:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao buscar dados da dashboard.' }), { status: 500 });
    }
};

