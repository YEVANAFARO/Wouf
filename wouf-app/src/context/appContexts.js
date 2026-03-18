import { createContext } from 'react';
import { DARK } from '../config/theme';

export const ThemeContext = createContext({ theme: 'dark', colors: DARK, toggle: () => {} });
export const AuthContext = createContext({ user: null, profile: null, refresh: () => {} });
export const DogsContext = createContext({ dogs: [], activeDog: null, setActiveDog: () => {} });
