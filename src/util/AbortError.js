export default function AbortError(message) {
	const e = new Error(message || 'AbortError');
	e.name = 'AbortError';
	e.code = 20;
	return e;
}