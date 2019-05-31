/**
 * @author arodic / https://github.com/arodic
 */

const DoubleSide = 2;

// core
// import { EventDispatcher } from 'three/src/core/EventDispatcher';
import { Object3D } from 'three/src/core/Object3D';
import { Float32BufferAttribute } from 'three/src/core/BufferAttribute';
import { Raycaster } from 'three/src/core/Raycaster';

// math
// import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Quaternion } from 'three/src/math/Quaternion';
// import { Spherical } from 'three/src/math/Spherical';
import { Euler } from 'three/src/math/Euler';
import { Color } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';

// geometries
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { PlaneBufferGeometry } from 'three/src/geometries/PlaneGeometry';
// import { BoxBufferGeometry } from 'three/src/geometries/BoxGeometry';
import { CylinderBufferGeometry } from 'three/src/geometries/CylinderGeometry';
import { OctahedronBufferGeometry } from 'three/src/geometries/OctahedronGeometry';

// materials
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial';
import { LineBasicMaterial } from 'three/src/materials/LineBasicMaterial';

// objects
import { Mesh } from 'three/src/objects/Mesh';
import { Line } from 'three/src/objects/Line';

// other
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';

const originalOpacity = new WeakMap();
const originalColor = new WeakMap();

function TransformControlsGizmo() {

	Object3D.call(this);

	this.type = 'TransformControlsGizmo';

	// shared materials

	const gizmoMaterial = new MeshBasicMaterial({
		depthTest: false,
		depthWrite: false,
		transparent: true,
		side: DoubleSide,
		fog: false
	});

	const gizmoLineMaterial = new LineBasicMaterial({
		depthTest: false,
		depthWrite: false,
		transparent: true,
		linewidth: 1,
		fog: false
	});

	// Make unique material for each axis/color

	const matInvisible = gizmoMaterial.clone();
	matInvisible.opacity = 0.15;

	const matHelper = gizmoMaterial.clone();
	matHelper.opacity = 0.33;

	const matRed = gizmoMaterial.clone();
	matRed.color.set(0xff0000);

	const matGreen = gizmoMaterial.clone();
	matGreen.color.set(0x00ff00);

	const matBlue = gizmoMaterial.clone();
	matBlue.color.set(0x0000ff);

	const matWhiteTransperent = gizmoMaterial.clone();
	matWhiteTransperent.opacity = 0.25;

	const matYellowTransparent = matWhiteTransperent.clone();
	matYellowTransparent.color.set(0xffff00);

	const matCyanTransparent = matWhiteTransperent.clone();
	matCyanTransparent.color.set(0x00ffff);

	const matMagentaTransparent = matWhiteTransperent.clone();
	matMagentaTransparent.color.set(0xff00ff);

	const matYellow = gizmoMaterial.clone();
	matYellow.color.set(0xffff00);

	const matLineRed = gizmoLineMaterial.clone();
	matLineRed.color.set(0xff0000);

	const matLineGreen = gizmoLineMaterial.clone();
	matLineGreen.color.set(0x00ff00);

	const matLineBlue = gizmoLineMaterial.clone();
	matLineBlue.color.set(0x0000ff);

	const matLineCyan = gizmoLineMaterial.clone();
	matLineCyan.color.set(0x00ffff);

	const matLineMagenta = gizmoLineMaterial.clone();
	matLineMagenta.color.set(0xff00ff);

	const matLineYellow = gizmoLineMaterial.clone();
	matLineYellow.color.set(0xffff00);

	const matLineGray = gizmoLineMaterial.clone();
	matLineGray.color.set(0x787878);

	const matLineYellowTransparent = matLineYellow.clone();
	matLineYellowTransparent.opacity = 0.25;

	// reusable geometry

	const arrowGeometry = new CylinderBufferGeometry(0, 0.05, 0.2, 12, 1, false);

	const lineGeometry = new BufferGeometry();
	lineGeometry.addAttribute('position', new Float32BufferAttribute([0, 0, 0,	1, 0, 0], 3));


	// Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position

	const translateHelperGeometry = function () {

		const geometry = new BufferGeometry();

		geometry.addAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));

		return geometry;

	};

	// Gizmo definitions - custom hierarchy definitions for setupGizmo() function

	const gizmoTranslate = {
		X: [
			[new Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, -Math.PI / 2], null, 'fwd'],
			[new Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, Math.PI / 2], null, 'bwd'],
			[new Line(lineGeometry, matLineRed)]
		],
		Y: [
			[new Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, 'fwd'],
			[new Mesh(arrowGeometry, matGreen), [0, 1, 0], [Math.PI, 0, 0], null, 'bwd'],
			[new Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]]
		],
		Z: [
			[new Mesh(arrowGeometry, matBlue), [0, 0, 1], [Math.PI / 2, 0, 0], null, 'fwd'],
			[new Mesh(arrowGeometry, matBlue), [0, 0, 1], [-Math.PI / 2, 0, 0], null, 'bwd'],
			[new Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0]]
		],
		XYZ: [
			[new Mesh(new OctahedronBufferGeometry(0.1, 0), matWhiteTransperent), [0, 0, 0], [0, 0, 0]]
		],
		XY: [
			[new Mesh(new PlaneBufferGeometry(0.295, 0.295), matYellowTransparent), [0.15, 0.15, 0]],
			[new Line(lineGeometry, matLineYellow), [0.18, 0.3, 0], null, [0.125, 1, 1]],
			[new Line(lineGeometry, matLineYellow), [0.3, 0.18, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]
		],
		YZ: [
			[new Mesh(new PlaneBufferGeometry(0.295, 0.295), matCyanTransparent), [0, 0.15, 0.15], [0, Math.PI / 2, 0]],
			[new Line(lineGeometry, matLineCyan), [0, 0.18, 0.3], [0, 0, Math.PI / 2], [0.125, 1, 1]],
			[new Line(lineGeometry, matLineCyan), [0, 0.3, 0.18], [0, -Math.PI / 2, 0], [0.125, 1, 1]]
		],
		XZ: [
			[new Mesh(new PlaneBufferGeometry(0.295, 0.295), matMagentaTransparent), [0.15, 0, 0.15], [-Math.PI / 2, 0, 0]],
			[new Line(lineGeometry, matLineMagenta), [0.18, 0, 0.3], null, [0.125, 1, 1]],
			[new Line(lineGeometry, matLineMagenta), [0.3, 0, 0.18], [0, -Math.PI / 2, 0], [0.125, 1, 1]]
		]
	};

	const pickerTranslate = {
		X: [
			[new Mesh(new CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0.6, 0, 0], [0, 0, -Math.PI / 2]]
		],
		Y: [
			[new Mesh(new CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0.6, 0]]
		],
		Z: [
			[new Mesh(new CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0, 0.6], [Math.PI / 2, 0, 0]]
		],
		XYZ: [
			[new Mesh(new OctahedronBufferGeometry(0.2, 0), matInvisible)]
		],
		XY: [
			[new Mesh(new PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0.2, 0]]
		],
		YZ: [
			[new Mesh(new PlaneBufferGeometry(0.4, 0.4), matInvisible), [0, 0.2, 0.2], [0, Math.PI / 2, 0]]
		],
		XZ: [
			[new Mesh(new PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0, 0.2], [-Math.PI / 2, 0, 0]]
		]
	};

	const helperTranslate = {
		START: [
			[new Mesh(new OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']
		],
		END: [
			[new Mesh(new OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']
		],
		DELTA: [
			[new Line(translateHelperGeometry(), matHelper), null, null, null, 'helper']
		],
		X: [
			[new Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']
		],
		Y: [
			[new Line(lineGeometry, matHelper.clone()), [0, -1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']
		],
		Z: [
			[new Line(lineGeometry, matHelper.clone()), [0, 0, -1e3], [0, -Math.PI / 2, 0], [1e6, 1, 1], 'helper']
		]
	};

	// Creates an Object3D with gizmos described in custom hierarchy definition.

	const setupGizmo = function (gizmoMap) {

		const gizmo = new Object3D();

		for (const name in gizmoMap) {
			if (gizmoMap.hasOwnProperty(name)) {
				for (let i = gizmoMap[name].length; i--;) {

					const object = gizmoMap[name][i][0].clone();
					const position = gizmoMap[name][i][1];
					const rotation = gizmoMap[name][i][2];
					const scale = gizmoMap[name][i][3];
					const tag = gizmoMap[name][i][4];

					// name and tag properties are essential for picking and updating logic.
					object.name = name;
					object.tag = tag;

					if (position) {
						object.position.set(position[0], position[1], position[2]);
					}
					if (rotation) {
						object.rotation.set(rotation[0], rotation[1], rotation[2]);
					}
					if (scale) {
						object.scale.set(scale[0], scale[1], scale[2]);
					}

					object.updateMatrix();

					const tempGeometry = object.geometry.clone();
					tempGeometry.applyMatrix(object.matrix);
					object.geometry = tempGeometry;

					object.position.set(0, 0, 0);
					object.rotation.set(0, 0, 0);
					object.scale.set(1, 1, 1);

					gizmo.add(object);

				}
			}

		}

		return gizmo;

	};

	// Reusable utility variables
	const alignVector = new Vector3();
	const tempVector = new Vector3(0, 0, 0);
	const tempEuler = new Euler();
	const zeroVector = new Vector3(0, 0, 0);
	const lookAtMatrix = new Matrix4();
	const tempQuaternion = new Quaternion();
	const identityQuaternion = new Quaternion();

	const unitX = new Vector3(1, 0, 0);
	const unitY = new Vector3(0, 1, 0);
	const unitZ = new Vector3(0, 0, 1);

	// Gizmo creation

	this.gizmo = {};
	this.picker = {};
	this.helper = {};

	this.add(this.gizmo.translate = setupGizmo(gizmoTranslate));
	this.add(this.picker.translate = setupGizmo(pickerTranslate));
	this.add(this.helper.translate = setupGizmo(helperTranslate));

	// Pickers should be hidden always

	this.picker.translate.visible = false;

	// updateMatrixWorld will update transformations and appearance of individual handles

	this.updateMatrixWorld = function () {

		const space = this.space;

		const quaternion = space === 'local' ? this.worldQuaternion : identityQuaternion;

		// Show only gizmos for current transform mode

		this.gizmo.translate.visible = this.mode === 'translate';

		this.helper.translate.visible = this.mode === 'translate';


		const handles = [].concat(
			this.picker[this.mode].children,
			this.gizmo[this.mode].children,
			this.helper[this.mode].children
		);

		for (let i = 0; i < handles.length; i++) {

			const handle = handles[i];

			// hide aligned to camera

			handle.visible = true;
			handle.rotation.set(0, 0, 0);
			handle.position.copy(this.worldPosition);

			const eyeDistance = this.worldPosition.distanceTo(this.cameraPosition);
			handle.scale.set(1, 1, 1).multiplyScalar(eyeDistance * this.size / 7);

			// TODO: simplify helpers and consider decoupling from gizmo

			if (handle.tag === 'helper') {

				handle.visible = false;

				if (handle.name === 'AXIS') {

					handle.position.copy(this.worldPositionStart);
					handle.visible = !!this.axis;

					if (this.axis === 'X') {

						tempQuaternion.setFromEuler(tempEuler.set(0, 0, 0));
						handle.quaternion.copy(quaternion).multiply(tempQuaternion);

						if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) > 0.9) {
							handle.visible = false;
						}

					}

					if (this.axis === 'Y') {

						tempQuaternion.setFromEuler(tempEuler.set(0, 0, Math.PI / 2));
						handle.quaternion.copy(quaternion).multiply(tempQuaternion);

						if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) > 0.9) {
							handle.visible = false;
						}

					}

					if (this.axis === 'Z') {

						tempQuaternion.setFromEuler(tempEuler.set(0, Math.PI / 2, 0));
						handle.quaternion.copy(quaternion).multiply(tempQuaternion);

						if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) > 0.9) {
							handle.visible = false;
						}

					}

					if (this.axis === 'XYZE') {

						tempQuaternion.setFromEuler(tempEuler.set(0, Math.PI / 2, 0));
						alignVector.copy(this.rotationAxis);
						handle.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(zeroVector, alignVector, unitY));
						handle.quaternion.multiply(tempQuaternion);
						handle.visible = this.dragging;

					}

					if (this.axis === 'E') {

						handle.visible = false;

					}


				} else if (handle.name === 'START') {

					handle.position.copy(this.worldPositionStart);
					handle.visible = this.dragging;

				} else if (handle.name === 'END') {

					handle.position.copy(this.worldPosition);
					handle.visible = this.dragging;

				} else if (handle.name === 'DELTA') {

					handle.position.copy(this.worldPositionStart);
					handle.quaternion.copy(this.worldQuaternionStart);
					tempVector.set(1e-10, 1e-10, 1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(-1);
					tempVector.applyQuaternion(this.worldQuaternionStart.clone().inverse());
					handle.scale.copy(tempVector);
					handle.visible = this.dragging;

				} else {

					handle.quaternion.copy(quaternion);

					if (this.dragging) {

						handle.position.copy(this.worldPositionStart);

					} else {

						handle.position.copy(this.worldPosition);

					}

					if (this.axis) {

						handle.visible = this.axis.search(handle.name) !== -1;

					}

				}

				// If updating helper, skip rest of the loop
				// continue;

			}

			// Align handles to current local or world rotation

			handle.quaternion.copy(quaternion);

			if (this.mode === 'translate' || this.mode === 'scale') {

				// Hide translate and scale axis facing the camera

				const AXIS_HIDE_TRESHOLD = 0.99;
				const PLANE_HIDE_TRESHOLD = 0.2;
				const AXIS_FLIP_TRESHOLD = -0.4;


				if (handle.name === 'X' || handle.name === 'XYZX') {
					if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'Y' || handle.name === 'XYZY') {
					if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'Z' || handle.name === 'XYZZ') {
					if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'XY') {
					if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'YZ') {
					if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}
				if (handle.name === 'XZ') {
					if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
						handle.scale.set(1e-10, 1e-10, 1e-10);
						handle.visible = false;
					}
				}

				// Flip translate and scale axis ocluded behind another axis

				if (handle.name.search('X') !== -1) {
					if (alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
						if (handle.tag === 'fwd') {
							handle.visible = false;
						} else {
							handle.scale.x *= -1;
						}
					} else if (handle.tag === 'bwd') {
						handle.visible = false;
					}
				}

				if (handle.name.search('Y') !== -1) {
					if (alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
						if (handle.tag === 'fwd') {
							handle.visible = false;
						} else {
							handle.scale.y *= -1;
						}
					} else if (handle.tag === 'bwd') {
						handle.visible = false;
					}
				}

				if (handle.name.search('Z') !== -1) {
					if (alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
						if (handle.tag === 'fwd') {
							handle.visible = false;
						} else {
							handle.scale.z *= -1;
						}
					} else if (handle.tag === 'bwd') {
						handle.visible = false;
					}
				}

			}

			// Hide disabled axes
			handle.visible = handle.visible && (handle.name.indexOf('X') === -1 || this.showX);
			handle.visible = handle.visible && (handle.name.indexOf('Y') === -1 || this.showY);
			handle.visible = handle.visible && (handle.name.indexOf('Z') === -1 || this.showZ);
			handle.visible = handle.visible && (handle.name.indexOf('E') === -1 ||  this.showX && this.showY && this.showZ);

			// highlight selected axis
			if (originalOpacity.has(handle.material)) {
				handle.material.opacity = originalOpacity.get(handle.material);
			} else {
				originalOpacity.set(handle.material, handle.material.opacity);
			}

			if (originalColor.has(handle.material)) {
				handle.material.color.copy(originalColor.get(handle.material));
			} else {
				originalColor.set(handle.material, handle.material.color.clone());
			}
			// handle.material._opacity = handle.material._opacity || handle.material.opacity;
			// handle.material._color = handle.material._color || handle.material.color.clone();

			// handle.material.color.copy(handle.material._color);
			// handle.material.opacity = handle.material._opacity;

			if (!this.enabled) {

				handle.material.opacity *= 0.5;
				handle.material.color.lerp(new Color(1, 1, 1), 0.5);

			} else if (this.axis) {

				if (handle.name === this.axis) {

					handle.material.opacity = 1.0;
					handle.material.color.lerp(new Color(1, 1, 1), 0.5);

				} else if (this.axis.split('').some(function (a) {
					return handle.name === a;
				})) {

					handle.material.opacity = 1.0;
					handle.material.color.lerp(new Color(1, 1, 1), 0.5);

				} else {

					handle.material.opacity *= 0.25;
					handle.material.color.lerp(new Color(1, 1, 1), 0.5);

				}

			}

		}

		Object3D.prototype.updateMatrixWorld.call(this);

	};

}

