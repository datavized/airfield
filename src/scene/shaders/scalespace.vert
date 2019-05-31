uniform float zoomScale;

// varying vec3 vGeometryPosition;
varying vec3 vPosition;
varying float minor;
varying float major;
varying float minorAlpha;

void main() {
	// vGeometryPosition = position;

	vec4 pos4 = vec4(position, 1.0);
	vec4 worldPosition = modelMatrix * pos4;
	vPosition = worldPosition.xyz / worldPosition.w;

	float hi = ceil(zoomScale);
	float lo = floor(zoomScale);
	minor = pow(10.0, lo);
	major = pow(10.0, hi);
	float range = hi - lo;
	minorAlpha = range > 0.0 ? 1.0 - (zoomScale - lo) / range : 0.0;

	gl_Position = projectionMatrix * modelViewMatrix * pos4;
}