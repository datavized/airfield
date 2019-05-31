export default function FOARouter(context, channelMap) {
	const splitter = context.createChannelSplitter(4);
	const merger = context.createChannelMerger(4);

	// input/output proxy.
	this.input = splitter;
	this.output = merger;

	this.setChannelMap = map => {
		this.channelMap = map;
		try {
			splitter.disconnect(merger);
		} catch (e) {}
		splitter.connect(merger, 0, map[0]);
		splitter.connect(merger, 1, map[1]);
		splitter.connect(merger, 2, map[2]);
		splitter.connect(merger, 3, map[3]);
	};

	this.disconnect = () => {
		splitter.disconnect();
		merger.disconnect();
	};

	this.setChannelMap(channelMap || [0, 1, 2, 3]);
}