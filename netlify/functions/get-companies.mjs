import { sql } from './neon-client.mjs';
export default async () => {
    try {
        const companies = await sql`SELECT id, nome_fantasia FROM companies ORDER BY nome_fantasia;`;
        return new Response(JSON.stringify(companies), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar empresas.' }), { status: 500 });
    }
};

