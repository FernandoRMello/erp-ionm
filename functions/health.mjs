    /**
     * Rota de teste simples para verificar se o deploy
     * do Cloudflare Functions está encontrando esta pasta.
     */
    export default async (context) => {
      const data = {
        message: "API de Saúde está online!",
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
    
