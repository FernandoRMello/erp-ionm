/**
 * Manipulador para requisições POST (/api/update-subscriptions)
 * Atualiza os módulos vinculados (assinados) por uma empresa.
 * Isto envolve uma tradução de IDs numéricos (do frontend) para chaves de texto (do D1).
 */
async function handlePost(context) {
    try {
        const db = context.env.D1_DATABASE; // Conexão com o Cloudflare D1
        const body = await context.request.json();

        const { companyId, moduleIds } = body;

        // Validação básica
        if (!companyId || !Array.isArray(moduleIds)) {
            return new Response(JSON.stringify({ error: 'ID da empresa e um array de IDs de módulos são obrigatórios.' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let moduleKeys = [];

        // 1. Converter IDs numéricos de módulos (do app.js) para module_keys (do D1)
        if (moduleIds.length > 0) {
            // Cria os placeholders (?) para a consulta IN (...)
            const placeholders = moduleIds.map(() => '?').join(',');
            
            const stmtGetKeys = db.prepare(`
                SELECT key FROM modules WHERE id IN (${placeholders})
            `);
            
            const { results } = await stmtGetKeys.bind(...moduleIds).all();
            
            if (results) {
                moduleKeys = results.map(r => r.key);
            }
        }

        // 2. Preparar a transação (Batch)
        // Esta é a maneira mais segura de atualizar: apagar todos e recriar.
        const stmts = [];

        // 2a. Declaração de exclusão
        stmts.push(
            db.prepare('DELETE FROM company_modules WHERE company_id = ?').bind(companyId)
        );

        // 2b. Declarações de inserção (se houver chaves para inserir)
        if (moduleKeys.length > 0) {
            const insertStmt = db.prepare(
                'INSERT INTO company_modules (company_id, module_key) VALUES (?, ?)'
            );
            moduleKeys.forEach(key => {
                stmts.push(insertStmt.bind(companyId, key));
            });
        }

        // 3. Executar a transação
        await db.batch(stmts);

        return new Response(JSON.stringify({ message: 'Vínculos atualizados com sucesso!' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro ao atualizar vínculos de módulos:', error);
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
