export default function touchDistance(touches) {
	const one = touches[0];
	const two = touches[1];
	const dx = one.screenX - two.screenX;
	return Math.abs(dx);
}
