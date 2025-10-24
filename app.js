document.addEventListener('DOMContentLoaded', () => {
    let state = { currentUser: null };
    const ADMIN_USER = { email: 'fernando.mello@ionm', password: 'Dr@g3378' };
    const DOM = { app: document.getElementById('app') };

    // --- API REAL (ÚNICA API UTILIZADA) ---
    // Removemos MOCK_DB, mockApi, e useMockApi.
    // Todas as chamadas agora são direcionadas para /api/*, 
    // que será processado pelo Cloudflare Functions (D1).
    const api = { 
        get: (endpoint) => fetch(`/api/${endpoint}`).then(res => res.ok ? res.json() : Promise.reject(res.statusText)), 
        post: (endpoint, body) => fetch(`/api/${endpoint}`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(body) 
        }).then(res => res.json().then(data => res.ok ? data : Promise.reject(data.error || res.statusText))) 
    };

    async function handleLogin(e) {
        const form = e.target.closest('form');
        const btn = form.querySelector('button[type="submit"]');
        const errorEl = document.getElementById('login-error');
        const login = document.getElementById('login_field').value;
        const password = document.getElementById('password').value;
        
        btn.disabled = true;
        btn.innerHTML = '<div class="loader-white mx-auto"></div>';
        errorEl.textContent = '';
        try {
            if (login === ADMIN_USER.email && password === ADMIN_USER.password) {
                // Login de admin local (sem D1)
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('admin-panel-section').style.display = 'block';
                await navigateToSection('dashboard-main-section');
            } else {
                // Login de usuário (via API D1)
                // A API /api/login-user foi escrita para retornar { user, permittedModules }
                const { user, permittedModules } = await api.post('login-user', { login_user: login, password: password });
                state.currentUser = { ...user, modules: permittedModules };
                renderUserERP();
            }
        } catch (error) {
            errorEl.textContent = "Credenciais inválidas ou erro no servidor.";
            btn.disabled = false;
            btn.innerHTML = 'Entrar';
        }
    }

    function handleLogout() {
        state = { currentUser: null };
        document.getElementById('admin-panel-section').style.display = 'none';
        document.getElementById('user-erp-panel-section').style.display = 'none';
        const loginSection = document.getElementById('login-section');
        loginSection.style.display = 'flex';
        init();
    }

    function renderUserERP() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('user-erp-panel-section').style.display = 'block';
        
        // A API /api/login-user D1 retorna 'name' (mapeado do 'username')
        document.getElementById('user-info').innerHTML = `<p class="font-semibold">${state.currentUser.name}</p><p>${state.currentUser.email}</p>`;
        document.getElementById('user-content-area').innerHTML = `<h2 class="text-3xl font-bold mb-6">Bem-vindo, ${state.currentUser.name.split(' ')[0]}!</h2><p>Selecione um módulo na barra lateral para começar.</p>`;
        
        const nav = document.getElementById('user-main-nav');
        // A API /api/login-user D1 retorna 'permittedModules' com 'module_name'
        nav.innerHTML = state.currentUser.modules?.length 
            ? state.currentUser.modules.map(m => `<a href="#" data-module-name="${m.module_name}" class="erp-module-link flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-indigo-700">${m.module_name}</a>`).join('') 
            : `<p class="px-4 text-indigo-300">Nenhum módulo disponível.</p>`;
    }
    
    async function renderPage(pageId, targetEl) {
        const pageContent = targetEl || document.getElementById(pageId);
        if (!pageContent) return;
        const template = pageTemplates[pageId];
        if (!template) return;
        pageContent.innerHTML = '<div class="loader mx-auto mt-10"></div>';
        try {
            // As funções de template (pageTemplates) agora usam a 'api' real
            pageContent.innerHTML = await template();
        } catch (error) {
            console.error(`Erro ao renderizar a página ${pageId}:`, error);
            pageContent.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Ocorreu um erro!</strong>
                <span class="block sm:inline">Não foi possível carregar os dados. Verifique o console para mais detalhes.</span>
            </div>`;
        }
    }

    async function navigateToSection(targetId) {
         document.querySelectorAll('#main-nav a').forEach(link => link.classList.toggle('active', link.dataset.target === targetId));
         document.querySelectorAll('.page-content').forEach(section => section.style.display = 'none');
         const targetSection = document.getElementById(targetId);
         if(targetSection) {
             targetSection.style.display = 'block';
             await renderPage(targetId, targetSection);
         }
    }
    function showModal(content) {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content">${content}</div></div>`;
        const overlay = modalContainer.querySelector('.modal-overlay');
        setTimeout(() => overlay.classList.add('visible'), 10);
    }
    function closeModal() {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) { overlay.classList.remove('visible'); setTimeout(() => overlay.parentElement.innerHTML = '', 300); }
    }
    function renderReportView(reportId, moduleName) {
        const report = erpReports[moduleName]?.find(r => r.id === reportId);
        if (!report) { document.getElementById('user-content-area').innerHTML = '<p>Relatório não encontrado.</p>'; return; }
        let headers = [], rows = [];
        if (reportId === 'stock_value') { headers = ['ID Produto', 'Nome', 'Quantidade', 'Custo Unit.', 'Valor Total']; rows = [ ['001', 'Produto A', 100, '10,50', '1.050,00'], ['002', 'Produto B', 50, '25,00', '1.250,00'], ['003', 'Produto C', 200, '5,75', '1.150,00'] ]; } 
        else if (reportId === 'stock_abc') { headers = ['Produto', 'Valor Total', '% Acumulado', 'Classificação']; rows = [ ['Produto B', '1.250,00', '36.23%', 'A'], ['Produto C', '1.150,00', '69.57%', 'A'], ['Produto A', '1.050,00', '100.00%', 'B'] ]; } 
        else if (reportId === 'cash_flow') { headers = ['Data', 'Descrição', 'Entrada', 'Saída', 'Saldo']; rows = [ ['20/10/2025', 'Venda PDV', '1.500,00', '', '1.500,00'], ['20/10/2025', 'Pagto Fornecedor X', '', '800,00', '700,00'], ['21/10/2025', 'Venda Online', '950,00', '', '1.650,00'] ]; }
        let html = `<h3 class="text-2xl font-bold mb-2">${report.name}</h3><p class="text-slate-600 mb-6">${report.description}</p><div class="bg-white p-6 rounded-lg shadow"><div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4"><div class="flex flex-col md:flex-row gap-4 items-start md:items-center"><label>Período:</label><input type="date" class="p-2 border rounded"><span>até</span><input type="date" class="p-2 border rounded"><button class="bg-gray-600 text-white px-4 py-2 rounded">Filtrar</button></div><div class="flex gap-2"><button class="bg-green-700 text-white px-4 py-2 rounded">Exportar CSV</button><button class="bg-red-700 text-white px-4 py-2 rounded ml-2">Exportar PDF</button></div></div><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b">${headers.map(h => `<th class="p-2">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td class="p-2 border-b">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
        document.getElementById('user-content-area').innerHTML = html;
    }

    // --- MELHORIA: Helper para criar modais de alerta ---
    function createAlertModal(title, message) {
        return `<h3 class="text-xl font-bold mb-4">${title}</h3>
                <p class="text-slate-600 mb-6">${message}</p>
                <div class="mt-8 flex justify-end gap-4">
                    <button type="button" id="cancel-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">OK</button>
                </div>`;
    }

    const createTableHTML = (headers, rows, actions = []) => {
        const headerHtml = `<thead><tr class="border-b">${headers.map(h => `<th class="p-2">${h}</th>`).join('')}${actions.length ? '<th></th>' : ''}</tr></thead>`;
        const bodyHtml = `<tbody>${rows.map(rowObject => {
            const rowData = rowObject.data;
            const rowId = rowObject.id;
            return `<tr>
                ${rowData.map(cell => `<td class="p-2 border-b">${cell}</td>`).join('')}
                ${actions.length ? `<td class="p-2 border-b text-right">${actions.map(action => `<button class="${action.class}" data-id="${rowId}">${action.label}</button>`).join(' ')}</td>` : ''}
            </tr>`;
        }).join('')}</tbody>`;
        return `<div class="overflow-x-auto"><table class="w-full text-left">${headerHtml}${bodyHtml}</table></div>`;
    };

    const moduleFileNames = {
        'Controle de Estoque': 'controle-estoque',
        'Financeiro': 'financeiro',
        'Gestão de Vendas (CRM)': 'crm',
        'Emissão de Notas Fiscais (NF-e)': 'nfe',
        'Ponto de Venda (PDV)': 'pdv',
        'Precificação': 'precificacao'
    };
    
    // Simulação de Relatórios (Lógica frontend mantida)
    const erpReports = {
        'Controle de Estoque': [
            { id: 'stock_value', name: 'Posição de Valor de Estoque', description: 'Valor total do estoque atual por produto.' },
            { id: 'stock_abc', name: 'Curva ABC de Estoque', description: 'Classificação de produtos por relevância.' }
        ],
        'Financeiro': [
            { id: 'cash_flow', name: 'Fluxo de Caixa', description: 'Entradas e saídas por período.' }
        ]
    };

    // --- TEMPLATES DE PÁGINA (Usando a API D1) ---
    // Todas as chamadas api.get() agora apontam para as Functions D1
    const pageTemplates = {
        'dashboard-main-section': async () => { 
            const data = await api.get('get-dashboard-data'); 
            state.dashboardData = data; // Salva os dados para uso posterior (ex: renovação)
            return `<h2 class="text-3xl font-bold mb-6">Dashboard Gerencial</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><div class="bg-white p-6 rounded-xl shadow"><h3 class="text-slate-500">Empresas</h3><p class="text-3xl font-bold mt-2">${data.total_companies}</p></div><div class="bg-white p-6 rounded-xl shadow"><h3 class="text-slate-500">Usuários</h3><p class="text-3xl font-bold mt-2">${data.total_users}</p></div><div class="bg-white p-6 rounded-xl shadow"><h3 class="text-slate-500">Receita Mensal</h3><p class="text-3xl font-bold mt-2 text-green-600">R$ ${data.total_monthly_revenue}</p></div></div><div class="bg-white p-6 rounded-xl shadow mb-8"><h3 class="font-bold text-lg mb-4">Previsão de Faturamento por Dia</h3><div class="flex flex-wrap justify-around text-center gap-4">${Object.entries(data.revenue_by_day).map(([d, v]) => `<div><p class="text-sm text-slate-500">Dia ${d}</p><p class="font-bold">R$ ${v}</p></div>`).join('')}</div></div><div class="bg-white p-6 rounded-xl shadow"><h3 class="font-bold text-lg mb-4">Vencimentos Próximos (7 dias)</h3><div class="overflow-x-auto">${data.companies_nearing_expiration.length ? data.companies_nearing_expiration.map(c => `<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b gap-2"><p class="font-semibold">${c.trading_name}</p><p class="text-sm text-red-600">Vence: ${new Date(c.contract_expires_at).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</p><button class="renew-btn bg-blue-500 text-white px-3 py-1 rounded-lg w-full sm:w-auto" data-id="${c.id}" data-name="${c.trading_name}">Renovar</button></div>`).join('') : '<p class="text-slate-500">Nenhum vencimento próximo.</p>'}</div></div>`; 
        },
        'empresas-main-section': async () => `<h2 class="text-2xl font-bold mb-6">Gestão de Empresas</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><button data-page="company-registration-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Cadastrar Empresa</h3></button><button data-page="company-list-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Listar Empresas</h3></button></div>`,
        'usuarios-main-section': async () => `<h2 class="text-2xl font-bold mb-6">Gestão de Usuários</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><button data-page="user-registration-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Cadastrar Usuário</h3></button><button data-page="user-list-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Listar Usuários</h3></button></div>`,
        'modulos-main-section': async () => `<h2 class="text-2xl font-bold mb-6">Gestão de Módulos</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6"><button data-page="module-registration-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Cadastrar Módulo</h3></button><button data-page="module-list-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Listar Módulos</h3></button><button data-page="module-link-page" class="page-nav-button bg-white p-6 rounded-xl shadow hover:shadow-lg text-left"><h3 class="text-lg font-bold">Vincular Módulos</h3></button></div>`,
        'assinaturas-main-section': async () => { 
            const data = await api.get('get-subscription-management'); 
            let content = `<h2 class="text-2xl font-bold mb-6">Gerenciamento de Assinaturas e Usuários</h2>`; 
            content += `<div class="bg-white p-6 rounded-xl shadow">`; 
            if (data.length === 0) { 
                content += `<p>Nenhuma empresa cadastrada.</p>`; 
            } else { 
                content += `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b"><th class="p-4">Empresa</th><th class="p-4">Usuários (Ativos / Limite)</th><th class="p-4 text-right">Ações</th></tr></thead><tbody>`; 
                // A API /api/get-subscription-management D1 retorna trading_name, current_users, e user_limit
                data.forEach(company => { 
                    content += `<tr><td class="p-4 border-b">${company.trading_name}</td><td class="p-4 border-b">${company.current_users} / ${company.user_limit}</td><td class="p-4 border-b text-right"><button class="edit-user-limit-btn bg-blue-500 text-white px-3 py-1 rounded-lg" data-id="${company.id}" data-name="${company.trading_name}" data-limit="${company.user_limit}">Alterar Limite</button></td></tr>`; 
                }); 
                content += `</tbody></table></div>`; 
            } 
            content += `</div>`; 
            return content; 
        },
        'financeiro-main-section': async () => `<h2 class="text-2xl font-bold mb-6">Financeiro</h2><div class="bg-white p-6 rounded-xl shadow"><p>Área para gestão de faturas, assinaturas e pagamentos.</p><p class="mt-4">Funcionalidade em desenvolvimento.</p></div>`,
        'comercial-main-section': async () => `<h2 class="text-2xl font-bold mb-6">Comercial</h2><div class="bg-white p-6 rounded-xl shadow"><p>Área para gestão de propostas, contratos e funil de vendas da plataforma.</p><p class="mt-4">Funcionalidade em desenvolvimento.</p></div>`,
        'relatorios-main-section': async () => `<h2 class="text-2xl font-bold mb-6">Gestão de Relatórios</h2><div class="bg-white p-6 rounded-xl shadow"><p>Esta área será usada para cadastrar novas definições de relatórios que aparecerão para os usuários nos módulos do ERP.</p><p class="mt-4">Funcionalidade em desenvolvimento.</p></div>`,
        
        // --- FORMULÁRIOS (Frontend inalterado, API D1 aceita esses campos) ---
        'company-registration-page': async () => `<div><button data-page="empresas-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Nova Empresa</h3><form id="company-form" class="grid md:grid-cols-2 gap-6"><div><label>CNPJ</label><div class="relative"><input type="text" id="cnpj" name="cnpj" class="w-full mt-1 p-2 border rounded-lg" required></div></div><div><label>Razão Social</label><input type="text" id="razao_social" name="razao_social" class="w-full mt-1 p-2 border rounded-lg bg-slate-100" readonly></div><div><label>Nome Fantasia</label><input type="text" id="nome_fantasia" name="nome_fantasia" class="w-full mt-1 p-2 border rounded-lg bg-slate-100"></div><div class="md:col-span-2"><label>Endereço</label><input type="text" id="address" name="address" class="w-full mt-1 p-2 border rounded-lg bg-slate-100" readonly></div><div><label>I.E.</label><input type="text" name="ie" class="w-full mt-1 p-2 border rounded-lg"></div><div><label>Tipo</label><select name="company_type" class="w-full mt-1 p-2 border rounded-lg" required><option value="">Selecione...</option><option>MEI</option><option>LTDA</option></select></div><div><label>Ramo</label><select name="business_branch" class="w-full mt-1 p-2 border rounded-lg" required><option value="">Selecione...</option><option>COMERCIO</option><option>INDUSTRIA</option><option>SERVICOS</option><option>ATACADISTA</option><option>ONLINE</option></select></div><div><label>Dia Faturamento</label><select name="billing_day" class="w-full mt-1 p-2 border rounded-lg" required><option value="">Selecione...</option><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option></select></div><div class="md:col-span-2 text-right mt-4"><button type="submit" class="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg">Cadastrar</button></div></form></div></div>`,
        'user-registration-page': async () => { 
            const companies = await api.get('get-companies'); 
            // A API /api/get-companies D1 retorna { id, nome_fantasia }
            return `<div><button data-page="usuarios-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Novo Usuário</h3><form id="user-form" class="grid md:grid-cols-2 gap-4"><div><label>Empresa</label><select name="company_id" required class="w-full p-2 border rounded">${companies.map(c=>`<option value="${c.id}" data-fantasia="${c.nome_fantasia}">${c.nome_fantasia}</option>`).join('')}</select></div><div><label>Nome Completo</label><input name="name" required class="w-full p-2 border rounded"></div><div><label>Email</label><input name="email" type="email" required class="w-full p-2 border rounded"></div><div><label>Nome de Usuário (base)</label><input name="login_user" required class="w-full p-2 border rounded"></div><div><label>Senha</label><input name="password" type="password" required class="w-full p-2 border rounded"></div><div><label>Perfil</label><select name="user_type" required class="w-full p-2 border rounded"><option>ADMINISTRADOR</option><option>GERENTE</option><option>VENDEDOR</option><option>ESTOQUE</option><option>USUARIO</option></select></div><div class="md:col-span-2 bg-slate-50 p-3 rounded-lg"><p class="text-sm text-slate-600">O login final do usuário será: <strong id="final-login-preview" class="text-indigo-600"></strong></p></div><div class="md:col-span-2 text-right"><button type="submit" class="bg-indigo-600 text-white font-semibold p-2 px-4 rounded">Cadastrar Usuário</button></div></form></div></div>`; 
        },
        'module-registration-page': async () => `<div><button data-page="modulos-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Novo Módulo</h3><form id="module-form" class="space-y-4"><div><label>Nome do Módulo</label><input name="module_name" required class="w-full p-2 border rounded"></div><div><label>Descrição</label><textarea name="description" class="w-full p-2 border rounded"></textarea></div><div><label>Versão</label><input name="version" class="w-full p-2 border rounded"></div><div><label>Custo Mensal (R$)</label><input name="monthly_cost_brl" type="number" step="0.01" required class="w-full p-2 border rounded"></div><fieldset><legend>Perfis Permitidos</legend><div>${['ADMINISTRADOR', 'GERENTE', 'VENDEDOR', 'ESTOQUE', 'USUARIO'].map(p=>`<label class="mr-4"><input type="checkbox" name="allowed_user_types" value="${p}"> ${p}</label>`).join('')}</div></fieldset><fieldset><legend>Ramos Aplicáveis</legend><div>${['COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ATACADISTA', 'ONLINE'].map(r=>`<label class="mr-4"><input type="checkbox" name="applicable_business_branches" value="${r}"> ${r}</label>`).join('')}</div></fieldset><div class="text-right"><button type="submit" class="bg-indigo-600 text-white font-semibold p-2 px-4 rounded">Cadastrar Módulo</button></div></form></div></div>`,
        'module-link-page': async () => { 
            const [companies, modules] = await Promise.all([api.get('get-companies'), api.get('get-modules')]); 
            // Ambas as APIs D1 retornam os dados no formato esperado
            return `<div><button data-page="modulos-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Vincular Módulos à Empresa</h3><div><label>Selecione a Empresa</label><select id="company-select-link" class="w-full p-2 border rounded"><option value="">Selecione...</option>${companies.map(c=>`<option value="${c.id}">${c.nome_fantasia}</option>`).join('')}</select></div><div id="modules-checkbox-list" class="mt-4 space-y-2"></div><div class="text-right mt-4"><button id="save-links-btn" class="bg-indigo-600 text-white font-semibold p-2 px-4 rounded hidden disabled:bg-indigo-400">Salvar Vínculos</button></div></div></div>`; 
        },
        'company-list-page': async () => { 
            const companies = await api.get('get-companies'); 
            // API D1 /api/get-companies retorna { id, nome_fantasia }
            return `<div><button data-page="empresas-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Empresas Cadastradas</h3>${createTableHTML(['ID', 'Nome Fantasia'], companies.map(c => ({id: c.id, data: [c.id, c.nome_fantasia]})), [{label: 'Editar', class: 'edit-company-btn bg-gray-500 text-white px-3 py-1 rounded-lg'}])}</div></div>`; 
        },
        'user-list-page': async () => { 
            const users = await api.get('users'); 
            // API D1 /api/users (GET) retorna { name, login_user, company_name, user_type }
            return `<div><button data-page="usuarios-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Usuários Cadastrados</h3>${createTableHTML(['Nome', 'Usuário', 'Empresa', 'Perfil'], users.map(u => ({id: u.id, data: [u.name, u.login_user, u.company_name || 'N/A', u.user_type]})))}</div></div>`; 
        },
        'module-list-page': async () => { 
            const modules = await api.get('get-modules'); 
            // API D1 /api/get-modules retorna { id, module_name }
            return `<div><button data-page="modulos-main-section" class="page-nav-button mb-4 text-sm text-indigo-600 hover:underline">&larr; Voltar</button><div class="bg-white p-8 rounded-xl shadow-lg"><h3 class="text-xl font-bold mb-6">Módulos Cadastrados</h3>${createTableHTML(['ID', 'Nome do Módulo'], modules.map(m => ({id: m.id, data: [m.id, m.module_name]})))}</div></div>`; 
        },
    };
    
    // --- GERENCIADOR DE EVENTOS CENTRALIZADO (Inalterado) ---
    // A lógica de formulário é a mesma. As APIs D1 foram feitas para aceitar esses dados.
    DOM.app.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
            if (form.id === 'login-form') { await handleLogin(e); } 
            else if (form.id === 'company-form') { 
                await api.post('create-company', Object.fromEntries(new FormData(form))); 
                showModal(createAlertModal('Sucesso', 'Empresa criada!')); 
                await navigateToSection('dashboard-main-section'); 
            } 
            else if (form.id === 'user-form') {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                const companySelect = form.querySelector('select[name="company_id"]');
                const selectedOption = companySelect.options[companySelect.selectedIndex];
                const fantasia = selectedOption ? selectedOption.dataset.fantasia : '';
                
                // Esta lógica de login customizado é mantida no frontend
                if (fantasia) {
                    const baseLogin = data.login_user;
                    const companyFirstName = fantasia.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                    data.login_user = `${baseLogin}@${companyFirstName}`;
                }
                
                // A API D1 /api/users (POST) aceita este objeto 'data'
                await api.post('users', data);
                
                showModal(createAlertModal('Sucesso', `Usuário criado! Login final: ${data.login_user}`));
                await navigateToSection('usuarios-main-section');
            } 
            else if (form.id === 'module-form') { 
                const formData = new FormData(form); 
                const data = Object.fromEntries(formData.entries()); 
                data.allowed_user_types = formData.getAll('allowed_user_types'); 
                data.applicable_business_branches = formData.getAll('applicable_business_branches'); 
                
                // A API D1 /api/create-module aceita este objeto 'data'
                await api.post('create-module', data); 
                
                showModal(createAlertModal('Sucesso', 'Módulo criado!')); 
                await navigateToSection('modulos-main-section'); 
            } 
            else if (form.id === 'edit-company-form') { 
                // A API D1 /api/update-company aceita este formulário
                await api.post('update-company', Object.fromEntries(new FormData(form))); 
                showModal(createAlertModal('Sucesso', 'Empresa atualizada!')); 
                closeModal(); 
                await renderPage('company-list-page', document.getElementById('empresas-main-section')); 
            }
            else if (form.id === 'update-user-limit-form') { 
                const formData = new FormData(form); 
                const data = Object.fromEntries(formData.entries()); 
                
                // A API D1 /api/update-user-limit aceita { companyId, newUserLimit }
                await api.post('update-user-limit', { companyId: data.companyId, newUserLimit: data.newUserLimit }); 
                
                showModal(createAlertModal('Sucesso', 'Limite de usuários atualizado com sucesso!')); 
                closeModal(); 
                await renderPage('assinaturas-main-section', document.getElementById('assinaturas-main-section'));
            }
        } catch (error) { showModal(createAlertModal('Erro', error.toString())); } 
        finally { if(btn) btn.disabled = false; }
    });

    DOM.app.addEventListener('click', async (e) => {
        const target = e.target;
        const navLink = target.closest('#main-nav a'), navButton = target.closest('.page-nav-button'), editButton = target.closest('.edit-company-btn'), renewButton = target.closest('.renew-btn'), saveLinksButton = target.closest('#save-links-btn'), erpModuleLink = target.closest('.erp-module-link'), reportLink = target.closest('.report-link'), cancelButton = target.closest('#cancel-btn'), editUserLimitButton = target.closest('.edit-user-limit-btn');

        if (target.id === 'logout-button' || target.id === 'user-logout-button' || target.id === 'admin-sidebar-overlay' || target.id === 'user-sidebar-overlay') {
            if (target.id.includes('logout')) handleLogout();
        }

        if (navLink) { e.preventDefault(); navigateToSection(navLink.dataset.target); }
        if (navButton) { 
            e.preventDefault(); 
            const targetPageId = navButton.dataset.page;
            const parentSection = navButton.closest('.page-content');
            await renderPage(targetPageId, parentSection);
        }
        if (cancelButton) { e.preventDefault(); closeModal(); }
        if (reportLink) { e.preventDefault(); renderReportView(reportLink.dataset.reportId, reportLink.dataset.module); }

        if (editButton) {
            e.preventDefault();
            const { id } = editButton.dataset;
            
            // A API D1 /api/get-company-details foi feita para retornar os campos
            // exatamente como o modal espera (incluindo nulos para os campos removidos)
            const company = await api.get(`get-company-details?id=${id}`);
            
            const ramos = ['COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ATACADISTA', 'ONLINE'], tipos = ['MEI', 'LTDA'], dias = [5, 10, 15, 20, 25];
            const modalContent = `<h3 class="text-xl font-bold mb-6">Editar Empresa</h3><form id="edit-company-form" class="grid grid-cols-1 md:grid-cols-2 gap-4"><input type="hidden" name="id" value="${company.id}"><div><label>Razão Social</label><input name="razao_social" value="${company.razao_social}" class="w-full p-2 border rounded"></div><div><label>Nome Fantasia</label><input name="nome_fantasia" value="${company.nome_fantasia}" class="w-full p-2 border rounded"></div><div class="md:col-span-2"><label>Endereço</label><input name="address" value="${company.address}" class="w-full p-2 border rounded"></div><div><label>I.E.</label><input name="ie" value="${company.ie || ''}" class="w-full p-2 border rounded"></div><div><label>Tipo</label><select name="company_type" class="w-full p-2 border rounded">${tipos.map(t => `<option ${t === company.company_type ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div><label>Ramo</label><select name="business_branch" class="w-full p-2 border rounded">${ramos.map(r => `<option ${r === company.business_branch ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div><label>Dia Faturamento</label><select name="billing_day" class="w-full p-2 border rounded">${dias.map(d => `<option ${d == company.billing_day ? 'selected' : ''}>${d}</option>`).join('')}</select></div><div class="md:col-span-2 mt-4 flex justify-end gap-4"><button type="button" id="cancel-btn" class="bg-slate-200 px-4 py-2 rounded-lg">Cancelar</button><button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Salvar Alterações</button></div></form>`;
            showModal(modalContent);
        }
        if(editUserLimitButton){
            e.preventDefault();
            const { id, name, limit } = editUserLimitButton.dataset;
            const modalContent = `<h3 class="text-xl font-bold mb-4">Alterar Limite de Usuários</h3><p class="mb-6 text-slate-600">Empresa: <strong>${name}</strong></p><form id="update-user-limit-form"><input type="hidden" name="companyId" value="${id}"><div><label for="new-limit" class="block font-medium">Novo Limite de Usuários</label><input type="number" id="new-limit" name="newUserLimit" value="${limit}" class="w-full p-2 border rounded-lg mt-1" min="1" required></div><div class="mt-8 flex justify-end gap-4"><button type="button" id="cancel-btn" class="bg-slate-200 px-4 py-2 rounded-lg">Cancelar</button><button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Salvar Limite</button></div></form>`;
            showModal(modalContent);
        }

        if (renewButton) {
            e.preventDefault();
            const { id, name } = renewButton.dataset;
            
            // Usando os dados do dashboard D1 salvos no 'state'
            const monthlyCost = state.dashboardData.company_monthly_costs[id] || 0;
            
            const modalContent = `<h3 class="text-xl font-bold">Renovar Contrato</h3><p class="mb-6">${name}</p><label class="block mb-2">Período:</label><select id="renewal-period" class="w-full p-2 border rounded-lg"><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option><option value="180">180 dias</option><option value="365">1 ano</option></select><div class="mt-6 text-center bg-slate-50 p-4 rounded-lg"><p>Valor Total:</p><p id="renewal-cost" class="text-2xl font-bold text-green-600">R$ 0,00</p></div><div class="mt-8 flex justify-end gap-4"><button type="button" id="cancel-btn" class="bg-slate-200 px-4 py-2 rounded-lg">Cancelar</button><button id="confirm-renewal-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Confirmar</button></div>`;
            showModal(modalContent);

            const periodSelect = document.getElementById('renewal-period'), costEl = document.getElementById('renewal-cost');
            // A API D1 /api/get-dashboard-data retorna o custo mensal, então esta lógica funciona
            const calculateCost = () => costEl.textContent = `R$ ${(monthlyCost * Math.round(periodSelect.value / 30)).toFixed(2).replace('.', ',')}`;
            periodSelect.onchange = calculateCost; calculateCost();
            
            // A API D1 /api/renew-contract aceita { companyId, renewalPeriodDays }
            document.getElementById('confirm-renewal-btn').onclick = async () => { 
                await api.post('renew-contract', { companyId: id, renewalPeriodDays: periodSelect.value }); 
                showModal(createAlertModal('Sucesso', 'Contrato renovado!')); 
                await navigateToSection('dashboard-main-section'); 
            };
        }

        if (saveLinksButton) {
            const btn = e.target;
            btn.disabled = true;
            btn.innerHTML = '<div class="loader-white mx-auto"></div>';
            try {
                const select = document.getElementById('company-select-link'), list = document.getElementById('modules-checkbox-list');
                const companyId = select.value, moduleIds = Array.from(list.querySelectorAll('input:checked')).map(i => parseInt(i.value, 10));
                
                // A API D1 /api/update-subscriptions aceita { companyId, moduleIds (numérico) }
                await api.post('update-subscriptions', { companyId: parseInt(companyId, 10), moduleIds });
                
                showModal(createAlertModal('Sucesso', 'Vínculos atualizados!'));
            } catch(error) {
                showModal(createAlertModal('Erro', 'Erro ao salvar vínculos: ' + error));
            } finally {
                btn.disabled = false;
                btn.textContent = 'Salvar Vínculos';
            }
        }

        if (erpModuleLink) {
             e.preventDefault();
             document.querySelectorAll('#user-main-nav a').forEach(l => l.classList.remove('active'));
             erpModuleLink.classList.add('active');
             const moduleName = erpModuleLink.dataset.moduleName;
             const fileName = moduleFileNames[moduleName];
             if(fileName) {
                 try {
                     // Esta lógica de carregar HTML estático da pasta /modules continua a mesma
                     const response = await fetch(`./modules/${fileName}.html`);
                     if(!response.ok) throw new Error('Módulo não encontrado (404).');
                     const textContent = await response.text();
                     const userContentArea = document.getElementById('user-content-area');
                     userContentArea.innerHTML = textContent;
                     
                     // Lógica de Relatórios (mockada) mantida
                     const reportContainer = userContentArea.querySelector('#report-section-container');
                     if (reportContainer && ['ADMINISTRADOR', 'GERENTE'].includes(state.currentUser.role)) { // Atualizado de user_type para role
                         const moduleReports = erpReports[moduleName] || [];
                          if (moduleReports.length > 0) {
                              reportContainer.innerHTML = `<div class="bg-white p-6 rounded-lg shadow mt-6"><h4 class="font-bold mb-4">Relatórios do Módulo</h4><div class="space-y-2">${moduleReports.map(r => `<button data-report-id="${r.id}" data-module="${moduleName}" class="report-link text-indigo-600 hover:underline block">${r.name}</button>`).join('')}</div></div>`;
                          }
                     }
                 } catch (error) {
                     document.getElementById('user-content-area').innerHTML = `<p>Erro ao carregar o módulo: ${error.message}</p>`;
                 }
             } else {
                 document.getElementById('user-content-area').innerHTML = `<p>Módulo em construção.</p>`;
             }
        }
    });
    
    function updateLoginPreview() {
        const userForm = document.getElementById('user-form');
        if (!userForm) return;

        const companySelect = userForm.querySelector('select[name="company_id"]');
        const loginInput = userForm.querySelector('input[name="login_user"]');
        const previewEl = userForm.querySelector('#final-login-preview');
        
        if (companySelect && loginInput && previewEl) {
            const selectedOption = companySelect.options[companySelect.selectedIndex];
            // A API D1 /api/get-companies retorna 'nome_fantasia' no data-fantasia
            const fantasia = selectedOption ? selectedOption.dataset.fantasia : '';
            const baseLogin = loginInput.value.trim();

            if (fantasia && baseLogin) {
                const companyFirstName = fantasia.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                previewEl.textContent = `${baseLogin}@${companyFirstName}`;
            } else {
                previewEl.textContent = '';
            }
        }
    }

    DOM.app.addEventListener('change', async (e) => {
        if (e.target.id === 'company-select-link') {
            const select = e.target, list = document.getElementById('modules-checkbox-list'), saveBtn = document.getElementById('save-links-btn');
            const companyId = select.value;
            if (!companyId) { list.innerHTML = ''; saveBtn.classList.add('hidden'); return; }
            
            // As APIs D1 /api/get-modules e /api/get-subscriptions-by-company
            // foram feitas para retornar os dados no formato que esta lógica espera.
            const [modules, subscribedIds] = await Promise.all([
                api.get('get-modules'), 
                api.get(`get-subscriptions-by-company?companyId=${companyId}`)
            ]);
            
            list.innerHTML = modules.map(m=>`<label class="block"><input type="checkbox" name="module" value="${m.id}" ${subscribedIds.includes(m.id)?'checked':''}> ${m.module_name}</label>`).join('');
            saveBtn.classList.remove('hidden');
        }
        if (e.target.closest('#user-form')) {
            updateLoginPreview();
        }
    });
    
    // Lógica do CNPJ (frontend) mantida
    let cnpjTimeout;
    DOM.app.addEventListener('input', (e) => {
        if (e.target.id === 'cnpj') {
            clearTimeout(cnpjTimeout);
            const form = e.target.closest('form');
            const cnpj = e.target.value.replace(/\D/g, '');
            if (cnpj.length === 14) {
                cnpjTimeout = setTimeout(async () => {
                    try {
                        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
                        if (!response.ok) throw new Error('CNPJ não encontrado');
                        const data = await response.json();
                        const fields = { 
                            '#razao_social': data.razao_social || '', 
                            '#nome_fantasia': data.nome_fantasia || data.razao_social || '', 
                            '#address': [data.logradouro, data.numero, data.bairro, data.municipio, data.uf].filter(Boolean).join(', ') 
                        };
                        for(const selector in fields) {
                            const field = form.querySelector(selector);
                            if(field) field.value = fields[selector];
                        }
                    } catch (error) {
                        console.error("Erro ao buscar CNPJ:", error);
                    }
                }, 500);
            }
        }
         if (e.target.closest('#user-form')) {
            updateLoginPreview();
         }
    });

    function init() {
        const loginSection = document.getElementById('login-section');
        loginSection.innerHTML = `<div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md"><h1 class="text-2xl font-bold text-center mb-6">Acesso à Plataforma</h1><form id="login-form"><div class="mb-4"><label for="login_field" class="block text-sm">Usuário ou Email</label><input type="text" id="login_field" class="w-full mt-1 px-4 py-2 border rounded-lg" required></div><div class="mb-6"><label for="password" class="block text-sm">Senha</label><input type="password" id="password" class="w-full mt-1 px-4 py-2 border rounded-lg" required></div><div id="login-error" class="text-red-500 text-sm text-center mb-4 h-5"></div><button type="submit" class="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">Entrar</button></form></div>`;
    }

    init();
});

