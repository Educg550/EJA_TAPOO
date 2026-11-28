import api from './api';

export const CURSOS_POR_PAGINA = 12;

// Lista uma página do catálogo público (GET /cursos).
// `pagina` começa em 0. O corpo traz só os cursos da página; o total da busca vem no
// cabeçalho X-Total-Count. Sem o cabeçalho, o total cai para o tamanho da página recebida.
export async function listarCursos({ busca = '', pagina = 0, porPagina = CURSOS_POR_PAGINA } = {}) {
    const params = { limite: porPagina, inicio: pagina * porPagina };
    if (busca) {
        params.busca = busca;
    }

    const resposta = await api.get('/cursos', { params });
    const total = Number(resposta.headers?.['x-total-count']);
    return {
        cursos: resposta.data,
        total: Number.isFinite(total) ? total : resposta.data.length,
    };
}
