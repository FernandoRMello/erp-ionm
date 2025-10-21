import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }

        const moduleData = JSON.parse(event.body);
        const { module_name, description, version, monthly_cost_brl, allowed_user_types, applicable_business_branches } = moduleData;

        await sql`
            INSERT INTO modules (module_name, description, version, monthly_cost_brl, allowed_user_types, applicable_business_branches)
            VALUES (${module_name}, ${description}, ${version}, ${monthly_cost_brl}, ${allowed_user_types}, ${applicable_business_branches});
        `;

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, message: 'Módulo criado com sucesso!' })
        };
    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro no servidor ao criar módulo.' })
        };
    }
};

