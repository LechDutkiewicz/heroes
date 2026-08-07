# Skąd jest ten skill

`SKILL.md` obok nie jest naszego autorstwa — leży tu w postaci niezmienionej,
bajt w bajt takiej, jak w źródle.

- **Repozytorium:** https://github.com/robonuggets/gauntlet-loop
- **Wersja:** commit `9b1975a`
- **Licencja:** Creative Commons Attribution 4.0 (CC BY 4.0)
- **Autor spakowania w skill:** robonuggets
- **Autor samej techniki:** Matt Shumer (https://github.com/mshumer), który
  wymyślił „gauntlet loop" i napisał pierwotny prompt przy okazji projektu
  Claude of Duty

Licencja CC BY 4.0 pozwala używać i zmieniać ten materiał, również komercyjnie,
pod warunkiem podania autorstwa — stąd ten plik.

## Co ten skill robi

Zamienia cel w jeden krótki prompt do wklejenia w nową sesję agenta. Prompt
każe agentowi wybrać konkretny wzorzec jakości (np. istniejącą stronę albo
opublikowany tekst), pociąć zadanie na małe kawałki, do każdego przydzielić
osobno wykonawcę i surowego krytyka, a potem porównywać wynik z wzorcem na
ślepo i poprawiać tak długo, aż krytyk wskaże naszą wersję.

Sam z siebie nic nie buduje ani nie uruchamia — pisze prompt.

## Jak wywołać

```
/gauntlet-loop <cel>
```

Skill najpierw zaproponuje dwa albo trzy wzorce jakości do wyboru, a dopiero
po wskazaniu jednego z nich napisze gotowy prompt.

## Aktualizacja

```
git clone https://github.com/robonuggets/gauntlet-loop /tmp/gauntlet-loop
cp /tmp/gauntlet-loop/.claude/skills/gauntlet-loop/SKILL.md .claude/skills/gauntlet-loop/
```
