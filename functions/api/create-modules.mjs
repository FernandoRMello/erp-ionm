/**
 * Manipulador para requisições POST (/api/create-module)
 * Cria um novo módulo de sistema no banco D1.
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const formData = await context.request.json();

        // Mapeia os dados do app.js para o schema D1
        const moduleData = {
            name: formData.module_name,
            description: formData.description || null,
            default_price_cents: (parseFloat(formData.monthly_cost_brl || 0) * 100).toFixed(0),
            
            // Converte os arrays do formulário em strings JSON para o D1
            allowed_roles: JSON.stringify(formData.allowed_user_types || []),
            applicable_branches: JSON.stringify(formData.applicable_business_branches || []),
            
            // Gera uma 'key' a partir do nome (ex: "Controle de Estoque" -> "controle-de-estoque")
            key: formData.module_name.toLowerCase()
                .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
                .replace(/[\s_-]+/g, '-') // Substitui espaços e underlines por hífens
                .replace(/^-+|-+$/g, '') // Remove hífens no início/fim
        };

        // Validação básica
        if (!moduleData.name || !moduleData.key) {
            return new Response(JSON.stringify({ error: 'O nome do módulo é obrigatório.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Insere no banco de dados D1
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

        return new Response(JSON.stringify({ message: 'Módulo criado com sucesso!' }), {
            status: 201, // 201 Created
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        // Verifica erro de unicidade (ex: 'key' ou 'name' duplicado, se tivéssemos UNIQUE(name))
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({ error: 'Já existe um módulo com esta chave (key).', details: error.message }), { 
                status: 409, // 409 Conflict
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Erro interno no servidor.', details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Manipulador principal da Cloudflare Function
 */
export default async (context) => {
    if (context.request.method === 'POST') {
        return await handlePost(context);
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
};
