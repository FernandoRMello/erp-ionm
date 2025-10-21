import { neon } from '@netlify/neon';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const moduleData = await req.json();
        const { 
            module_name, 
            description, 
            version, 
            monthly_cost_brl, 
            tags, 
            allowed_user_types, 
            applicable_business_branches 
        } = moduleData;

        await sql`
            INSERT INTO modules (module_name, description, version, monthly_cost_brl, tags, allowed_user_types, applicable_business_branches) 
            VALUES (${module_name}, ${description}, ${version}, ${monthly_cost_brl}, ${tags}, ${allowed_user_types}, ${applicable_business_branches});
        `;
        
        return new Response(JSON.stringify({ success: true, message: 'Módulo criado com sucesso!' }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        return new Response(JSON.stringify({ error: 'Erro no servidor ao criar módulo.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

