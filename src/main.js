import Game from "./game/Game.js";
import { emitter } from "./game/Emitter.js";

async function start() {
	try {
		const game = new Game();
		// allow async init tasks inside Game.init if any
		if (typeof game.init === "function") {
			await game.init();
		}
		// expose for debugging
		window.game = game;
		return game;
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error("Failed to start game:", err);
		throw err;
	}
}

start();
