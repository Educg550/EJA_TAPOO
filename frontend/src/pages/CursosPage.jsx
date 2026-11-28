import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import Paginacao from '../components/common/Paginacao';
import { CURSOS_POR_PAGINA, listarCursos } from '../services/cursos';
import { extrairMensagemErro } from '../services/erros';

function CartaoCurso({ curso }) {
    return (
        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                    {curso.titulo}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip icon={<AccessTimeIcon />} label={`${curso.carga_horaria_horas} horas`} />
                    <Chip icon={<EventIcon />} label={`Até ${curso.prazo_realizacao_dias} dias para concluir`} />
                </Box>
            </CardContent>
            <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                    href={curso.url_oficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    endIcon={<OpenInNewIcon />}
                    aria-label={`Acessar o curso ${curso.titulo} (abre em nova aba)`}
                >
                    Acessar curso
                </Button>
            </CardActions>
        </Card>
    );
}

export default function CursosPage() {
    const [texto, setTexto] = useState('');
    const [busca, setBusca] = useState('');
    const [pagina, setPagina] = useState(0);
    const [cursos, setCursos] = useState([]);
    const [total, setTotal] = useState(0);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        let ativo = true;
        setCarregando(true);
        setErro('');
        listarCursos({ busca, pagina })
            .then((resultado) => {
                if (ativo) {
                    setCursos(resultado.cursos);
                    setTotal(resultado.total);
                }
            })
            .catch((error) => {
                if (ativo) {
                    setCursos([]);
                    setTotal(0);
                    setErro(extrairMensagemErro(error ?? {}));
                }
            })
            .finally(() => {
                if (ativo) {
                    setCarregando(false);
                }
            });
        return () => {
            ativo = false;
        };
    }, [busca, pagina, tentativa]);

    const handleBuscar = (evento) => {
        evento.preventDefault();
        setBusca(texto.trim());
        setPagina(0);
    };

    const handleLimpar = () => {
        setTexto('');
        setBusca('');
        setPagina(0);
    };

    const mudarPagina = (novaPagina) => {
        setPagina(novaPagina);
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    return (
        <Box>
            <Paper elevation={1} sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
                <Typography variant="h2" component="h1" gutterBottom>
                    Catálogo de Cursos Externos
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Cursos gratuitos e abertos da Escola Virtual de Governo. Clique em “Acessar curso” para se
                    inscrever no site oficial.
                </Typography>

                <Box
                    component="form"
                    role="search"
                    onSubmit={handleBuscar}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}
                >
                    <TextField
                        label="Buscar curso pelo nome"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: 120 } }}
                        sx={{ flexGrow: 1, minWidth: 240 }}
                    />
                    <Button type="submit" variant="contained" size="large" startIcon={<SearchIcon />}>
                        Buscar
                    </Button>
                    {busca && (
                        <Button variant="text" size="large" onClick={handleLimpar}>
                            Limpar busca
                        </Button>
                    )}
                </Box>
            </Paper>

            <Box aria-live="polite" aria-busy={carregando}>
                {carregando && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress aria-label="Carregando cursos" />
                    </Box>
                )}

                {!carregando && erro && (
                    <Alert
                        severity="error"
                        role="alert"
                        action={
                            <Button color="inherit" onClick={() => setTentativa((n) => n + 1)}>
                                Tentar novamente
                            </Button>
                        }
                    >
                        {erro}
                    </Alert>
                )}

                {!carregando && !erro && cursos.length === 0 && (
                    <Alert severity="info">
                        {busca
                            ? `Nenhum curso encontrado para “${busca}”. Tente outra palavra.`
                            : 'Nenhum curso disponível no momento.'}
                    </Alert>
                )}

                {!carregando && !erro && cursos.length > 0 && (
                    <>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            {busca
                                ? `${total.toLocaleString('pt-BR')} ${total === 1 ? 'curso encontrado' : 'cursos encontrados'} para “${busca}”`
                                : `${total.toLocaleString('pt-BR')} ${total === 1 ? 'curso disponível' : 'cursos disponíveis'}`}
                        </Typography>
                        <Grid container spacing={2} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                            {cursos.map((curso) => (
                                <Grid key={curso.id} size={{ xs: 12, sm: 6, md: 4 }} component="li">
                                    <CartaoCurso curso={curso} />
                                </Grid>
                            ))}
                        </Grid>
                    </>
                )}
            </Box>

            {!erro && (
                <Paginacao
                    pagina={pagina}
                    totalPaginas={Math.ceil(total / CURSOS_POR_PAGINA)}
                    onMudar={mudarPagina}
                    desabilitada={carregando}
                    rotulo="Paginação dos cursos"
                />
            )}
        </Box>
    );
}
