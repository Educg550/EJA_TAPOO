import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Paper, Typography } from '@mui/material';
import theme from './theme/theme';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

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

              <Route
                path="/cursos"
                element={
                  <PlaceholderPage
                    titulo="Catálogo de Cursos Externos"
                    descricao="Consulta pública de cursos abertos com busca por título e paginação (GET /cursos)."
                  />
                }
              />
              <Route
                path="/vagas"
                element={
                  <PlaceholderPage
                    titulo="Vagas de Trabalho"
                    descricao="Consulta pública de oportunidades com filtros de UF/Município (IBGE), área e escolaridade (GET /vagas)."
                  />
                }
              />
              <Route
                path="/login"
                element={
                  <PlaceholderPage
                    titulo="Entrar na Plataforma"
                    descricao="Autenticação por e-mail e senha (POST /auth/login)."
                  />
                }
              />
              <Route
                path="/cadastro"
                element={
                  <PlaceholderPage
                    titulo="Criar Conta"
                    descricao="Cadastro público de Estudante da EJA ou Licenciando (POST /auth/cadastro)."
                  />
                }
              />

              <Route
                path="/licenciandos"
                element={
                  <ProtectedRoute allowedRoles={['estudante']}>
                    <PlaceholderPage
                      titulo="Orientadores Acadêmicos (Licenciandos)"
                      descricao="Listagem de licenciandos e envio de solicitação de apoio (GET /licenciandos e POST /solicitacoes)."
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/solicitacoes"
                element={
                  <ProtectedRoute allowedRoles={['estudante', 'licenciando']}>
                    <PlaceholderPage
                      titulo="Minhas Solicitações de Apoio"
                      descricao="Acompanhamento de solicitações, aceite/recusa/cancelamento e exibição de e-mails após aceite (GET /solicitacoes e GET /solicitacoes/{id}/contatos)."
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/meu-perfil"
                element={
                  <ProtectedRoute allowedRoles={['licenciando']}>
                    <PlaceholderPage
                      titulo="Meu Perfil de Licenciando"
                      descricao="Atualização de disciplinas de atuação e disponibilidade de horários (PUT /licenciandos/me)."
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/vagas"
                element={
                  <ProtectedRoute allowedRoles={['administrador', 'admin']}>
                    <PlaceholderPage
                      titulo="Gestão Administrativa de Vagas"
                      descricao="Listagem completa incluindo vagas encerradas/vencidas, cadastro, edição e encerramento (GET /admin/vagas, POST/PUT/DELETE /vagas)."
                    />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/cursos" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}