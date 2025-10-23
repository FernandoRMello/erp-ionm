import { sql } from './neon-client.mjs';

export default async (req) => {
    try {
        const { companyId, renewalPeriodDays } = await req.json();
        if (!companyId || !renewalPeriodDays) {
            return new Response(JSON.stringify({ error: 'ID da empresa e período são obrigatórios.' }), { status: 400 });
        }

        const currentCompany = await sql`SELECT contract_end_date FROM companies WHERE id = ${companyId}`;
        if (currentCompany.length === 0) {
            return new Response(JSON.stringify({ error: 'Empresa não encontrada.' }), { status: 404 });
        }
        
        const currentEndDate = currentCompany[0].contract_end_date;
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + parseInt(renewalPeriodDays, 10));

        await sql`UPDATE companies SET contract_end_date = ${newEndDate.toISOString().split('T')[0]} WHERE id = ${companyId};`;

        return new Response(JSON.stringify({ success: true, message: 'Contrato renovado!' }), { status: 200 });
    } catch (error) {
        console.error('Erro ao renovar contrato:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao renovar contrato.' }), { status: 500 });
    }
};

