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
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import PeopleIcon from '@mui/icons-material/People';
import ForumIcon from '@mui/icons-material/Forum';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext';

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

    const itensNavegacao = [
        { texto: 'Cursos Externos', caminho: '/cursos', icone: <SchoolIcon />, visivel: true },
        { texto: 'Vagas de Trabalho', caminho: '/vagas', icone: <WorkIcon />, visivel: true },
        {
            texto: 'Buscar Orientadores',
            caminho: '/licenciandos',
            icone: <PeopleIcon />,
            visivel: autenticado && possuiPapel(['estudante']),
        },
        {
            texto: 'Minhas Solicitações',
            caminho: '/solicitacoes',
            icone: <ForumIcon />,
            visivel: autenticado && possuiPapel(['estudante', 'licenciando']),
        },
        {
            texto: 'Meu Perfil de Orientador',
            caminho: '/meu-perfil',
            icone: <PersonIcon />,
            visivel: autenticado && possuiPapel(['licenciando']),
        },
        {
            texto: 'Gerenciar Vagas (Admin)',
            caminho: '/admin/vagas',
            icone: <AdminPanelSettingsIcon />,
            visivel: autenticado && possuiPapel(['administrador', 'admin']),
        },
    ].filter((item) => item.visivel);

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
                            {itensNavegacao.map((item) => {
                                const ativo = location.pathname.startsWith(item.caminho);
                                return (
                                    <Button
                                        key={item.caminho}
                                        component={RouterLink}
                                        to={item.caminho}
                                        color="inherit"
                                        startIcon={item.icone}
                                        aria-current={ativo ? 'page' : undefined}
                                        sx={{
                                            bgcolor: ativo ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                                            borderBottom: ativo ? '3px solid #FFFFFF' : '3px solid transparent',
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)' },
                                        }}
                                    >
                                        {item.texto}
                                    </Button>
                                );
                            })}
                        </Box>

                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
                            {autenticado ? (
                                <>
                                    <Chip
                                        label={`${usuario.nome_exibicao} (${usuario.tipo})`}
                                        sx={{
                                            bgcolor: 'rgba(255, 255, 255, 0.18)',
                                            color: '#FFFFFF',
                                            fontWeight: 600,
                                        }}
                                    />
                                    <Button
                                        color="inherit"
                                        variant="outlined"
                                        startIcon={<LogoutIcon />}
                                        onClick={handleLogout}
                                        sx={{ borderColor: 'rgba(255,255,255,0.7)' }}
                                    >
                                        Sair
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        component={RouterLink}
                                        to="/login"
                                        color="inherit"
                                        startIcon={<LoginIcon />}
                                    >
                                        Entrar
                                    </Button>
                                    <Button
                                        component={RouterLink}
                                        to="/cadastro"
                                        variant="contained"
                                        color="secondary"
                                        startIcon={<PersonAddIcon />}
                                    >
                                        Criar Conta
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            <Drawer
                anchor="left"
                open={drawerAberto}
                onClose={() => setDrawerAberto(false)}
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
                    {itensNavegacao.map((item) => {
                        const ativo = location.pathname.startsWith(item.caminho);
                        return (
                            <ListItem key={item.caminho} disablePadding>
                                <ListItemButton
                                    component={RouterLink}
                                    to={item.caminho}
                                    selected={ativo}
                                    onClick={() => setDrawerAberto(false)}
                                    sx={{ minHeight: 52 }}
                                >
                                    <ListItemIcon sx={{ color: ativo ? 'primary.main' : 'inherit' }}>
                                        {item.icone}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.texto}
                                        slotProps={{ primary: { sx: { fontWeight: ativo ? 700 : 500 } } }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {autenticado ? (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            fullWidth
                        >
                            Sair da Conta
                        </Button>
                    ) : (
                        <>
                            <Button
                                component={RouterLink}
                                to="/login"
                                variant="outlined"
                                startIcon={<LoginIcon />}
                                onClick={() => setDrawerAberto(false)}
                                fullWidth
                            >
                                Entrar
                            </Button>
                            <Button
                                component={RouterLink}
                                to="/cadastro"
                                variant="contained"
                                color="secondary"
                                startIcon={<PersonAddIcon />}
                                onClick={() => setDrawerAberto(false)}
                                fullWidth
                            >
                                Criar Conta
                            </Button>
                        </>
                    )}
                </Box>
            </Drawer>

            <Container
                id="conteudo-principal"
                component="main"
                maxWidth="lg"
                sx={{ flexGrow: 1, py: 4 }}
            >
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
                        Plataforma EJA — Educação de Jovens e Adultos: Cursos, Oportunidades de Trabalho e Orientação Acadêmica.
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}