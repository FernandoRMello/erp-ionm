import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

// NOTA: Esta é uma implementação SIMPLIFICADA para demonstração.
// Uma implementação real exigiria validação de JWT, extração do JTI e da data de expiração.
export const handler = async (event) => {
    console.log("HANDLER: Iniciando logout-user...");

    if (event.httpMethod !== 'POST') {
        console.warn("HANDLER: Método não permitido:", event.httpMethod);
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }), headers: { 'Content-Type': 'application/json' }};
    }

    try {
        // Assume que o frontend envia o token no corpo da requisição (simplificado)
        // Uma implementação real extrairia o token do header Authorization.
        const body = JSON.parse(event.body || '{}');
        const tokenToBlock = body.token; // Em uma implementação real, seria o JTI do token

        if (!tokenToBlock) {
             console.warn("HANDLER: Token não fornecido para blocklist.");
            return { statusCode: 400, body: JSON.stringify({ error: 'Token não fornecido.' }), headers: { 'Content-Type': 'application/json' }};
        }

        // Simula a data de expiração (ex: 1 hora a partir de agora)
        const expires_at = new Date(Date.now() + 60 * 60 * 1000); 

        console.log("HANDLER: Adicionando token à blocklist (simulado)...", tokenToBlock);

        // Insere na blocklist (usando o próprio token como JTI para simplificar)
        // ON CONFLICT DO NOTHING evita erro se o token já foi bloqueado
        await sql`
            INSERT INTO jwt_blocklist (token_jti, expires_at) 
            VALUES (${tokenToBlock}, ${expires_at})
            ON CONFLICT (token_jti) DO NOTHING;
        `;

        console.log("HANDLER: Token adicionado à blocklist com sucesso (simulado).");
        return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Logout realizado com sucesso.' }), headers: { 'Content-Type': 'application/json' }};

    } catch (error) {
        console.error('HANDLER: Erro CRÍTICO durante o logout:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Erro no servidor durante o logout.', details: error.message }), headers: { 'Content-Type': 'application/json' }};
    }
};