TransformControlsGizmo.prototype = Object.assign(Object.create(Object3D.prototype), {

	constructor: TransformControlsGizmo,

	isTransformControlsGizmo: true

});

function TransformControlsPlane() {



	Mesh.call(this,
		new PlaneBufferGeometry(100000, 100000, 2, 2),
		new MeshBasicMaterial({ visible: false, wireframe: true, side: DoubleSide, transparent: true, opacity: 0.1 })
	);

	this.type = 'TransformControlsPlane';

	const unitX = new Vector3(1, 0, 0);
	const unitY = new Vector3(0, 1, 0);
	const unitZ = new Vector3(0, 0, 1);

	const tempVector = new Vector3();
	const dirVector = new Vector3();
	const alignVector = new Vector3();
	const tempMatrix = new Matrix4();
	const identityQuaternion = new Quaternion();

	this.updateMatrixWorld = function () {

		const space = this.space;

		this.position.copy(this.worldPosition);

		unitX.set(1, 0, 0).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);
		unitY.set(0, 1, 0).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);
		unitZ.set(0, 0, 1).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);

		// Align the plane for current transform mode, axis and space.

		alignVector.copy(unitY);

		switch (this.mode) {
			case 'translate':
			case 'scale':
				switch (this.axis) {
					case 'X':
						alignVector.copy(this.eye).cross(unitX);
						dirVector.copy(unitX).cross(alignVector);
						break;
					case 'Y':
						alignVector.copy(this.eye).cross(unitY);
						dirVector.copy(unitY).cross(alignVector);
						break;
					case 'Z':
						alignVector.copy(this.eye).cross(unitZ);
						dirVector.copy(unitZ).cross(alignVector);
						break;
					case 'XY':
						dirVector.copy(unitZ);
						break;
					case 'YZ':
						dirVector.copy(unitX);
						break;
					case 'XZ':
						alignVector.copy(unitZ);
						dirVector.copy(unitY);
						break;
					case 'XYZ':
					case 'E':
						dirVector.set(0, 0, 0);
						break;
				}
				break;
			case 'rotate':
			default:
				// special case for rotate
				dirVector.set(0, 0, 0);
		}

		if (dirVector.length() === 0) {

			// If in rotate mode, make the plane parallel to camera
			this.quaternion.copy(this.cameraQuaternion);

		} else {

			tempMatrix.lookAt(tempVector.set(0, 0, 0), dirVector, alignVector);

			this.quaternion.setFromRotationMatrix(tempMatrix);

		}

		Object3D.prototype.updateMatrixWorld.call(this);

	};

}

