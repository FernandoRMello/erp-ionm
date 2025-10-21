import { neon } from '@netlify/neon';
import { createHash } from 'crypto'; // Módulo nativo do Node.js para criptografia

const sql = neon(process.env.NETLIFY_DATABASE_URL);

// Função para criar um hash da senha
function hashPassword(password) {
    const sha256 = createHash('sha256');
    sha256.update(password);
    return sha256.digest('hex');
}

export const handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
        
        const userData = JSON.parse(event.body);
        const { company_id, name, email, login_user, password, user_type } = userData;

        // Verifica se a senha foi fornecida
        if (!password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'A senha é obrigatória.' }) };
        }

        // Gera o hash da senha
        const password_hash = hashPassword(password);

        // Insere o hash da senha na coluna correta 'password_hash'
        await sql`
            INSERT INTO users (company_id, name, email, login_user, password_hash, user_type)
            VALUES (${company_id}, ${name}, ${email}, ${login_user}, ${password_hash}, ${user_type});
        `;

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, message: 'Usuário criado com sucesso!' })
        };
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro no servidor ao criar usuário.', details: error.message })
        };
    }
};

