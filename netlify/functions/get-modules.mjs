import { neon } from '@netlify/neon';
const sql = neon(process.env.NETLIFY_DATABASE_URL);

export default async () => {
    try {
        const modules = await sql`SELECT id, module_name FROM modules ORDER BY module_name;`;
        return new Response(JSON.stringify(modules), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar módulos.' }), { status: 500 });
    }
};

