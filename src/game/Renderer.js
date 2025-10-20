import * as THREE from "three";
import Game from "./Game.js";
import { settings } from "./Settings.js";

export default class Renderer {
	constructor() {
		this.game = new Game();
		this.sizes = this.game.sizes;

		this.setInstance();

		this.setCustomTonemapping();

		if (this.game.debug.active) {
			this.lastDebugUpdateTime = 0;
			this.setDebug();
		}
	}

	setInstance() {
		const gl = this.game.canvas.getContext('webgl2');
		this.instance = new THREE.WebGLRenderer({
			canvas: this.game.canvas,
			powerPreference: "high-performance",
			antialias: true,
			stencil: false,
			depth: true, 
			context: gl,
		});

		this.instance.xr.enabled = true;
		this.instance.xr.setReferenceSpaceType("local");
		this.instance.outputColorSpace = THREE.LinearSRGBColorSpace;
		this.instance.toneMapping = THREE.NoToneMapping;
		this.instance.toneMappingExposure = 1;
		this.instance.shadowMap.enabled = false;
		this.instance.clippingPlanes = [];
		this.instance.info.autoReset = false;
	}

	resize() {
		this.instance.setSize(this.sizes.width, this.sizes.height);
		this.instance.setPixelRatio(Math.min(this.sizes.pixelRatio, 2));
	}

	setDebug() {
		this.panel = document.createElement("div");
		this.game.debug.panel.appendChild(this.panel);
		// this.instance.info.autoReset = false;

		const folder = this.game.debug.ui.addFolder("Renderer");
		folder
			.add(this.instance, "toneMapping", {
				No: THREE.NoToneMapping,
				Linear: THREE.LinearToneMapping,
				Reinhard: THREE.ReinhardToneMapping,
				Cineon: THREE.CineonToneMapping,
				ACESFilmic: THREE.ACESFilmicToneMapping,
				AgX: THREE.AgXToneMapping,
				Neutral: THREE.NeutralToneMapping,
				Custom: THREE.CustomToneMapping,
			})
			.name("Tone mapping");
		folder
			.add(this.instance, "toneMappingExposure", 0, 2, 0.01)
			.name("Exposure");
		folder.add(this.instance.shadowMap, "enabled").name("Shadows");
		//shadow type
		folder
			.add(this.instance.shadowMap, "type", {
				BasicShadowMap: THREE.BasicShadowMap,
				PCFShadowMap: THREE.PCFShadowMap,
				PCFSoftShadowMap: THREE.PCFSoftShadowMap,
			})
			.name("Shadow Type");
		folder.close();
	}

	printDebug() {
		if (!this.game.debug.active) return;

		const infos = {
			fps: this.game.time.fps,
			// memory: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
			drawcalls: this.instance.info.render.calls,
			triangles: this.instance.info.render.triangles.toLocaleString(),
			points: this.instance.info.render.points.toLocaleString(),
			lines: this.instance.info.render.lines.toLocaleString(),
			geometries: this.instance.info.memory.geometries,
			textures: this.instance.info.memory.textures,
		};

		this.panel.innerHTML = "";

		for (const key in infos) {
			const value = infos[key];
			const div = document.createElement("span");
			div.innerHTML = `${key}: ${value}&nbsp;&nbsp;`;
			this.panel.appendChild(div);
		}
	}

	tick() {
		const currentTime = Date.now();
		if (currentTime - this.lastDebugUpdateTime >= 500) {
			// Check if 500 ms have passed
			this.printDebug();
			this.lastDebugUpdateTime = currentTime; // Update the last update time
		}
	}

	setCustomTonemapping() {
		THREE.ShaderChunk.tonemapping_pars_fragment =
			THREE.ShaderChunk.tonemapping_pars_fragment.replace(
				"vec3 CustomToneMapping( vec3 color ) { return color; }",

				/*glsl*/ `
					vec3 CustomToneMapping(vec3 color) {

						color *= toneMappingExposure;
						const float contrast = 2.5;
						color = (color - 0.5) * contrast + 0.5;

						return color;
						}
`
			);
	}

	adjustTonemappingContrast(contrast) {
		//convert contrast to a float
		contrast = contrast.toFixed(1);

		let fragment = THREE.ShaderChunk.tonemapping_pars_fragment;

		// Regular expression to find the line containing "const float contrast"
		// This matches the line starting with any amount of whitespace, followed by "const float contrast",
		// and then anything until the end of the line.
		const regex = /^\s*const float contrast.*$/m;

		// Check if the fragment contains the string "const float contrast"
		const hasContrast = regex.test(fragment);

		// If it does, replace that line with "const float contrast = {contrast};"
		if (hasContrast) {
			fragment = fragment.replace(regex, `const float contrast = ${contrast};`);
			THREE.ShaderChunk.tonemapping_pars_fragment = fragment;
		}
	}
}
