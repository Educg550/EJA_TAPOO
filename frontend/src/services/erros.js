// Converte erros do Axios em mensagens para o usuário, sem depender do cliente HTTP.
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
        401: 'Sua sessão expirou. Faça login novamente.',
        403: 'Você não tem permissão para realizar esta operação.',
        404: 'O registro solicitado não foi encontrado.',
        409: 'Operação conflitante: registro já existente ou transição de estado não permitida.',
        422: 'Os dados informados são inválidos. Revise os campos do formulário.',
        502: 'O serviço de localidades do IBGE está temporariamente indisponível.',
    };

    return mensagensPorStatus[status] || fallback;
}
