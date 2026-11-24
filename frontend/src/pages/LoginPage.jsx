import React, { useState } from 'react';
import { Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { extrairMensagemErro } from '../services/erros';

export default function LoginPage() {
    const { autenticado, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const destino = location.state?.from?.pathname || '/cursos';

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const [enviando, setEnviando] = useState(false);

    if (autenticado && !enviando) {
        return <Navigate to={destino} replace />;
    }

    const handleSubmit = async (evento) => {
        evento.preventDefault();
        setErro('');
        setEnviando(true);
        try {
            const perfil = await login(email, senha);
            if (perfil) {
                navigate(destino, { replace: true });
                return;
            }
            setErro('Você entrou, mas não foi possível carregar seu perfil. Tente novamente em instantes.');
        } catch (error) {
            setErro(extrairMensagemErro(error));
        }
        setEnviando(false);
    };

    return (
        <Paper elevation={1} sx={{ p: 4, maxWidth: 480, mx: 'auto' }}>
            <Typography variant="h2" component="h1" gutterBottom>
                Entrar na Plataforma
            </Typography>

            {erro && (
                <Alert severity="error" sx={{ mb: 2 }} role="alert">
                    {erro}
                </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    label="Senha"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                />
                <Button type="submit" variant="contained" size="large" disabled={enviando}>
                    {enviando ? 'Entrando...' : 'Entrar'}
                </Button>
            </Box>

            <Typography variant="body1" sx={{ mt: 3 }}>
                Ainda não tem conta?{' '}
                <Link component={RouterLink} to="/cadastro" state={location.state}>
                    Criar conta
                </Link>
            </Typography>
        </Paper>
    );
}
