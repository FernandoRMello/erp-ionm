import { neon } from '@netlify/neon';

// Função para limpar a string de conexão
function getValidConnectionString(envVar) {
    if (!envVar) return null;
    
    // Remove o 'psql ' do início e o ' do fim, se existirem
    let cleanString = envVar.trim();
    if (cleanString.startsWith("psql '")) {
        cleanString = cleanString.substring(6); // Remove "psql '"
    }
    if (cleanString.endsWith("'")) {
        cleanString = cleanString.substring(0, cleanString.length - 1); // Remove "'"
    }
    return cleanString;
}

// Tenta obter a variável de ambiente correta
const connectionString = getValidConnectionString(process.env.DATABASE_URL) || getValidConnectionString(process.env.NETLIFY_DATABASE_URL);

if (!connectionString) {
    console.error("ERRO CRÍTICO: Variável de ambiente do banco de dados não encontrada ou inválida.");
    // Não podemos nem inicializar o 'sql' se a string não existir
}

const sql = neon(connectionString);

export default async (req, context) => {
    // Apenas aceite o método POST
// ... (o resto do seu código da função 'update-subscriptions' continua aqui) ...
// ... (if (req.method !== 'POST') { ... }) ...
// ... (try { ... } catch (error) { ... }) ...
// NENHUMA OUTRA ALTERAÇÃO É NECESSÁRIA NO RESTO DO ARQUIVO

    try {
        const body = await req.json();
// ... (continua como antes) ...

