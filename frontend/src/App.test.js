import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import api, { TOKEN_STORAGE_KEY } from './services/api';

jest.mock('./services/api', () => ({
    __esModule: true,
    TOKEN_STORAGE_KEY: '@PlataformaEJA:token',
    UNAUTHORIZED_EVENT: 'eja:unauthorized',
    default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const estudante = { id: 1, nome_exibicao: 'Ana', tipo: 'estudante' };

function renderizarEm(caminho) {
    window.history.pushState({}, '', caminho);
    return render(<App />);
}

beforeEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
});

function curso(id, titulo = `Curso ${id}`) {
    return {
        id,
        titulo,
        carga_horaria_horas: 20,
        prazo_realizacao_dias: 30,
        url_oficial: `https://example.com/curso/${id}`,
        tipo_oferta: 'Curso Aberto',
    };
}

// Resposta de GET /cursos como o Axios entrega: lista no corpo e total no cabeçalho.
function paginaDeCursos(cursos, total = cursos.length) {
    return { data: cursos, headers: { 'x-total-count': String(total) } };
}

test('exibe o catálogo de cursos na página inicial', async () => {
    api.get.mockResolvedValue(paginaDeCursos([curso(1, 'Excel básico')]));
    renderizarEm('/');

    expect(await screen.findByRole('heading', { name: 'Catálogo de Cursos Externos' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Excel básico' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Acessar o curso Excel básico/ })).toHaveAttribute(
        'href',
        'https://example.com/curso/1',
    );
    expect(api.get).toHaveBeenCalledWith('/cursos', { params: { limite: 12, inicio: 0 } });
    expect(screen.getByText('1 curso disponível')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginação dos cursos' })).not.toBeInTheDocument();
});

test('busca de cursos envia o termo e volta para a primeira página', async () => {
    api.get.mockResolvedValue(paginaDeCursos([curso(1)]));
    renderizarEm('/cursos');

    await userEvent.type(await screen.findByLabelText('Buscar curso pelo nome'), '  excel ');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
        expect(api.get).toHaveBeenLastCalledWith('/cursos', { params: { limite: 12, inicio: 0, busca: 'excel' } }),
    );
    expect(await screen.findByText('1 curso encontrado para “excel”')).toBeInTheDocument();
});

test('paginação de cursos mostra o total e as páginas em grupos de cinco', async () => {
    const pagina = (n) => paginaDeCursos([curso(n, `Curso da página ${n}`)], 1027);
    api.get.mockImplementation((_, { params }) => Promise.resolve(pagina(params.inicio / 12 + 1)));
    renderizarEm('/cursos');

    const paginacao = await screen.findByRole('navigation', { name: 'Paginação dos cursos' });
    expect(screen.getByText('1.027 cursos disponíveis')).toBeInTheDocument();
    expect(within(paginacao).getByText('Página 1 de 86')).toBeInTheDocument();
    const numeros = () => within(paginacao).getAllByRole('button', { name: /página \d+/i }).map((b) => b.textContent);
    expect(numeros()).toEqual(['1', '2', '3', '4', '5']);
    expect(within(paginacao).getByRole('button', { name: 'Página 1, página atual' })).toHaveAttribute(
        'aria-current',
        'page',
    );
    expect(within(paginacao).getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(within(paginacao).getByRole('button', { name: '5 páginas anteriores' })).toBeDisabled();

    await userEvent.click(within(paginacao).getByRole('button', { name: 'Ir para a página 3' }));
    expect(await screen.findByRole('heading', { name: 'Curso da página 3' })).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/cursos', { params: { limite: 12, inicio: 24 } });

    await userEvent.click(within(paginacao).getByRole('button', { name: '5 próximas páginas' }));
    expect(await screen.findByRole('heading', { name: 'Curso da página 6' })).toBeInTheDocument();
    expect(numeros()).toEqual(['6', '7', '8', '9', '10']);

    await userEvent.click(within(paginacao).getByRole('button', { name: 'Página anterior' }));
    expect(await screen.findByRole('heading', { name: 'Curso da página 5' })).toBeInTheDocument();
    expect(numeros()).toEqual(['1', '2', '3', '4', '5']);
});

test('último grupo de páginas pode ter menos de cinco e bloqueia o avanço', async () => {
    api.get.mockImplementation((_, { params }) =>
        Promise.resolve(paginaDeCursos([curso(params.inicio / 12 + 1)], 7 * 12)),
    );
    renderizarEm('/cursos');

    const paginacao = await screen.findByRole('navigation', { name: 'Paginação dos cursos' });
    await userEvent.click(within(paginacao).getByRole('button', { name: '5 próximas páginas' }));
    expect(await screen.findByRole('heading', { name: 'Curso 6' })).toBeInTheDocument();

    expect(within(paginacao).getAllByRole('button', { name: /página \d+/i }).map((b) => b.textContent)).toEqual([
        '6',
        '7',
    ]);
    expect(within(paginacao).getByRole('button', { name: '5 próximas páginas' })).toBeDisabled();
    await userEvent.click(within(paginacao).getByRole('button', { name: 'Ir para a página 7' }));
    expect(await screen.findByRole('heading', { name: 'Curso 7' })).toBeInTheDocument();
    expect(within(paginacao).getByRole('button', { name: 'Próxima página' })).toBeDisabled();
});

test('busca sem resultados informa o usuário', async () => {
    api.get.mockResolvedValue(paginaDeCursos([]));
    renderizarEm('/cursos');

    await userEvent.type(await screen.findByLabelText('Buscar curso pelo nome'), 'xyz');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText(/Nenhum curso encontrado para “xyz”/)).toBeInTheDocument();
});

test('falha ao carregar cursos permite tentar de novo', async () => {
    api.get.mockRejectedValueOnce({ request: {} }).mockResolvedValueOnce(paginaDeCursos([curso(1, 'Excel básico')]));
    renderizarEm('/cursos');

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'Excel básico' })).toBeInTheDocument();
});

