// Csak a megsemmisulesi effekt altal hasznalt Pixi exportokat tolti be.
// Ugyanez a Promise hasznalhato elotoltesre es a renderer inicializalasara is.
export async function loadPixiRuntime() {
  const { Application, Assets, Container, Graphics, Sprite } = await import('pixi.js');
  return { Application, Assets, Container, Graphics, Sprite };
}
