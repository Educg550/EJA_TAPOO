import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Paper, Typography } from '@mui/material';
import theme from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import rotas from './routes';

function PlaceholderPage({ titulo, descricao }) {
  return (
    <Paper elevation={1} sx={{ p: 4 }}>
      <Typography variant="h2" gutterBottom>
        {titulo}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {descricao}
      </Typography>
    </Paper>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/cursos" replace />} />

              {rotas.map(({ caminho, papeis, componente: Componente, titulo, descricao }) => {
                const pagina = Componente ? <Componente /> : <PlaceholderPage titulo={titulo} descricao={descricao} />;
                return (
                  <Route
                    key={caminho}
                    path={caminho}
                    element={papeis ? <ProtectedRoute allowedRoles={papeis}>{pagina}</ProtectedRoute> : pagina}
                  />
                );
              })}

              <Route path="*" element={<Navigate to="/cursos" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
