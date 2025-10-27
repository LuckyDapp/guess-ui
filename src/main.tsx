import * as React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import {ThemeProvider} from '@mui/material/styles';
import {App} from './components/app.tsx';
import theme from './theme';

// Intercepter les erreurs du SDK polkadot-api qui ne bloquent pas le fonctionnement
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
    // Ignorer les erreurs spécifiques du SDK qui n'empêchent pas le fonctionnement
    const errorMessage = args[0]?.toString() || '';
    if (
        errorMessage.includes("can't access property \"length\", value is undefined") ||
        errorMessage.includes("VectorEnc") ||
        errorMessage.includes("TupleEnc") ||
        errorMessage.includes("Runtime entry Storage(Revive.ContractInfoOf) not found")
    ) {
        // Ignorer silencieusement ces erreurs
        return;
    }
    // Afficher les autres erreurs normalement
    originalConsoleError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline/>
            <App/>
        </ThemeProvider>
    </React.StrictMode>,
);
