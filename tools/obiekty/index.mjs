// Cały komplet: kopalnie (obiekty.mjs) + budowle, sad i znajdźki (obiekty2.mjs) + zamki (zamki.mjs).
import { OBIEKTY as K } from './obiekty.mjs';
import { OBIEKTY2 } from './obiekty2.mjs';
import { ZAMKI } from './zamki.mjs';
export const OBIEKTY = { ...K, ...OBIEKTY2, ...ZAMKI };
