import { createHash } from 'crypto';

/**
 * Cria um hash SHA256 de uma senha.
 */
function hashPassword(password) {
    if (!password) return null;
    return createHash('sha256').update(password).digest('hex');
}

/**
 * Manipulador para requisições POST (/api/users)
 * Cria um novo usuário no banco de dados D1.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const formData = await context.request.json();

        // Mapear os campos do formulário (app.js) para o schema D1
        const userData = {
            company_id: parseInt(formData.company_id, 10),
            // O app.js envia o 'login_user' final já formatado (ex: 'joao@loja')
            username: formData.login_user, 
            email: formData.email || null,
            password: formData.password,
            role: formData.user_type, // app.js 'user_type' -> D1 'role'
            // O campo 'name' (Nome Completo) do app.js é ignorado,
            // pois não existe na tabela 'users' do schema D1.
        };

        if (!userData.company_id || !userData.username || !userData.password || !userData.role) {
            return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes.' }), { status: 400 });
        }

        const password_hash = hashPassword(userData.password);

        // Inserir o novo usuário
        const stmt = db.prepare(`
            INSERT INTO users (company_id, username, email, password_hash, role, active)
            VALUES (?, ?, ?, ?, ?, 1)
        `);
        
        await stmt.bind(
            userData.company_id,
            userData.username,
            userData.email,
            password_hash,
            userData.role
        ).run();

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Usuário criado com sucesso!' 
        }), {
            status: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({ error: 'Nome de usuário já existe para esta empresa.' }), { status: 409 });
        }
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { status: 500 });
    }
}

/**
 * Manipulador para requisições GET (/api/users)
 * Lista todos os usuários e suas respectivas empresas.
 */
async function handleGet(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1

        // Buscar usuários e o nome fantasia da empresa (trading_name)
        const stmt = db.prepare(`
            SELECT 
                u.id, 
                u.username,
                u.role,
                c.trading_name 
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            ORDER BY u.username ASC
        `);
        
        const { results } = await stmt.all();

        // Mapear os dados do D1 para o formato que o app.js espera
        const usersForFrontend = results.map(user => ({
            id: user.id,
            // O app.js espera 'name' e 'login_user'
            // Usamos 'username' do D1 para ambos, para consistência
            name: user.username,
            login_user: user.username,
            // O app.js espera 'company_name'
            company_name: user.trading_name || 'N/A',
            // O app.js espera 'user_type'
            user_type: user.role
        }));

        return new Response(JSON.stringify(usersForFrontend), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { status: 500 });
    }
}


/**
 * Manipulador principal da Cloudflare Function
 * Roteia métodos HTTP.
 */
export default async (context) => {
    switch (context.request.method) {
        case 'GET':
            return await handleGet(context);
        case 'POST':
            return await handlePost(context);
        default:
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }
};
