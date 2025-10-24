import { sql } from './neon-client.mjs';

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const companyData = JSON.parse(event.body);
        const { cnpj, razao_social, nome_fantasia, address, ie, company_type, business_branch, billing_day } = companyData;

        // Define a data de término do contrato para 30 dias a partir de hoje
        const contract_end_date = new Date();
        contract_end_date.setDate(contract_end_date.getDate() + 30);

        await sql`
            INSERT INTO companies (cnpj, razao_social, nome_fantasia, address, ie, company_type, business_branch, billing_day, contract_end_date)
            VALUES (${cnpj}, ${razao_social}, ${nome_fantasia}, ${address}, ${ie}, ${company_type}, ${business_branch}, ${billing_day}, ${contract_end_date});
        `;

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, message: 'Empresa criada com sucesso!' })
        };

    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao criar empresa no servidor.', details: error.message })
        };
    }
};

