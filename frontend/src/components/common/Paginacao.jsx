import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';

export const PAGINAS_POR_GRUPO = 5;

// Paginação em blocos: mostra as páginas do grupo atual (1–5, 6–10, ...) e permite andar
// uma página ou um grupo inteiro. `pagina` começa em 0; os números exibidos começam em 1.
export default function Paginacao({ pagina, totalPaginas, onMudar, desabilitada = false, rotulo = 'Paginação' }) {
    if (totalPaginas <= 1) {
        return null;
    }

    const inicioGrupo = Math.floor(pagina / PAGINAS_POR_GRUPO) * PAGINAS_POR_GRUPO;
    const fimGrupo = Math.min(inicioGrupo + PAGINAS_POR_GRUPO, totalPaginas);
    const paginasDoGrupo = Array.from({ length: fimGrupo - inicioGrupo }, (_, i) => inicioGrupo + i);
    const temGrupoAnterior = inicioGrupo > 0;
    const temProximoGrupo = fimGrupo < totalPaginas;

    const botaoIcone = (texto, Icone, destino, habilitado) => (
        <Tooltip title={texto}>
            {/* span mantém o tooltip funcionando com o botão desabilitado */}
            <span>
                <IconButton
                    aria-label={texto}
                    onClick={() => onMudar(destino)}
                    disabled={desabilitada || !habilitado}
                    size="large"
                >
                    <Icone />
                </IconButton>
            </span>
        </Tooltip>
    );

    return (
        <Box
            component="nav"
            aria-label={rotulo}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mt: 4 }}
        >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                {botaoIcone(
                    `${PAGINAS_POR_GRUPO} páginas anteriores`,
                    KeyboardDoubleArrowLeftIcon,
                    inicioGrupo - PAGINAS_POR_GRUPO,
                    temGrupoAnterior,
                )}
                {botaoIcone('Página anterior', ChevronLeftIcon, pagina - 1, pagina > 0)}

                {paginasDoGrupo.map((numero) => {
                    const atual = numero === pagina;
                    return (
                        <Button
                            key={numero}
                            variant={atual ? 'contained' : 'outlined'}
                            aria-current={atual ? 'page' : undefined}
                            aria-label={atual ? `Página ${numero + 1}, página atual` : `Ir para a página ${numero + 1}`}
                            onClick={() => onMudar(numero)}
                            disabled={desabilitada && !atual}
                            sx={{ minWidth: 48 }}
                        >
                            {numero + 1}
                        </Button>
                    );
                })}

                {botaoIcone('Próxima página', ChevronRightIcon, pagina + 1, pagina < totalPaginas - 1)}
                {botaoIcone(
                    `${PAGINAS_POR_GRUPO} próximas páginas`,
                    KeyboardDoubleArrowRightIcon,
                    fimGrupo,
                    temProximoGrupo,
                )}
            </Box>
            <Typography variant="body2" color="text.secondary">
                Página {pagina + 1} de {totalPaginas}
            </Typography>
        </Box>
    );
}
