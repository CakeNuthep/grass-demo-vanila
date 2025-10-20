import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import Game from "../Game.js";
import * as THREE from "three";
// import vertexShader from "../shaders/grass/vertex.glsl";
// import fragmentShader from "../shaders/grass/fragment.glsl";
import { settings } from "../Settings.js";
const vertexShader = `
attribute vec3 aYaw;
attribute vec3 aBladeOrigin;

varying vec3 vColor;

uniform float uTime;
uniform vec3 uPlayerPosition;
uniform sampler2D uHeightMap;
uniform sampler2D uDiffuseMap;
uniform sampler2D uNoiseTexture;
uniform vec3 uBoundingBoxMin;
uniform vec3 uBoundingBoxMax;
uniform float uPatchSize;
uniform float uBladeWidth;
uniform float uWindDirection;
uniform float uWindSpeed;
uniform float uWindNoiseScale;
uniform float uWindNoiseContrast;
uniform float uWindInfluence;
uniform float uBaldPatchModifier;
uniform float uFalloffSharpness;
uniform float uHeightNoiseFrequency;
uniform float uHeightNoiseAmplitude;
uniform float uMaxBendAngle;
uniform float uMaxBladeHeight;
uniform float uRandomHeightAmount;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Helper Functions
mat3 rotate3d(in vec3 axis, const in float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
    );
}

float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return mix(outMin, outMax, (value - inMin) / (inMax - inMin));
}

void main() {
    // Initial blade position
    vec3 transformed = position;
    vec3 origin = aBladeOrigin;

    // Wrap origin within patch bounds relative to player
    float halfPatchSize = uPatchSize * 0.5;
    origin.x = mod(origin.x - uPlayerPosition.x + halfPatchSize, uPatchSize) - halfPatchSize;
    origin.z = mod(origin.z - uPlayerPosition.z + halfPatchSize, uPatchSize) - halfPatchSize;

    vec3 worldPos = uPlayerPosition + origin;

    transformed.x = origin.x;
    transformed.z = origin.z;

    // Map to height map UVs
    vec2 uv = vec2(
        map(uPlayerPosition.x + origin.x, uBoundingBoxMin.x, uBoundingBoxMax.x, 0.0, 1.0),
        map(uPlayerPosition.z + origin.z, uBoundingBoxMin.z, uBoundingBoxMax.z, 0.0, 1.0)
    );

    // Height map sampling
    vec2 texSize = vec2(textureSize(uHeightMap, 0)); 
    vec2 uvTexel = uv * texSize - 0.5;
    vec2 uvFloor = floor(uvTexel) / texSize;
    vec2 uvCeil = ceil(uvTexel) / texSize;
    vec2 uvFrac = fract(uvTexel);

    vec3 h00 = texture2D(uHeightMap, uvFloor).rgb;
    vec3 h10 = texture2D(uHeightMap, vec2(uvCeil.x, uvFloor.y)).rgb;
    vec3 h01 = texture2D(uHeightMap, vec2(uvFloor.x, uvCeil.y)).rgb;
    vec3 h11 = texture2D(uHeightMap, uvCeil).rgb;

    vec3 heightMapColor = mix(mix(h00, h10, uvFrac.x), mix(h01, h11, uvFrac.x), uvFrac.y);

    float terrainHeight = heightMapColor.x;
    float displacement = map(terrainHeight, 0.0, 1.0, uBoundingBoxMin.y, uBoundingBoxMax.y);
    transformed.y += displacement - uPlayerPosition.y;

    // Height variation using noise and randomness
    vec3 heightNoise = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency)).rgb;
    float heightModifier = ((heightNoise.r + heightNoise.g + heightNoise.b) * uMaxBladeHeight) * uHeightNoiseAmplitude;
    heightModifier += random(uv) * (uRandomHeightAmount * 0.1);

    // Edge falloff calculation
    float edgeDistanceX = abs(origin.x) / halfPatchSize;
    float edgeDistanceZ = abs(origin.z) / halfPatchSize;
    float edgeFactor = 1.0 - max(edgeDistanceX, edgeDistanceZ);
    edgeFactor = pow(edgeFactor, uFalloffSharpness);

    // Random bald patches
    float baldPatchOffset = heightNoise.r * (uBaldPatchModifier * (1.0 - edgeFactor));
    heightModifier -= baldPatchOffset;

    // Edge fade for bounding box limits
    float edgeFade = 
        smoothstep(uBoundingBoxMin.x, uBoundingBoxMin.x + 2.0, worldPos.x) *
        smoothstep(uBoundingBoxMax.x, uBoundingBoxMax.x - 2.0, worldPos.x) *
        smoothstep(uBoundingBoxMin.z, uBoundingBoxMin.z + 2.0, worldPos.z) *
        smoothstep(uBoundingBoxMax.z, uBoundingBoxMax.z - 2.0, worldPos.z);

    heightModifier *= edgeFade;

    // Width adjustment
    float factor = (color.r == 0.1) ? 1.0 : (color.b == 0.1) ? -1.0 : 0.0;
    float width = smoothstep(0.5, 1.0, heightModifier * 2.0) * uBladeWidth;
    transformed += aYaw * (width / 2.0) * factor;

    // Color sampling and noise modulation
    vColor = texture2D(uDiffuseMap, uv * 10.0).rgb * color;
    vec3 colorNoise = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency) + (uTime * 0.1)).rgb;
    vColor *= colorNoise;

    // Inner circle reduction factor
    float distanceFromCenter = length(origin.xz) / halfPatchSize;
    float innerCircleFactor = clamp(smoothstep(0.0, 0.5, distanceFromCenter), 0.0, 1.0);
    heightModifier *= mix(0.25, 1.0, innerCircleFactor);

    // Wind effect using noise texture
    float noiseScale = uWindNoiseScale * 0.1;
    vec2 noiseUV = vec2(origin.x * noiseScale, origin.z * noiseScale);

    mat2 rotation = mat2(
        cos(uWindDirection), -sin(uWindDirection),
        sin(uWindDirection), cos(uWindDirection)
    );
    vec2 rotatedNoiseUV = rotation * noiseUV + uTime * vec2(uWindSpeed);

    vec3 windNoise = texture2D(uNoiseTexture, rotatedNoiseUV).rgb;

    vec3 axis = vec3(windNoise.g, 0.0, windNoise.b);
    float angle = radians(map(windNoise.g + windNoise.b, 0.0, 2.0, -uMaxBendAngle, uMaxBendAngle)) * color.g;
    mat3 rotationMatrix = rotate3d(axis, angle);

    vec3 basePosition = vec3(transformed.x, transformed.y - heightModifier, transformed.z);
    vec3 relativePosition = transformed - basePosition;
    relativePosition = rotationMatrix * relativePosition;
    transformed = basePosition + relativePosition;

    transformed.y += heightModifier * color.g;

    // Final position transformation
    vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
}

`;
const fragmentShader = `
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

export default class GhibliGrass {
	constructor(landscapeMesh) {
		this.game = new Game();
		this.landscapeMesh = landscapeMesh;
		this.sampler = new MeshSurfaceSampler(landscapeMesh).build();
		this.center = new THREE.Vector3();

		this.settings = {
			count: settings.vr ? 160000 : 200000,
			bladeHeight: 0.005,
			bladeWidth: 0.08,
			material: THREE.MeshBasicMaterial,
			patchSize: 20,
		};

		this.rowCount = Math.floor(Math.sqrt(this.settings.count));

		this.landscapeMesh.geometry.computeBoundingBox();
		this.landscapeMesh.geometry.boundingBox.getCenter(this.center);

		this.buildGrass();

		this.game.world.updatables.push(this);

		this.setDebug();
	}

	buildGrass() {
		const positions = [];
		const colors = [];
		const uvs = [];
		const indices = [];
		const bladeOrigins = [];
		const yaws = [];
		const currentPosition = new THREE.Vector3();
		const uv = new THREE.Vector2();
		const yawUnitVec = new THREE.Vector3();

		for (let i = 0; i < this.settings.count; i++) {
			currentPosition.x = THREE.MathUtils.randFloat(
				-this.settings.patchSize * 0.5,
				this.settings.patchSize * 0.5
			);

			currentPosition.z = THREE.MathUtils.randFloat(
				-this.settings.patchSize * 0.5,
				this.settings.patchSize * 0.5
			);

			uv.set(
				THREE.MathUtils.mapLinear(
					currentPosition.x,
					this.landscapeMesh.geometry.boundingBox.min.x,
					this.landscapeMesh.geometry.boundingBox.max.x,
					0,
					1
				),
				THREE.MathUtils.mapLinear(
					currentPosition.z,
					this.landscapeMesh.geometry.boundingBox.min.z,
					this.landscapeMesh.geometry.boundingBox.max.z,
					0,
					1
				)
			);

			const yaw = Math.random() * Math.PI * 2;
			yawUnitVec.set(Math.sin(yaw), 0, -Math.cos(yaw));

			const bl = currentPosition;
			const br = currentPosition;
			const tc = currentPosition;

			const verts = [
				{ pos: bl.toArray(), color: [0.1, 0, 0] },
				{ pos: br.toArray(), color: [0, 0, 0.1] },
				{ pos: tc.toArray(), color: [1, 1, 1] },
			];

			const vertexCount = verts.length;

			const vArrOffset = i * vertexCount;

			verts.forEach((vert, index) => {
				positions.push(...vert.pos);
				colors.push(...vert.color);
				uvs.push(...uv.toArray());
				yaws.push(...yawUnitVec);
				bladeOrigins.push(...currentPosition.toArray());
			});

			// Add indices
			indices.push(vArrOffset, vArrOffset + 1, vArrOffset + 2);
		}

		const geometry = new THREE.BufferGeometry();

		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(positions), 3)
		);

		geometry.setAttribute(
			"color",
			new THREE.BufferAttribute(new Float32Array(colors), 3)
		);

		geometry.setAttribute(
			"uv",
			new THREE.BufferAttribute(new Float32Array(uvs), 2)
		);

		geometry.setAttribute(
			"aYaw",
			new THREE.BufferAttribute(new Float32Array(yaws), 3)
		);

		geometry.setAttribute(
			"aBladeOrigin",
			new THREE.BufferAttribute(new Float32Array(bladeOrigins), 3)
		);

		// geometry.setIndex(indices);
		geometry.computeVertexNormals();

		const material = this.setMaterial();

		this.mesh = new THREE.Mesh(geometry, material);

		this.game.player.instance.add(this.mesh);

		this.mesh.frustumCulled = false;
	}

	setMaterial() {
		const material = new THREE.ShaderMaterial({
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			vertexColors: true,
			side: THREE.DoubleSide,
			uniforms: {
				uTime: { value: 0 },
				uNoiseTexture: { value: this.game.resourceLoader.noiseTexture },
				uDiffuseMap: { value: this.game.world.assets.grassTexture },
				uPlayerPosition: { value: new THREE.Vector3() },
				uHeightMap: { value: this.game.world.assets.heightMap },
				uBoundingBoxMin: { value: this.landscapeMesh.geometry.boundingBox.min },
				uBoundingBoxMax: { value: this.landscapeMesh.geometry.boundingBox.max },
				uPatchSize: { value: this.settings.patchSize },
				uBladeWidth: { value: this.settings.bladeWidth },
				uWindDirection: { value: Math.PI * 0.25 },
				uWindSpeed: { value: 0.3 },
				uWindNoiseScale: { value: 0.9 },
				uBaldPatchModifier: { value: 2.5 },
				uFalloffSharpness: { value: 0.35 },
				uHeightNoiseFrequency: { value: 12 },
				uHeightNoiseAmplitude: { value: 3 },
				uMaxBendAngle: { value: 22 },
				uMaxBladeHeight: { value: 0.35 },
				uRandomHeightAmount: { value: 0.25 },
			},
		});

		return material;
	}

	tick() {
		this.mesh.material.uniforms.uTime.value = this.game.time.elapsed;
		this.mesh.material.uniforms.uPlayerPosition.value.copy(
			this.game.player.instance.position
		);
	}

	setDebug() {
		const folder = this.game.debug.ui.addFolder("Ghibli Grass");
		folder
			.add(
				this.mesh.material.uniforms.uWindDirection,
				"value",
				-Math.PI,
				Math.PI
			)
			.name("Wind Direction");
		folder
			.add(this.mesh.material.uniforms.uWindSpeed, "value", 0, 3)
			.name("Wind Speed");
		folder
			.add(this.mesh.material.uniforms.uWindNoiseScale, "value", 0, 10)
			.name("Wind Noise Scale");
		folder
			.add(this.mesh.material.uniforms.uBaldPatchModifier, "value", -5, 5)
			.name("Bald Patch Modifier");
		folder
			.add(this.mesh.material.uniforms.uFalloffSharpness, "value", -1, 1)
			.name("Falloff Sharpness");
		folder
			.add(this.mesh.material.uniforms.uHeightNoiseFrequency, "value", 0, 100)
			.name("Height Noise Frequency");
		folder
			.add(this.mesh.material.uniforms.uHeightNoiseAmplitude, "value", 0, 10)
			.name("Height Noise Amplitude");
		folder
			.add(this.mesh.material.uniforms.uMaxBendAngle, "value", 0, 90)
			.name("Max Bend Angle");
		folder
			.add(this.mesh.material.uniforms.uBladeWidth, "value", 0, 1)
			.name("Blade Width");
		folder
			.add(this.mesh.material.uniforms.uMaxBladeHeight, "value", 0, 1)
			.name("Max Blade Height");
		folder
			.add(this.mesh.material.uniforms.uRandomHeightAmount, "value", 0, 10)
			.name("Random Height Amount");

		folder.close();
	}
}
