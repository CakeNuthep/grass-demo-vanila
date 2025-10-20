import { DRACOLoader, GLTFLoader } from "three/addons/Addons.js";
import * as THREE from "three";
import Game from "./Game.js";
import { emitter } from "./Emitter.js";
import { gameState } from "./State.js";
// import noiseTexture from "../assets/textures/noise.png";

export default class ResourceLoader {
	constructor() {
		this.game = new Game();

		this.toLoad = 0;
		this.loaded = 0;

		this.gltfLoader = new GLTFLoader();
		this.textureLoader = new THREE.TextureLoader();
		this.audioLoader = new THREE.AudioLoader();
		this.dracoLoader = new DRACOLoader();

		// Use a CDN-hosted Draco decoder to avoid missing local /draco/ files.
		// The Google CDN hosts the decoders including draco_decoder.wasm.
		this.dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
		this.gltfLoader.setDRACOLoader(this.dracoLoader);
		this.loadDefaultAssets();
		this.loadAssets();
	}

	loadDefaultAssets() {
		// Use absolute path from server root to match how assets are served
		this.noiseTexture = this.textureLoader.load("../assets/textures/noise.png");
		this.noiseTexture.wrapS = this.noiseTexture.wrapT = THREE.RepeatWrapping;
	}

	loadAssets() {
		const assets = this.game.world.assets;
		this.toLoad = Object.keys(assets).length;

		//assets is an object with keys as asset names and values as asset urls
		for (const [name, url] of Object.entries(assets)) {
			this.loadAsset({ name, url });
		}
	}

	loadAsset(asset) {
		const fileExtension = asset.url.split(".").pop();
		const name = asset.name;

		if (/glb/.test(fileExtension)) {
			this.gltfLoader.load(asset.url, (gltf) => {
				this.game.world.assets[name] = gltf;
				this.sourceLoaded(name);
			});
		}

		if (/png|jpg|jpeg/.test(fileExtension)) {
			this.textureLoader.load(asset.url, (texture) => {
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
				this.game.world.assets[name] = texture;
				this.sourceLoaded(name);
			});
		}

		if (/mp3|wav/.test(fileExtension)) {
			this.audioLoader.load(asset.url, (buffer) => {
				this.game.world.assets[name] = buffer;
				this.sourceLoaded(name);
			});
		}

		if (/mp4/.test(fileExtension)) {
			const element = this.createVideoElement(asset.url);
			const playPromise = element.play();

			if (playPromise !== undefined) {
				playPromise
					.then((_) => {})
					.catch((error) => {
						console.log("Autoplay rejected", error);
					});
			}
			// Create the video texture
			const texture = new THREE.VideoTexture(element);
			// texture.colorSpace = THREE.LinearSRGBColorSpace;
			texture.generateMipmaps = false;
			texture.magFilter = THREE.NearestFilter;
			this.game.world.assets[name] = texture;

			this.sourceLoaded(name);
		}
	}

	async sourceLoaded(name) {
		this.loaded++;

		emitter.emit("file-loaded", {
			itemsLoaded: this.loaded,
			itemsTotal: this.toLoad,
			item: name,
		});

		if (this.loaded === this.toLoad) {
			await this.game.world.init();

			// When all assets are loaded, initialize the world and start the game
			// by switching the state directly to 'playing'. This makes the game
			// begin immediately without waiting for user input.
			// Keep emitting a level-ready event for compatibility with other code.
			emitter.emit("level-ready");
			gameState.value = "playing";
		}
	}

	createVideoElement(url) {
		const element = document.createElement("video");
		element.src = url;
		element.autoplay = true;
		element.playsInline = true;
		element.muted = true;
		element.loop = true;

		return element;
	}
}
