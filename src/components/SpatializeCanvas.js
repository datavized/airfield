import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'unistore/react';
import { actions } from '../store';
import trackPanMode from '../util/trackPanMode';
import throttle from '../util/throttle';
import debounce from 'debounce';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
three.js stuff
todo: move to own module maybe?
todo: get from modules so we don't have to rely on tree-shaking?
*/
// core
// import { Object3D } from 'three/src/core/Object3D';
import { Float32BufferAttribute, Uint16BufferAttribute } from 'three/src/core/BufferAttribute';

// math
// import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Quaternion } from 'three/src/math/Quaternion';
import { Matrix4 } from 'three/src/math/Matrix4';

// geometries
import { BufferGeometry } from 'three/src/core/BufferGeometry';
// import { BoxBufferGeometry } from 'three/src/geometries/BoxGeometry';
import { SphereBufferGeometry } from 'three/src/geometries/SphereGeometry';
import { PlaneBufferGeometry } from 'three/src/geometries/PlaneGeometry';

// materials
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial';
import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';

// objects
import { Mesh } from 'three/src/objects/Mesh';

// other
// import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';

// controls
import OrbitControls from '../scene/OrbitControls';
import TransformControls from '../scene/TransformControls';

import headGeoSpec from '../scene/head.json';

// const FIELD_OF_VIEW = 30;
const CAMERA_START_HEIGHT = 10;
const CAMERA_START_POSITION = new Vector3(0, CAMERA_START_HEIGHT, 0);
const CAMERA_START_QUATERNION = new Quaternion()
	.setFromRotationMatrix(
		new Matrix4().lookAt(
			CAMERA_START_POSITION,
			new Vector3(0, 0, 0),
			new Vector3(0, 0, -1)
		)
	);
// const boxGeometry = new BoxBufferGeometry(1, 1, 1);
const trackObjectGeometry = new SphereBufferGeometry(0.1, 16, 16);
const ORIGIN = [0, 0, 0];

function configureCamera(camera, width, height) {
	if (camera && width && height) {
		const aspect = width / height;
		const h = Math.max(aspect, 1) * 5;
		const v = Math.max(1 / aspect, 1) * 5;
		Object.assign(camera, {
			left: -h,
			right: h,
			top: v,
			bottom: -v
		});

		camera.updateProjectionMatrix();
	}
}

const styles = theme => ({
	container: {
		overflow: 'hidden',
		height: '100%'
	},
	canvas: {
		display: 'block',
		backgroundColor: theme.palette.background.default
	}
});