test('redireciona visitante de rota protegida para o login', async () => {
    renderizarEm('/solicitacoes');
    expect(await screen.findByRole('heading', { name: 'Entrar na Plataforma' })).toBeInTheDocument();
});

test('após o login, volta para a página protegida que foi pedida', async () => {
    api.post.mockResolvedValue({ data: { access_token: 'token-ok' } });
    api.get.mockResolvedValue({ data: estudante });
    renderizarEm('/solicitacoes');

    await userEvent.type(await screen.findByLabelText(/E-mail/), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/), 'senha-bem-longa');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Minhas Solicitações de Apoio' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-ok');
});

test('credenciais incorretas mostram a mensagem da API', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { detail: 'E-mail ou senha inválidos.' } } });
    renderizarEm('/login');

    await userEvent.type(await screen.findByLabelText(/E-mail/), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/), 'senha-errada-123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
});

test('falha temporária ao verificar a sessão mantém o token e permite tentar de novo', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-salvo');
    api.get.mockRejectedValueOnce({ request: {} }).mockResolvedValueOnce({ data: estudante });
    renderizarEm('/solicitacoes');

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'Minhas Solicitações de Apoio' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-salvo');
});

test('sessão expirada (401) remove o token', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-vencido');
    api.get.mockRejectedValue({ response: { status: 401 } });
    renderizarEm('/solicitacoes');

    expect(await screen.findByRole('heading', { name: 'Entrar na Plataforma' })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull());
});

test('conta criada com falha no login automático orienta a entrar manualmente', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 2 } }).mockRejectedValueOnce({ request: {} });
    renderizarEm('/cadastro');

    await userEvent.type(await screen.findByLabelText(/Nome de exibição/), 'Ana');
    await userEvent.type(screen.getByLabelText(/E-mail/), 'ana@example.com');
    await userEvent.type(screen.getByLabelText(/Senha/), 'senha-bem-longa');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText(/Sua conta foi criada/)).toBeInTheDocument();
});
