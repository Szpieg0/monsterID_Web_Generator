# monsterID

Prywatny generator MonsterID pod GitHub Pages, oparty na oryginalnym projekcie [splitbrain/monsterID](https://github.com/splitbrain/monsterID).

## Co zawiera repozytorium

- statyczną stronę (`index.html`, `style.css`, `script.js`) z jednym głównym przyciskiem generującym dokładnie jednego MonsterID,
- zasoby graficzne MonsterID w katalogu `parts/`,
- workflow GitHub Actions publikujący stronę przez GitHub Pages (`.github/workflows/pages.yml`).

## Uruchomienie lokalne

To jest strona statyczna, więc możesz uruchomić ją lokalnie bez PHP:

```bash
python3 -m http.server 8000
```

Następnie otwórz `http://localhost:8000`.

## Publikacja GitHub Pages

1. Upewnij się, że workflow `Deploy GitHub Pages` jest włączony.
2. W ustawieniach repozytorium wejdź w **Settings → Pages** i wybierz źródło **GitHub Actions**.
3. Po pushu na gałąź `main` workflow opublikuje aktualną zawartość repozytorium jako stronę Pages.

> Uwaga: repozytorium jest prywatne, więc dostępność GitHub Pages zależy od planu konta i ustawień organizacji/repozytorium GitHub.

## Licencja i autorstwo

- Kod i grafiki MonsterID pochodzą z projektu [splitbrain/monsterID](https://github.com/splitbrain/monsterID).
- Oryginalne grafiki przygotował Andreas Gohr.
- Całość jest udostępniona na licencji MIT (zobacz plik `LICENSE`).
