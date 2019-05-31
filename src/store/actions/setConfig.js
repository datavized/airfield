export default function setConfig(state, config) {
	return {
		config: {
			...state.config,
			...config
		}
	};
}
