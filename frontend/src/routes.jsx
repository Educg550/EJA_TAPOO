import React from 'react';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import PeopleIcon from '@mui/icons-material/People';
import ForumIcon from '@mui/icons-material/Forum';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LoginPage from './pages/LoginPage';
import CadastroPage from './pages/CadastroPage';
import CursosPage from './pages/CursosPage';

// Fonte única das rotas: o App monta as rotas e o MainLayout monta o menu a partir desta tabela.
// `papeis` ausente = rota pública; `menu` ausente = rota fora do menu de navegação.
// `componente` ausente = página provisória com `titulo` e `descricao`.
const rotas = [
    {
        caminho: '/cursos',
        componente: CursosPage,
        menu: { texto: 'Cursos Externos', icone: <SchoolIcon /> },
        titulo: 'Catálogo de Cursos Externos',
        descricao: 'Consulta pública de cursos abertos com busca por título e paginação (GET /cursos).',
    },
    {
        caminho: '/vagas',
        menu: { texto: 'Vagas de Trabalho', icone: <WorkIcon /> },
        titulo: 'Vagas de Trabalho',
        descricao:
            'Consulta pública de oportunidades com filtros de UF/Município (IBGE), área e escolaridade (GET /vagas).',
    },
    {
        caminho: '/login',
        componente: LoginPage,
        titulo: 'Entrar na Plataforma',
        descricao: 'Autenticação por e-mail e senha (POST /auth/login).',
    },
    {
        caminho: '/cadastro',
        componente: CadastroPage,
        titulo: 'Criar Conta',
        descricao: 'Cadastro público de Estudante da EJA ou Licenciando (POST /auth/cadastro).',
    },
    {
        caminho: '/licenciandos',
        papeis: ['estudante'],
        menu: { texto: 'Buscar Orientadores', icone: <PeopleIcon /> },
        titulo: 'Orientadores Acadêmicos (Licenciandos)',
        descricao: 'Listagem de licenciandos e envio de solicitação de apoio (GET /licenciandos e POST /solicitacoes).',
    },
    {
        caminho: '/solicitacoes',
        papeis: ['estudante', 'licenciando'],
        menu: { texto: 'Minhas Solicitações', icone: <ForumIcon /> },
        titulo: 'Minhas Solicitações de Apoio',
        descricao:
            'Acompanhamento de solicitações, aceite/recusa/cancelamento e exibição de e-mails após aceite (GET /solicitacoes e GET /solicitacoes/{id}/contatos).',
    },
    {
        caminho: '/meu-perfil',
        papeis: ['licenciando'],
        menu: { texto: 'Meu Perfil de Orientador', icone: <PersonIcon /> },
        titulo: 'Meu Perfil de Licenciando',
        descricao: 'Atualização de disciplinas de atuação e disponibilidade de horários (PUT /licenciandos/me).',
    },
    {
        caminho: '/admin/vagas',
        papeis: ['administrador'],
        menu: { texto: 'Gerenciar Vagas (Admin)', icone: <AdminPanelSettingsIcon /> },
        titulo: 'Gestão Administrativa de Vagas',
        descricao:
            'Listagem completa incluindo vagas encerradas/vencidas, cadastro, edição e encerramento (GET /admin/vagas, POST/PUT/DELETE /vagas).',
    },
];

export default rotas;
