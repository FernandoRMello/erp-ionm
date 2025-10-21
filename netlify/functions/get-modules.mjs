import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        // Busca apenas as colunas necessárias (id, module_name) para evitar erros e otimizar a performance.
        const modules = await sql`SELECT id, module_name FROM modules ORDER BY module_name ASC;`;

        return {
            statusCode: 200,
            body: JSON.stringify(modules)
        };

    } catch (error) {
        console.error('Erro ao buscar módulos:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao buscar módulos.', details: error.message })
        };
    }
};

