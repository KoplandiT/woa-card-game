# Armored Generals

React + TypeScript + Vite alapú, frontend-only hot-seat kártyajáték prototípus. A játék saját névvel, saját frakciókkal és saját kártyákkal dolgozik, de a műfajból ismerős körökre osztott, erőforrásos, egység- és parancskártyás harcot használ.

## Futtatás

```powershell
npm install
npm run dev
```

## Fontosabb fájlok

- `src/App.tsx`: a fő konténerkomponens. Itt él a `useState`, vagyis a teljes játékállapot frontend oldalon van.
- `src/game/gameLogic.ts`: a szabálylogika. Itt történik a játék indítása, lap kijátszása, egység kijelölése, támadás, sebzés, körváltás és győzelemvizsgálat.
- `src/data/cards.ts`: mock kártyaadatok és frakciónevek. Azért külön fájl, hogy később könnyen lehessen új lapokat felvenni UI-módosítás nélkül.
- `src/components/StartScreen.tsx`: kezdőképernyő.
- `src/components/PlayerPanel.tsx`: játékosok HQ/CP/deck állapota.
- `src/components/Board.tsx`: a soros/lane-es csatatér, egységkijelölés és támadási célpontok.
- `src/components/Hand.tsx` és `src/components/CardView.tsx`: a kézben lévő lapok listája és egyetlen kártya megjelenítése.
- `src/components/GameLog.tsx`: rövid csatanapló, hogy követhető legyen, mi történt.

Ez a bontás azért hasznos React-tanuláshoz, mert az `App` tartja össze az állapotot, a komponensek pedig többnyire csak megjelenítenek és eseményeket jeleznek vissza. Így jól látszik a React egyik alapmintája: adat lefelé megy propsként, esemény felfelé callbackként.
