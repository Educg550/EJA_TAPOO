import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api, { TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext(null);

// Lançado quando a conta foi criada, mas o login automático em seguida falhou.
export class ContaCriadaSemLoginError extends Error {
    constructor(causa) {
        super('Conta criada, mas não foi possível entrar automaticamente.');
        this.name = 'ContaCriadaSemLoginError';
        this.causa = causa;
    }
}

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregandoSessao, setCarregandoSessao] = useState(true);
    // Verdadeiro quando há token salvo, mas a API não respondeu (rede, tempo esgotado, 5xx).
    const [falhaVerificacao, setFalhaVerificacao] = useState(false);

    const carregarMeuPerfil = useCallback(async () => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
            setUsuario(null);
            setFalhaVerificacao(false);
            setCarregandoSessao(false);
            return null;
        }

        setCarregandoSessao(true);
        try {
            const { data } = await api.get('/usuarios/me');
            setUsuario(data);
            setFalhaVerificacao(false);
            return data;
        } catch (error) {
            if (error.response?.status === 401) {
                // Token inválido ou expirado: a sessão acabou de fato.
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                setUsuario(null);
                setFalhaVerificacao(false);
            } else {
                // Falha temporária: mantém o token para tentar de novo.
                setFalhaVerificacao(true);
            }
            return null;
        } finally {
            setCarregandoSessao(false);
        }
    }, []);

    useEffect(() => {
        carregarMeuPerfil();

        const handleUnauthorized = () => {
            setUsuario(null);
            setFalhaVerificacao(false);
        };

        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    }, [carregarMeuPerfil]);

    const login = useCallback(
        async (email, senha) => {
            const { data } = await api.post('/auth/login', { email, senha });
            localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
            return carregarMeuPerfil();
        },
        [carregarMeuPerfil],
    );

    const cadastrar = useCallback(
        async (dadosCadastro) => {
            await api.post('/auth/cadastro', dadosCadastro);
            try {
                return await login(dadosCadastro.email, dadosCadastro.senha);
            } catch (error) {
                throw new ContaCriadaSemLoginError(error);
            }
        },
        [login],
    );

    const logout = useCallback(async () => {
        try {
            if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
                await api.delete('/auth/sessao');
            }
        } catch {
            // Falha ao revogar no servidor não impede a saída local; o token expira sozinho.
        } finally {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setUsuario(null);
            setFalhaVerificacao(false);
        }
    }, []);

    const atualizarUsuarioLocal = useCallback((novosDados) => {
        setUsuario((atual) => (atual ? { ...atual, ...novosDados } : atual));
    }, []);

    const possuiPapel = useCallback(
        (papeisPermitidos) => Boolean(usuario?.tipo) && papeisPermitidos.includes(usuario.tipo),
        [usuario],
    );

    const valorContexto = useMemo(
        () => ({
            usuario,
            autenticado: Boolean(usuario),
            carregandoSessao,
            falhaVerificacao,
            login,
            cadastrar,
            logout,
            carregarMeuPerfil,
            atualizarUsuarioLocal,
            possuiPapel,
        }),
        [
            usuario,
            carregandoSessao,
            falhaVerificacao,
            login,
            cadastrar,
            logout,
            carregarMeuPerfil,
            atualizarUsuarioLocal,
            possuiPapel,
        ],
    );

    return <AuthContext.Provider value={valorContexto}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
    }
    return context;
}
