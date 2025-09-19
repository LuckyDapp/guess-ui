import {createTheme} from '@mui/material/styles';
import {red} from '@mui/material/colors';

// Create a theme instance.
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#d4af37',
        },
        secondary: {
            main: '#b8860b',
        },
        error: {
            main: red.A400,
        },
    },
});

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

export default theme;
