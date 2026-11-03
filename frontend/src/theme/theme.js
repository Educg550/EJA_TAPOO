import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#0D47A1',      // Azul escuro de alto contraste (WCAG AAA sobre branco)
            light: '#1976D2',
            dark: '#002171',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#1B5E20',      // Verde escuro para ações secundárias/positivas
            light: '#4C8C4A',
            dark: '#003300',
            contrastText: '#FFFFFF',
        },
        error: {
            main: '#B71C1C',      // Vermelho de alto contraste para erros e cancelamentos
        },
        warning: {
            main: '#E65100',      // Laranja escuro legível para estados pendentes
        },
        success: {
            main: '#1B5E20',
        },
        background: {
            default: '#F8F9FA',   // Fundo levemente acinzentado para evitar brilho excessivo
            paper: '#FFFFFF',
        },
        text: {
            primary: '#121212',   // Quase preto para máxima nitidez
            secondary: '#374151', // Cinza escuro (contraste > 7:1 no fundo branco)
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        fontSize: 16,
        h1: {
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.3,
        },
        h2: {
            fontSize: '1.85rem',
            fontWeight: 700,
            lineHeight: 1.35,
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        body1: {
            fontSize: '1.0625rem', // ~17px para leitura confortável de descrições e cards
            lineHeight: 1.6,
        },
        body2: {
            fontSize: '0.95rem',
            lineHeight: 1.5,
        },
        button: {
            fontSize: '1rem',
            fontWeight: 600,
            textTransform: 'none', // Evita CAIXA ALTA, melhorando a legibilidade para EJA
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                '*:focus-visible': {
                    outline: '3px solid #FF8F00 !important', // Anel de foco visível para navegação via teclado
                    outlineOffset: '2px',
                },
            },
        },
        MuiButton: {
            defaultProps: {
                disableElevation: false,
            },
            styleOverrides: {
                root: {
                    minHeight: 48, // Área de toque acessível (padrão WCAG 2.5.5)
                    padding: '10px 20px',
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
                fullWidth: true,
                slotProps: {
                    inputLabel: {
                        shrink: true, // Mantém o rótulo sempre visível acima do campo
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: '#FFFFFF',
                    '& fieldset': {
                        borderWidth: '1.5px',
                        borderColor: '#6B7280',
                    },
                },
            },
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: '0.9rem',
                    marginTop: 6,
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    minHeight: 34,
                },
            },
        },
    },
});

export default theme;