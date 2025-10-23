import { neon } from '@netlify/neon';

/**
 * Esta função corrige a string de conexão copiada erradamente do Neon.
 * Ela remove o "psql '...'" extra.
 */
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

// 1. Tenta obter a variável de ambiente (corrigindo-a)
const connectionString = getValidConnectionString(process.env.DATABASE_URL) || getValidConnectionString(process.env.NETLIFY_DATABASE_URL);

if (!connectionString) {
    console.error("ERRO CRÍTICO: Variável de ambiente do banco de dados (DATABASE_URL ou NETLIFY_DATABASE_URL) não encontrada ou inválida.");
    // A aplicação vai falhar aqui, o que é esperado se a DB não estiver configurada.
}

// 2. Inicializa o 'sql' UMA VEZ com a string corrigida
const sql = neon(connectionString);

// 3. Exporta o 'sql' pronto para ser usado por outras funções
export { sql };
