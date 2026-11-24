import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregandoSessao, setCarregandoSessao] = useState(true);

    const carregarMeuPerfil = useCallback(async () => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
            setUsuario(null);
            setCarregandoSessao(false);
            return null;
        }

        try {
            const { data } = await api.get('/usuarios/me');
            setUsuario(data);
            return data;
        } catch (error) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setUsuario(null);
            return null;
        } finally {
            setCarregandoSessao(false);
        }
    }, []);

    useEffect(() => {
        carregarMeuPerfil();

        const handleUnauthorized = () => {
            setUsuario(null);
        };

        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    }, [carregarMeuPerfil]);

    const login = async (email, senha) => {
        const { data } = await api.post('/auth/login', { email, senha });
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        const perfil = await carregarMeuPerfil();
        return perfil;
    };

    const cadastrar = async (dadosCadastro) => {
        await api.post('/auth/cadastro', dadosCadastro);
        return await login(dadosCadastro.email, dadosCadastro.senha);
    };

    const logout = async () => {
        try {
            if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
                await api.delete('/auth/sessao');
            }
        } catch {
        } finally {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setUsuario(null);
        }
    };

    const atualizarUsuarioLocal = (novosDados) => {
        setUsuario((atual) => (atual ? { ...atual, ...novosDados } : atual));
    };

    const possuiPapel = useCallback(
        (papeisPermitidos) => {
            if (!usuario?.tipo) return false;
            const tipoAtual = usuario.tipo.toLowerCase();
            return papeisPermitidos.some((papel) => {
                const alvo = papel.toLowerCase();
                if (alvo === 'administrador' || alvo === 'admin') {
                    return tipoAtual === 'administrador' || tipoAtual === 'admin';
                }
                return tipoAtual === alvo;
            });
        },
        [usuario]
    );

    const valorContexto = {
        usuario,
        autenticado: Boolean(usuario),
        carregandoSessao,
        login,
        cadastrar,
        logout,
        carregarMeuPerfil,
        atualizarUsuarioLocal,
        possuiPapel,
    };

    return <AuthContext.Provider value={valorContexto}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
    }
    return context;
}