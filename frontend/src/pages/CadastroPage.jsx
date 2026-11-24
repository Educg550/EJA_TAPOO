import React, { useState } from 'react';
import { Navigate, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Link,
    Paper,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from '@mui/material';
import { ContaCriadaSemLoginError, useAuth } from '../context/AuthContext';
import { extrairMensagemErro } from '../services/erros';

const SENHA_MINIMA = 12;

export default function CadastroPage() {
    const { autenticado, cadastrar } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const destino = location.state?.from?.pathname || '/cursos';

    const [form, setForm] = useState({
        nome_exibicao: '',
        email: '',
        senha: '',
        tipo: 'estudante',
        disciplinas: '',
        disponibilidade: '',
    });
    const [erro, setErro] = useState('');
    const [contaCriada, setContaCriada] = useState(false);
    const [enviando, setEnviando] = useState(false);

    if (autenticado && !enviando) {
        return <Navigate to={destino} replace />;
    }

    const alterar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }));
    const ehLicenciando = form.tipo === 'licenciando';

    const handleSubmit = async (evento) => {
        evento.preventDefault();
        setErro('');
        setEnviando(true);

        const dados = {
            nome_exibicao: form.nome_exibicao.trim(),
            email: form.email.trim(),
            senha: form.senha,
            tipo: form.tipo,
        };
        if (ehLicenciando) {
            dados.disciplinas = form.disciplinas
                .split(',')
                .map((disciplina) => disciplina.trim())
                .filter(Boolean);
            dados.disponibilidade = form.disponibilidade.trim();
        }

        try {
            const perfil = await cadastrar(dados);
            if (perfil) {
                navigate(destino, { replace: true });
                return;
            }
            setContaCriada(true);
        } catch (error) {
            if (error instanceof ContaCriadaSemLoginError) {
                setContaCriada(true);
            } else {
                setErro(extrairMensagemErro(error));
            }
        }
        setEnviando(false);
    };

    if (contaCriada) {
        return (
            <Paper elevation={1} sx={{ p: 4, maxWidth: 560, mx: 'auto' }}>
                <Alert severity="success" sx={{ mb: 3, fontSize: '1.05rem' }}>
                    Sua conta foi criada, mas não conseguimos entrar automaticamente. Entre com seu e-mail e senha.
                </Alert>
                <Button component={RouterLink} to="/login" state={location.state} variant="contained">
                    Ir para o login
                </Button>
            </Paper>
        );
    }

    return (
        <Paper elevation={1} sx={{ p: 4, maxWidth: 560, mx: 'auto' }}>
            <Typography variant="h2" component="h1" gutterBottom>
                Criar Conta
            </Typography>

            {erro && (
                <Alert severity="error" sx={{ mb: 2 }} role="alert">
                    {erro}
                </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl>
                    <FormLabel id="tipo-conta">Eu sou</FormLabel>
                    <RadioGroup aria-labelledby="tipo-conta" value={form.tipo} onChange={alterar('tipo')}>
                        <FormControlLabel value="estudante" control={<Radio />} label="Estudante da EJA" />
                        <FormControlLabel
                            value="licenciando"
                            control={<Radio />}
                            label="Licenciando (quero oferecer orientação)"
                        />
                    </RadioGroup>
                </FormControl>

                <TextField
                    label="Nome de exibição"
                    autoComplete="name"
                    required
                    value={form.nome_exibicao}
                    onChange={alterar('nome_exibicao')}
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                />
                <TextField
                    label="E-mail"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={alterar('email')}
                    slotProps={{ htmlInput: { maxLength: 254 } }}
                />
                <TextField
                    label="Senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.senha}
                    onChange={alterar('senha')}
                    helperText={`Use pelo menos ${SENHA_MINIMA} caracteres.`}
                    slotProps={{ htmlInput: { minLength: SENHA_MINIMA, maxLength: 128 } }}
                />

                {ehLicenciando && (
                    <>
                        <TextField
                            label="Disciplinas"
                            required
                            value={form.disciplinas}
                            onChange={alterar('disciplinas')}
                            helperText="Separe por vírgulas. Ex.: Matemática, Português"
                        />
                        <TextField
                            label="Disponibilidade"
                            required
                            multiline
                            minRows={2}
                            value={form.disponibilidade}
                            onChange={alterar('disponibilidade')}
                            helperText="Ex.: terças e quintas, das 19h às 21h"
                            slotProps={{ htmlInput: { maxLength: 500 } }}
                        />
                    </>
                )}

                <Button type="submit" variant="contained" color="secondary" size="large" disabled={enviando}>
                    {enviando ? 'Criando conta...' : 'Criar conta'}
                </Button>
            </Box>

            <Typography variant="body1" sx={{ mt: 3 }}>
                Já tem conta?{' '}
                <Link component={RouterLink} to="/login" state={location.state}>
                    Entrar
                </Link>
            </Typography>
        </Paper>
    );
}
