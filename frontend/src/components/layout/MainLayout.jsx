import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Container,
    Chip,
    Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext';
import rotas from '../../routes';

// Botões de conta (Entrar / Criar Conta / Sair), compartilhados pela barra superior e pela gaveta.
function BotoesConta({ naGaveta, autenticado, onNavegar, onSair }) {
    if (autenticado) {
        return (
            <Button
                color={naGaveta ? 'error' : 'inherit'}
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={onSair}
                fullWidth={naGaveta}
                sx={naGaveta ? undefined : { borderColor: 'rgba(255,255,255,0.7)' }}
            >
                {naGaveta ? 'Sair da Conta' : 'Sair'}
            </Button>
        );
    }

    return (
        <>
            <Button
                component={RouterLink}
                to="/login"
                color={naGaveta ? 'primary' : 'inherit'}
                variant={naGaveta ? 'outlined' : 'text'}
                startIcon={<LoginIcon />}
                onClick={onNavegar}
                fullWidth={naGaveta}
            >
                Entrar
            </Button>
            <Button
                component={RouterLink}
                to="/cadastro"
                variant="contained"
                color="secondary"
                startIcon={<PersonAddIcon />}
                onClick={onNavegar}
                fullWidth={naGaveta}
            >
                Criar Conta
            </Button>
        </>
    );
}

export default function MainLayout() {
    const [drawerAberto, setDrawerAberto] = useState(false);
    const { usuario, autenticado, logout, possuiPapel } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        setDrawerAberto(false);
        navigate('/login');
    };

    const fecharDrawer = () => setDrawerAberto(false);

    const itensNavegacao = rotas
        .filter((rota) => rota.menu && (!rota.papeis || possuiPapel(rota.papeis)))
        .map((rota) => ({
            caminho: rota.caminho,
            texto: rota.menu.texto,
            icone: rota.menu.icone,
            ativo: location.pathname.startsWith(rota.caminho),
        }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Box
                component="a"
                href="#conteudo-principal"
                sx={{
                    position: 'absolute',
                    left: '-9999px',
                    zIndex: 9999,
                    p: 2,
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    fontWeight: 'bold',
                    '&:focus': { left: 16, top: 16 },
                }}
            >
                Pular para o conteúdo principal
            </Box>

            <AppBar position="sticky" color="primary">
                <Container maxWidth="lg">
                    <Toolbar disableGutters sx={{ gap: 1, py: 0.5 }}>
                        <IconButton
                            color="inherit"
                            aria-label="Abrir menu de navegação"
                            edge="start"
                            onClick={() => setDrawerAberto(true)}
                            sx={{ display: { md: 'none' }, mr: 1 }}
                        >
                            <MenuIcon fontSize="large" />
                        </IconButton>

                        <Typography
                            variant="h4"
                            component={RouterLink}
                            to="/cursos"
                            sx={{
                                color: 'inherit',
                                textDecoration: 'none',
                                fontWeight: 700,
                                mr: 3,
                                letterSpacing: '-0.5px',
                            }}
                        >
                            Plataforma EJA
                        </Typography>

                        <Box
                            component="nav"
                            aria-label="Menu principal"
                            sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}
                        >
                            {itensNavegacao.map(({ caminho, texto, icone, ativo }) => (
                                <Button
                                    key={caminho}
                                    component={RouterLink}
                                    to={caminho}
                                    color="inherit"
                                    startIcon={icone}
                                    aria-current={ativo ? 'page' : undefined}
                                    sx={{
                                        bgcolor: ativo ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                                        borderBottom: ativo ? '3px solid #FFFFFF' : '3px solid transparent',
                                        borderRadius: 1,
                                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)' },
                                    }}
                                >
                                    {texto}
                                </Button>
                            ))}
                        </Box>

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
                            {autenticado && (
                                <Chip
                                    label={`${usuario.nome_exibicao} (${usuario.tipo})`}
                                    sx={{
                                        bgcolor: 'rgba(255, 255, 255, 0.18)',
                                        color: '#FFFFFF',
                                        fontWeight: 600,
                                    }}
                                />
                            )}
                            <BotoesConta autenticado={autenticado} onSair={handleLogout} />
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            <Drawer
                anchor="left"
                open={drawerAberto}
                onClose={fecharDrawer}
                slotProps={{ paper: { sx: { width: 290 } } }}
            >
                <Box sx={{ p: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                    <Typography variant="h4">Plataforma EJA</Typography>
                    {autenticado && (
                        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                            Olá, {usuario.nome_exibicao} ({usuario.tipo})
                        </Typography>
                    )}
                </Box>
                <Divider />
                <List component="nav" aria-label="Menu lateral">
                    {itensNavegacao.map(({ caminho, texto, icone, ativo }) => (
                        <ListItem key={caminho} disablePadding>
                            <ListItemButton
                                component={RouterLink}
                                to={caminho}
                                selected={ativo}
                                onClick={fecharDrawer}
                                sx={{ minHeight: 52 }}
                            >
                                <ListItemIcon sx={{ color: ativo ? 'primary.main' : 'inherit' }}>{icone}</ListItemIcon>
                                <ListItemText
                                    primary={texto}
                                    slotProps={{ primary: { sx: { fontWeight: ativo ? 700 : 500 } } }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <BotoesConta naGaveta autenticado={autenticado} onNavegar={fecharDrawer} onSair={handleLogout} />
                </Box>
            </Drawer>

            <Container id="conteudo-principal" component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
                <Outlet />
            </Container>

            <Box
                component="footer"
                sx={{
                    py: 3,
                    px: 2,
                    mt: 'auto',
                    bgcolor: '#E5E7EB',
                    borderTop: '1px solid #D1D5DB',
                }}
            >
                <Container maxWidth="lg">
                    <Typography variant="body2" color="text.secondary" align="center">
                        Plataforma EJA — Educação de Jovens e Adultos: Cursos, Oportunidades de Trabalho e Orientação
                        Acadêmica.
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}
