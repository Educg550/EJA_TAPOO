import axios from 'axios';

export const TOKEN_STORAGE_KEY = '@PlataformaEJA:token';
export const UNAUTHORIZED_EVENT = 'eja:unauthorized';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
        }
        return Promise.reject(error);
    }
);

export function extrairMensagemErro(error, fallback = 'Ocorreu um erro inesperado. Tente novamente.') {
    if (!error.response) {
        return 'Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está ativa.';
    }

    const { status, data } = error.response;

    if (status === 422 && Array.isArray(data?.detail)) {
        return data.detail
            .map((err) => {
                const campo = err.loc?.[err.loc.length - 1];
                return campo ? `Campo "${campo}": ${err.msg}` : err.msg;
            })
            .join(' | ');
    }

    if (typeof data?.detail === 'string') {
        return data.detail;
    }

    const mensagensPorStatus = {
        401: 'Sua sessão expirou ou as credenciais estão incorretas. Faça login novamente.',
        403: 'Você não tem permissão para realizar esta operação.',
        404: 'O registro solicitado não foi encontrado.',
        409: 'Operação conflitante: registro já existente ou transição de estado não permitida.',
        422: 'Os dados informados são inválidos. Revise os campos do formulário.',
        502: 'O serviço de localidades do IBGE está temporariamente indisponível.',
    };

    return mensagensPorStatus[status] || fallback;
}

export default api;