//http://madebyevan.com/shaders/grid/

varying vec3 vPosition;
varying float minor;
varying float major;
varying float minorAlpha;

const float borderFactor = 0.025;
const vec3 color = vec3(1.0);

@import ./aastep;

void main() {
	// todo: these should probably be in vert shader
	float meh = 1.0;//(minor + minorAlpha);
	float border = borderFactor * meh;
	float insideBorder = 1.0 - border / 2.0;
	float outsideBorder = 1.0 + border / 2.0;

	// circles
	float dist = length(vPosition) + 1.0;

	float dMajor = mod(dist, major);
	// float majorLine = aastep(0.5, dMajor * outsideBorder) - aastep(0.5, dMajor * insideBorder);
	// float majorLine = aastep(0.5 * meh, dMajor + border) - aastep(0.5 * meh, dMajor - border);
	float majorCoord = dist / major;
	float majorLine = 1.0 - abs(fract(majorCoord - 0.5) - 0.5) / fwidth(majorCoord);

	float dMinor = mod(dist, minor);
	// float minorLine = aastep(0.5, dMinor * outsideBorder) - aastep(0.5, dMinor * insideBorder);
	// float minorLine = aastep(0.5 * meh, dMinor + border) - aastep(0.5 * meh, dMinor - border);
	float coord = dist / minor;
	float minorLine = 0.0;//1.0 - abs(fract(coord - 0.5) - 0.5) / fwidth(coord);

	float alpha = max(majorLine, minorLine * minorAlpha);

	// todo: add grid lines at center
	// todo: add arrow for -z forward direction?

	// if( t < alphaTest ) discard;

    gl_FragColor = vec4(color, alpha);
}