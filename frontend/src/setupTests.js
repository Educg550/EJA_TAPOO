// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// O React Router usa TextEncoder, ausente no jsdom do Jest.
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

// O jsdom não implementa rolagem; a paginação rola para o topo ao trocar de página.
window.scrollTo = () => {};
