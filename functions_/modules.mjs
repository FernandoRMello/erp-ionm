/**
 * Gera uma chave única (slug) a partir de um nome de módulo.
 * ex: "Gestão de Vendas (CRM)" -> "gestao-de-vendas-crm"
 */
function createModuleKey(name) {
    return name
        .toLowerCase()
        .replace(/\(.*\)/g, '') // Remove parênteses (ex: CRM)
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .trim()
        .replace(/[\s-]+/g, '-'); // Substitui espaços por hífens
}

/**
 * Manipulador para requisições POST (/api/modules)
 * Cria um novo módulo no banco de dados D1.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const formData = await context.request.json();

        // Mapear os campos do formulário (app.js) para o schema D1
        const moduleData = {
            key: createModuleKey(formData.module_name),
            name: formData.module_name,
            description: formData.description || null,
            // Converte BRL (ex: 59.90) para centavos (ex: 5990)
            default_price_cents: Math.round(parseFloat(formData.monthly_cost_brl || 0) * 100),
            // O D1 schema espera JSON (como texto)
            allowed_roles: JSON.stringify(formData.allowed_user_types || []),
            applicable_branches: JSON.stringify(formData.applicable_business_branches || [])
            // 'version' do app.js é ignorado (não está no schema D1)
        };

        if (!moduleData.key || !moduleData.name) {
            return new Response(JSON.stringify({ error: 'Nome do módulo é obrigatório.' }), { status: 400 });
        }

        // Inserir o novo módulo
        const stmt = db.prepare(`
            INSERT INTO modules (key, name, description, default_price_cents, allowed_roles, applicable_branches)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        await stmt.bind(
            moduleData.key,
            moduleData.name,
            moduleData.description,
            moduleData.default_price_cents,
            moduleData.allowed_roles,
            moduleData.applicable_branches
        ).run();

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Módulo criado com sucesso!' 
        }), {
            status: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({ error: 'Um módulo com esta chave (key) ou nome já existe.' }), { status: 409 });
        }
        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { status: 500 });
    }
}

/**
 * Manipulador para requisições GET (/api/get-modules)
 * Lista todos os módulos cadastrados.
 * * NOTA: O app.js chama /api/get-modules, então criaremos um arquivo separado para isso
 * ou atualizaremos o app.js. Por enquanto, criaremos get-modules.mjs.
 * Esta função handleGet NÃO SERÁ USADA NESTE ARQUIVO.
 */
// async function handleGet(context) { ... }


/**
 * Manipulador principal da Cloudflare Function
 * Roteia métodos HTTP.
 */
export default async (context) => {
    // Este endpoint (/api/modules) só aceita POST
    if (context.request.method === 'POST') {
        return await handlePost(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
};
