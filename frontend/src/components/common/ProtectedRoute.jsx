import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Container, Alert, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const { autenticado, carregandoSessao, possuiPapel } = useAuth();
    const location = useLocation();

    if (carregandoSessao) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    gap: 2,
                }}
                role="status"
                aria-live="polite"
            >
                <CircularProgress size={48} />
                <Typography variant="h6">Verificando sua sessão...</Typography>
            </Box>
        );
    }

    if (!autenticado) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !possuiPapel(allowedRoles)) {
        return (
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Alert severity="error" sx={{ mb: 3, fontSize: '1.05rem' }}>
                    Seu perfil de usuário não possui permissão para acessar esta página.
                </Alert>
                <Button component={RouterLink} to="/cursos" variant="contained">
                    Voltar para a página inicial
                </Button>
            </Container>
        );
    }

    return children;
}