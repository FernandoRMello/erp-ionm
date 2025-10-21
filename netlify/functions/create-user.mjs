import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export const handler = async (event) => {
    try {
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
        
        const userData = JSON.parse(event.body);
        const { company_id, name, email, login_user, password, user_type } = userData;

        await sql`
            INSERT INTO users (company_id, name, email, login_user, password, user_type)
            VALUES (${company_id}, ${name}, ${email}, ${login_user}, ${password}, ${user_type});
        `;

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, message: 'Usuário criado com sucesso!' })
        };
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro no servidor ao criar usuário.' })
        };
    }
};

