import { createHash } from 'crypto';

/**
 * Cria um hash SHA256 de uma senha.
 * Corresponde à lógica de hash do D1 schema.
 */
function hashPassword(password) {
    if (!password) return null;
    return createHash('sha256').update(password).digest('hex');
}

/**
 * Manipulador para requisições POST (/api/login-user)
 * Autentica um usuário contra o banco de dados D1.
 */
async function handlePost(context) {
    try {
        const { login_user, password } = await context.request.json();
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1

        if (!login_user || !password) {
            return new Response(JSON.stringify({ error: 'Usuário e senha são obrigatórios.' }), { status: 400 });
        }

        const password_hash = hashPassword(password);
        const username = login_user; // Mapeia do frontend para o schema D1

        // 1. Encontrar o usuário
        const userStmt = db.prepare(`
            SELECT id, company_id, email, username, role 
            FROM users 
            WHERE username = ? AND password_hash = ? AND active = 1
        `);
        const dbUser = await userStmt.bind(username, password_hash).first();

        if (!dbUser) {
            return new Response(JSON.stringify({ error: 'Credenciais inválidas ou usuário inativo.' }), { status: 401 });
        }

        // 2. Mapear o usuário do D1 para o formato que o app.js espera
        // Nota: Mapeando 'username' para 'name' e 'role' para 'user_type'
        const user = {
            id: dbUser.id,
            company_id: dbUser.company_id,
            name: dbUser.username, // O app.js espera 'name', mas o schema D1 só tem 'username'
            email: dbUser.email,
            login_user: dbUser.username,
            user_type: dbUser.role // O app.js espera 'user_type'
        };

        // 3. Buscar módulos que a empresa assinou
        const modulesStmt = db.prepare(`
            SELECT m.name AS module_name, m.key, m.allowed_roles 
            FROM modules m
            JOIN company_modules cm ON m.key = cm.module_key
            WHERE cm.company_id = ?
        `);
        const { results: subscribedModules } = await modulesStmt.bind(user.company_id).all();

        // 4. Filtrar módulos com base no perfil (role) do usuário
        const permittedModules = subscribedModules.filter(module => {
            try {
                // O schema D1 armazena '["ADMINISTRADOR", "GERENTE"]' como TEXT
                const allowedRoles = JSON.parse(module.allowed_roles || '[]');
                return allowedRoles.includes(user.user_type); // user.user_type é o 'role'
            } catch (e) {
                console.error(`Erro ao parsear allowed_roles para o módulo ${module.key}:`, e);
                return false;
            }
        });

        // 5. Retornar os dados no formato esperado pelo frontend
        return new Response(JSON.stringify({ user, permittedModules }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro na função de login:', error);
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { status: 500 });
    }
}

/**
 * Manipulador principal da Cloudflare Function
 * Roteia métodos HTTP.
 */
export default async (context) => {
    if (context.request.method === 'POST') {
        return await handlePost(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
};
