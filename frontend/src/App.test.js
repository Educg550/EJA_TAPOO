import { render, screen, waitFor } from '@testing-library/react';
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

test('exibe o catálogo de cursos na página inicial', async () => {
    renderizarEm('/');
    expect(await screen.findByRole('heading', { name: 'Catálogo de Cursos Externos' })).toBeInTheDocument();
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
