import { sql } from './neon-client.mjs';
export const handler = async (event) => {
    console.log("HANDLER: Iniciando get-subscription-management..."); // Log 1: Início da função

    if (event.httpMethod !== 'GET') {
        console.warn("HANDLER: Método não permitido:", event.httpMethod);
        return { 
            statusCode: 405, 
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    try {
        console.log("HANDLER: Tentando buscar dados de gerenciamento no banco..."); // Log 2: Antes da consulta
        
        const data = await sql`
            SELECT 
                c.id, 
                c.nome_fantasia, 
                c.user_limit,
                (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS current_users
            FROM 
                companies c
            ORDER BY
                c.nome_fantasia ASC;
        `;
        
        console.log(`HANDLER: Consulta bem-sucedida, ${data.length} empresas encontradas para gerenciamento.`); // Log 3: Após consulta

        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        console.error('HANDLER: Erro CRÍTICO ao buscar dados de gerenciamento:', error); // Log 4: Captura de erro
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro no servidor ao buscar dados de gerenciamento.', details: error.message }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};

