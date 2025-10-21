import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const companyData = JSON.parse(event.body);
        const { id, razao_social, nome_fantasia, address, ie, company_type, business_branch, billing_day } = companyData;

        if (!id) {
            return { statusCode: 400, body: JSON.stringify({ error: 'ID da empresa é obrigatório para atualização' }) };
        }

        await sql`
            UPDATE companies 
            SET 
                razao_social = ${razao_social},
                nome_fantasia = ${nome_fantasia},
                address = ${address},
                ie = ${ie},
                company_type = ${company_type},
                business_branch = ${business_branch},
                billing_day = ${billing_day}
            WHERE id = ${id};
        `;
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Empresa atualizada com sucesso!' })
        };
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro no servidor ao atualizar empresa.' })
        };
    }
};