TransformControlsPlane.prototype = Object.assign(Object.create(Mesh.prototype), {

	constructor: TransformControlsPlane,

	isTransformControlsPlane: true

});


export default function TransformControls(camera, domElement) {

	Object3D.call(this);

	domElement =  domElement !== undefined  ? domElement : document;

	this.visible = false;

	const gizmo = new TransformControlsGizmo();
	this.add(gizmo);

	const plane = new TransformControlsPlane();
	this.add(plane);

	const scope = this;

	// Define properties with getters/setter
	// Setting the defined property will automatically trigger change event
	// Defined properties are passed down to gizmo and plane

	defineProperty('camera', camera);
	defineProperty('object', undefined);
	defineProperty('enabled', true);
	defineProperty('axis', null);
	defineProperty('mode', 'translate');
	defineProperty('translationSnap', null);
	// defineProperty('rotationSnap', null);
	defineProperty('space', 'world');
	defineProperty('size', 1);
	defineProperty('dragging', false);
	defineProperty('showX', true);
	defineProperty('showY', true);
	defineProperty('showZ', true);

	const changeEvent = { type: 'change' };
	const mouseDownEvent = { type: 'mouseDown' };
	const mouseUpEvent = { type: 'mouseUp', mode: scope.mode };
	const objectChangeEvent = { type: 'objectChange' };

	// Reusable utility variables

	const ray = new Raycaster();

	const tempVector = new Vector3();
	const tempQuaternion = new Quaternion();

	const pointStart = new Vector3();
	const pointEnd = new Vector3();
	const offset = new Vector3();
	const rotationAxis = new Vector3();
	const rotationAngle = 0;

	const cameraPosition = new Vector3();
	const cameraQuaternion = new Quaternion();
	const cameraScale = new Vector3();

	const parentPosition = new Vector3();
	const parentQuaternion = new Quaternion();
	const parentQuaternionInv = new Quaternion();
	const parentScale = new Vector3();

	const worldPositionStart = new Vector3();
	const worldQuaternionStart = new Quaternion();
	const worldScaleStart = new Vector3();

	const worldPosition = new Vector3();
	const worldQuaternion = new Quaternion();
	const worldQuaternionInv = new Quaternion();
	const worldScale = new Vector3();

	const eye = new Vector3();

	const positionStart = new Vector3();
	const quaternionStart = new Quaternion();
	const scaleStart = new Vector3();

	// TODO: remove properties unused in plane and gizmo

	defineProperty('worldPosition', worldPosition);
	defineProperty('worldPositionStart', worldPositionStart);
	defineProperty('worldQuaternion', worldQuaternion);
	defineProperty('worldQuaternionStart', worldQuaternionStart);
	defineProperty('cameraPosition', cameraPosition);
	defineProperty('cameraQuaternion', cameraQuaternion);
	defineProperty('pointStart', pointStart);
	defineProperty('pointEnd', pointEnd);
	defineProperty('rotationAxis', rotationAxis);
	defineProperty('rotationAngle', rotationAngle);
	defineProperty('eye', eye);

	{

		domElement.addEventListener('mousedown', onPointerDown, false);
		domElement.addEventListener('touchstart', onPointerDown, false);
		domElement.addEventListener('mousemove', onPointerHover, false);
		domElement.addEventListener('touchmove', onPointerHover, false);
		domElement.addEventListener('touchmove', onPointerMove, false);
		document.addEventListener('mouseup', onPointerUp, false);
		domElement.addEventListener('touchend', onPointerUp, false);
		domElement.addEventListener('touchcancel', onPointerUp, false);
		domElement.addEventListener('touchleave', onPointerUp, false);

	}

	this.dispose = function () {

		domElement.removeEventListener('mousedown', onPointerDown);
		domElement.removeEventListener('touchstart', onPointerDown);
		domElement.removeEventListener('mousemove', onPointerHover);
		domElement.removeEventListener('touchmove', onPointerHover);
		domElement.removeEventListener('touchmove', onPointerMove);
		document.removeEventListener('mouseup', onPointerUp);
		domElement.removeEventListener('touchend', onPointerUp);
		domElement.removeEventListener('touchcancel', onPointerUp);
		domElement.removeEventListener('touchleave', onPointerUp);

	};

	// Set current object
	this.attach = function (object) {

		this.object = object;
		this.visible = true;

	};

	// Detatch from object
	this.detach = function () {

		this.object = undefined;
		this.visible = false;
		this.axis = null;

	};

	// Defined getter, setter and store for a property
	function defineProperty(propName, defaultValue) {

		let propValue = defaultValue;

		Object.defineProperty(scope, propName, {

			get: function () {

				return propValue !== undefined ? propValue : defaultValue;

			},

			set: function (value) {

				if (propValue !== value) {

					propValue = value;
					plane[propName] = value;
					gizmo[propName] = value;

					scope.dispatchEvent({ type: propName + '-changed', value: value });
					scope.dispatchEvent(changeEvent);

				}

			}

		});

		scope[propName] = defaultValue;
		plane[propName] = defaultValue;
		gizmo[propName] = defaultValue;

	}

	// updateMatrixWorld  updates key transformation variables
	this.updateMatrixWorld = function () {

		if (this.object !== undefined) {

			this.object.updateMatrixWorld();
			this.object.parent.matrixWorld.decompose(parentPosition, parentQuaternion, parentScale);
			this.object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

			parentQuaternionInv.copy(parentQuaternion).inverse();
			worldQuaternionInv.copy(worldQuaternion).inverse();

		}

		this.camera.updateMatrixWorld();
		this.camera.matrixWorld.decompose(cameraPosition, cameraQuaternion, cameraScale);

		if (this.camera instanceof PerspectiveCamera) {

			eye.copy(cameraPosition).sub(worldPosition).normalize();

		} else if (this.camera instanceof OrthographicCamera) {

			eye.copy(cameraPosition).normalize();

		}

		Object3D.prototype.updateMatrixWorld.call(this);

	};

	this.pointerHover = function (pointer) {

		if (this.object === undefined || this.dragging === true ||  pointer.button !== undefined && pointer.button !== 0) {
			return;
		}

		ray.setFromCamera(pointer, this.camera);

		const intersect = ray.intersectObjects(gizmo.picker[this.mode].children, true)[0] || false;

		if (intersect) {

			this.axis = intersect.object.name;

		} else {

			this.axis = null;

		}

	};

	this.pointerDown = function (pointer) {

		if (this.object === undefined || this.dragging === true ||  pointer.button !== undefined && pointer.button !== 0) {
			return;
		}

		if ((pointer.button === 0 || pointer.button === undefined) && this.axis !== null) {

			ray.setFromCamera(pointer, this.camera);

			const planeIntersect = ray.intersectObjects([plane], true)[0] || false;

			if (planeIntersect) {

				this.object.updateMatrixWorld();
				this.object.parent.updateMatrixWorld();

				positionStart.copy(this.object.position);
				quaternionStart.copy(this.object.quaternion);
				scaleStart.copy(this.object.scale);

				this.object.matrixWorld.decompose(worldPositionStart, worldQuaternionStart, worldScaleStart);

				pointStart.copy(planeIntersect.point).sub(worldPositionStart);

			}

			this.dragging = true;
			mouseDownEvent.mode = this.mode;
			this.dispatchEvent(mouseDownEvent);

		}

	};

	this.pointerMove = function (pointer) {

		const axis = this.axis;
		const mode = this.mode;
		const object = this.object;
		let space = this.space;

		if (axis === 'E' ||  axis === 'XYZE' ||  axis === 'XYZ') {

			space = 'world';

		}

		if (object === undefined || axis === null || this.dragging === false ||  pointer.button !== undefined && pointer.button !== 0) {
			return;
		}

		ray.setFromCamera(pointer, this.camera);

		const planeIntersect = ray.intersectObjects([plane], true)[0] || false;

		if (planeIntersect === false) {
			return;
		}

		pointEnd.copy(planeIntersect.point).sub(worldPositionStart);

		if (mode === 'translate') {

			// Apply translate
			offset.copy(pointEnd).sub(pointStart);

			if (space === 'local' && axis !== 'XYZ') {
				offset.applyQuaternion(worldQuaternionInv);
			}

			if (axis.indexOf('X') === -1) {
				offset.x = 0;
			}
			if (axis.indexOf('Y') === -1) {
				offset.y = 0;
			}
			if (axis.indexOf('Z') === -1) {
				offset.z = 0;
			}

			if (space === 'local' && axis !== 'XYZ') {
				offset.applyQuaternion(quaternionStart).divide(parentScale);
			} else {
				offset.applyQuaternion(parentQuaternionInv).divide(parentScale);
			}

			object.position.copy(offset).add(positionStart);

			// Apply translation snap

			if (this.translationSnap) {

				if (space === 'local') {

					object.position.applyQuaternion(tempQuaternion.copy(quaternionStart).inverse());

					if (axis.search('X') !== -1) {
						object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
					}

					if (axis.search('Y') !== -1) {
						object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
					}

					if (axis.search('Z') !== -1) {
						object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
					}

					object.position.applyQuaternion(quaternionStart);

				}

				if (space === 'world') {

					if (object.parent) {
						object.position.add(tempVector.setFromMatrixPosition(object.parent.matrixWorld));
					}

					if (axis.search('X') !== -1) {
						object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
					}

					if (axis.search('Y') !== -1) {
						object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
					}

					if (axis.search('Z') !== -1) {
						object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
					}

					if (object.parent) {
						object.position.sub(tempVector.setFromMatrixPosition(object.parent.matrixWorld));
					}

				}

			}

		}

		this.dispatchEvent(changeEvent);
		this.dispatchEvent(objectChangeEvent);

	};

	this.pointerUp = function (pointer) {

		if (pointer.button !== undefined && pointer.button !== 0) {
			return;
		}

		if (this.dragging &&  this.axis !== null) {

			mouseUpEvent.mode = this.mode;
			this.dispatchEvent(mouseUpEvent);

		}

		this.dragging = false;

		if (pointer.button === undefined) {
			this.axis = null;
		}

	};

	// normalize mouse / touch pointer and remap {x,y} to view space.

	function getPointer(event) {

		const pointer = event.changedTouches ? event.changedTouches[0] : event;

		const rect = domElement.getBoundingClientRect();

		return {
			x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
			y: -(pointer.clientY - rect.top) / rect.height * 2 + 1,
			button: event.button
		};

	}

	// mouse / touch event handlers

	function onPointerHover(event) {

		if (!scope.enabled) {
			return;
		}

		scope.pointerHover(getPointer(event));

	}

	function onPointerDown(event) {

		if (!scope.enabled) {
			return;
		}

		document.addEventListener('mousemove', onPointerMove, false);

		const pointer = getPointer(event);
		scope.pointerHover(pointer);
		scope.pointerDown(pointer);

	}

	function onPointerMove(event) {

		if (!scope.enabled) {
			return;
		}

		scope.pointerMove(getPointer(event));

	}

	function onPointerUp(event) {

		if (!scope.enabled) {
			return;
		}

		document.removeEventListener('mousemove', onPointerMove, false);

		scope.pointerUp(getPointer(event));

	}

	// TODO: depricate

	this.getMode = function () {

		return scope.mode;

	};

	this.setMode = function (mode) {

		scope.mode = mode;

	};

	this.setTranslationSnap = function (translationSnap) {

		scope.translationSnap = translationSnap;

	};

	this.setSize = function (size) {

		scope.size = size;

	};

	this.setSpace = function (space) {

		scope.space = space;

	};
}

TransformControls.prototype = Object.assign(Object.create(Object3D.prototype), {

	constructor: TransformControls,

	isTransformControls: true

});



