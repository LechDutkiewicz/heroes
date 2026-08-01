# Sprite'y stworków

Tu wrzucamy obrazki stworków, których używa ekran bitwy.

## Jak nazywać pliki

- jeden plik = jeden stworek,
- format **PNG z przezroczystym tłem**,
- nazwa małymi literami, bez polskich znaków i bez spacji,
- nazwa pliku to identyfikator stworka w kodzie, np. `charmander.png`, `ognisty_lis.png`.

Rozmiar nie musi być dokładny — przeskalujemy je w kodzie do wielkości pola
na planszy (72 piksele). Dobrze wyglądają obrazki wysokości 64-128 pikseli.

## Skąd pochodzą

- źródło: Pixmon Index, https://www.novelgens.com/pixmons
- licencja: domena publiczna — wolno używać i modyfikować w dowolnym
  projekcie, płatnym lub darmowym, bez pytania o zgodę i bez podawania autora
- czym są: autorskie stworki wygenerowane modelem AI w stylu pokemonów,
  a nie grafiki z oryginalnych gier

## Jak trafiają do gry

Pliki tutaj to oryginały (256x256, białe tło). Gra ich bezpośrednio nie
wczytuje — najpierw przechodzą przez `tools/process_sprites.py`, który
wycina tło, przycina do stworka i zapisuje gotowe obrazki do
`public/sprites/`.

Po dorzuceniu nowych plików uruchom:

```
python3 tools/process_sprites.py
```