const Def = class SpatializeCanvas extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		theme: PropTypes.object.isRequired,
		project: PropTypes.object,
		config: PropTypes.object,
		updateTrack: PropTypes.func.isRequired
	}

	state = {
		width: 0,
		height: 0,
		devicePixelRatio: window.devicePixelRatio,
		dragging: false,
		resetAnimationTime: 0
	}

	view = null
	canvas = null
	renderer = null
	sceneObjects = {}
	frameId = -1

	onCanvasRef = canvas => {
		this.canvas = canvas;
		// if (this.canvas && !this.renderer) {
		// 	this.initializeScene();
		// }
	}

	onViewRef = ref => {
		this.view = ref;
		this.resizeNow();
	}

	resetView = () => {
		// todo: animate this
		// this.setState({
		// 	resetAnimationTime: Date.now() + 500
		// }, this.drawNextFrame);
		const { camera } = this.sceneObjects;
		if (camera) {
			camera.position.copy(CAMERA_START_POSITION);
			camera.quaternion.copy(CAMERA_START_QUATERNION);
			this.drawNextFrame();
		}
	}

	initializeScene = () => {
		if (!this.canvas || this.renderer) {
			return;
		}

		const { canvas } = this;
		this.renderer = new WebGLRenderer({
			antialias: true,
			canvas
		});
		let parent = canvas;
		let backgroundColor = '';
		while (parent && (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)')) {
			const parentStyle = window.getComputedStyle(parent);
			backgroundColor = parentStyle.getPropertyValue('background-color');
			parent = parent.parentElement;
		}
		this.renderer.setClearColor(backgroundColor);

		const scene = new Scene();

		const headGeo = new BufferGeometry();
		headGeo.addAttribute('position', new Float32BufferAttribute(headGeoSpec.position, 3));
		headGeo.setIndex(new Uint16BufferAttribute(headGeoSpec.index.map(val => val - 1), 1));
		const head = new Mesh(
			headGeo,
			new MeshBasicMaterial({
				color: 0xaaaaaa
			})
		);
		head.name = 'head';
		scene.add(head);

		const floorMaterial = new ShaderMaterial({
			vertexShader: require('../scene/shaders/scalespace.vert'),
			fragmentShader: require('../scene/shaders/floor.frag'),
			side: 2,
			transparent: true,
			extensions: {
				derivatives: true
			},
			uniforms: {
				zoomScale: {
					value: 0.5
				}
			}
		});
		const floor = new Mesh(new PlaneBufferGeometry(1, 1, 1), floorMaterial);
		floor.scale.setScalar(100000);
		floor.rotation.x = -Math.PI / 2;
		scene.add(floor);

		// const camera = new PerspectiveCamera(FIELD_OF_VIEW, this.state.width / this.state.height, 0.1, 1000);
		const camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
		const orbitControls = new OrbitControls(camera);
		const transformControls = new TransformControls(camera, canvas);
		Object.assign(this.sceneObjects, {
			scene,
			camera,
			orbitControls,
			transformControls,
			tracks: new Map()
		});
		camera.position.set(0, CAMERA_START_HEIGHT, 0);
		configureCamera(camera, this.state.width, this.state.height);
		Object.assign(orbitControls, {
			enablePan: false,
			enableKeys: false,
			maxZoom: 10,
			minZoom: 0.0001
		});
		orbitControls.update();
		orbitControls.addEventListener('change', () => {
			floorMaterial.uniforms.zoomScale.value = Math.log10(10 / camera.zoom);
			// console.log('zoom', camera.zoom, 'scale', floorMaterial.uniforms.zoomScale.value);
			this.drawNextFrame();
		});
		orbitControls.addEventListener('start', () => {
			transformControls.enabled = false;
		});
		orbitControls.addEventListener('end', () => {
			transformControls.enabled = true;
		});

		transformControls.setMode('translate');
		scene.add(transformControls);
		transformControls.addEventListener('objectChange', this.onTransformObject);
		// todo: set up hovering
		transformControls.addEventListener('mouseDown', () => {
			this.setState({ dragging: true });
			orbitControls.enabled = false;
		});
		transformControls.addEventListener('mouseUp', () => {
			this.setState({ dragging: false });
			orbitControls.enabled = true;
		});

		// todo: click handler for selecting object
		// todo: click anywhere else on screen to de-select

		this.resizeNow();
	}

	saveTransformedTrack = throttle(this.props.updateTrack, 200)

	onTransformObject = () => {
		const { selectedTrackId } = this.props.config;
		const project = this.props.project || {
			tracks: new Map()
		};
		const track = project.tracks.get(selectedTrackId);
		const panMode = trackPanMode(track, project);
		if (panMode === 'spatial') {
			const { position } = this.sceneObjects.tracks.get(selectedTrackId);
			this.drawNextFrame();
			this.saveTransformedTrack({
				...track,
				position: position.toArray()
			});
		}
	}

	draw = () => {
		if (!this.renderer) {
			return;
		}

		// const dt = this.state.resetAnimationTime - Date.now();

		this.renderer.render(this.sceneObjects.scene, this.sceneObjects.camera);

		// todo: only animate if change necessary
		// this.frameId = window.requestAnimationFrame(this.draw);
	}

	drawNextFrame = () => {
		cancelAnimationFrame(this.frameId);
		this.frameId = window.requestAnimationFrame(this.draw);
	}

	// Make sure we get a sharp canvas on Retina displays
	// as well as adjust the canvas on zoomed browsers
	resizeNow = () => {
		const view = this.view;
		if (!view) {
			return;
		}

		const devicePixelRatio = window.devicePixelRatio || 1;
		const width = Math.round(view.clientWidth) * devicePixelRatio;
		const height = Math.round(view.clientHeight) * devicePixelRatio;
		if (this.state.width !== width || this.state.height !== height || this.state.devicePixelRatio !== devicePixelRatio) {
			if (this.renderer) {
				this.renderer.setSize(width, height, false);
				configureCamera(this.sceneObjects.camera, width, height);
			}
			this.setState({ width, height, devicePixelRatio }, this.drawNextFrame);
		}
	}

	resize = debounce(() => this.resizeNow(), 200)

	componentDidMount() {
		window.addEventListener('resize', this.resize);
	}

	shouldComponentUpdate(nextProps, nextState) {
		const { width, height, devicePixelRatio } = this.state;
		const { project, config } = this.props;
		const { selectedTrackId } = config;
		return !this.renderer ||
			!nextState.dragging && this.state.dragging ||
			nextProps.project !== project ||
			nextProps.config.selectedTrackId !== selectedTrackId ||
			nextState.width !== width ||
			nextState.height !== height ||
			nextState.devicePixelRatio !== devicePixelRatio;
	}

	componentDidUpdate() {
		const { project, config } = this.props;

		const { sceneObjects } = this;
		if (!project || this.state.dragging) {
			return;
		}

		this.initializeScene();

		const { palette } = this.props.theme;
		const tracks = project.tracks || new Map();
		const {
			scene,
			transformControls,
			tracks: trackObjects
		} = sceneObjects;

		const { selectedTrackId } = config;
		const removedTracks = new Set(trackObjects.keys());
		tracks.forEach(track => {
			const panMode = trackPanMode(track, project);
			if (panMode === 'spatial') {
				let obj = trackObjects.get(track.id);
				if (!obj) {
					obj = new Mesh(trackObjectGeometry, new MeshBasicMaterial({}));
					trackObjects.set(track.id, obj);
					scene.add(obj);
				}

				obj.position.fromArray(track.position || ORIGIN);
				obj.material.color.set(track.id === selectedTrackId ?
					palette.primary.main :
					palette.grey[500]);

				removedTracks.delete(track.id);
			}
		});

		removedTracks.forEach(trackId => {
			const obj = trackObjects.get(trackId);
			if (obj) {
				if (obj.parent) {
					obj.parent.remove(obj);
				}
				obj.material.dispose();
				trackObjects.delete(trackId);
			}
		});

		const selectedTrack = selectedTrackId && tracks.get(selectedTrackId);
		const selectedTrackMode = trackPanMode(selectedTrack, project);
		const object = selectedTrackMode === 'spatial' && trackObjects.get(selectedTrackId) || null;
		if (object !== transformControls.object) {
			transformControls.detach();
			if (object) {
				transformControls.attach(object);
			}
		}

		this.resizeNow();
		this.drawNextFrame();
	}

	componentWillUnmount() {
		// destroy renderer and all objects
		[
			...Object.values(this.sceneObjects),
			this.renderer
		].forEach(obj => {
			if (obj) {
				if (obj.traverse) {
					obj.traverse(node => {
						if (node.material) {
							node.material.dispose();
						}
						if (node.geometry) {
							node.geometry.dispose();
						}
					});
				}
				if (obj.dispose) {
					obj.dispose();
				}
			}
		});

		cancelAnimationFrame(this.frameId);
		window.removeEventListener('resize', this.resize);
	}

	render() {
		const {
			width,
			height,
			devicePixelRatio
		} = this.state;

		const { classes } = this.props;

		// The way canvas interacts with CSS layouting is a bit buggy
		// and inconsistent across browsers. To make it dependent on
		// the layout of the parent container, we only render it after
		// mounting, after CSS layouting is done.
		const canvas = this.state ?
			<canvas
				ref={this.onCanvasRef}
				width={ width }
				height={ height }
				className={classes.canvas}
				style={{
					width: width / devicePixelRatio,
					height: height / devicePixelRatio
				}} /> :
			null;

		return <div
			ref={this.onViewRef}
			className={classes.container}>
			{ canvas }
		</div>;
	}
};

const SpatializeCanvas = [
	connect(['project', 'config'], actions),
	withStyles(styles, { withTheme: true })
].reduceRight((prev, fn) => fn(prev), Def);

export default SpatializeCanvas;