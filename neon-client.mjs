import { neon } from '@netlify/neon';

function getValidConnectionString(envVar) {
    if (!envVar) return null;
    let cleanString = envVar.trim();
    if (cleanString.startsWith("psql '")) {
        cleanString = cleanString.substring(6); // Remove "psql '"
    }
    if (cleanString.endsWith("'")) {
        cleanString = cleanString.substring(0, cleanString.length - 1); // Remove "'"
    }
    return cleanString;
}

const connectionString = getValidConnectionString(process.env.DATABASE_URL) || getValidConnectionString(process.env.NETLIFY_DATABASE_URL);

if (!connectionString) {
    console.error("ERRO CRÍTICO: Variável de ambiente do banco de dados não encontrada.");
}

const sql = neon(connectionString);

export { sql };
