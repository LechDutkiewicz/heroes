// Cały komplet: kopalnie (obiekty.mjs) + budowle, sad i znajdźki (obiekty2.mjs) + zamki (zamki.mjs); wersje w duchu Pokémon (pokemon.mjs) nadpisują
// średniowieczne odpowiedniki.
import { OBIEKTY as K } from './obiekty.mjs';
import { OBIEKTY2 } from './obiekty2.mjs';
import { ZAMKI } from './zamki.mjs';
import { POKEMON } from './pokemon.mjs';
export const OBIEKTY = { ...K, ...OBIEKTY2, ...ZAMKI, ...POKEMON };
