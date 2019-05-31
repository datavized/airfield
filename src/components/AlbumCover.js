import React from 'react';
import { getAttachment } from '../engine/audioStorage';

import withStyles from '@material-ui/core/styles/withStyles';
import PropTypes from 'prop-types';
// import AlbumIcon from '@material-ui/icons/Album';
import FileMusicIcon from 'mdi-material-ui/FileMusic';


const styles = theme => ({
	icon: {
		backgroundColor: theme.palette.grey[300],
		color: theme.palette.grey[700],
		display: 'block'
	},
	img: {
		display: 'block'
	}
});

const Def = class AlbumCover extends React.Component {
	static propTypes = {
		className: PropTypes.string,
		classes: PropTypes.object,
		id: PropTypes.string.isRequired,
		width: PropTypes.number,
		height: PropTypes.number
	}

	static defaultProps = {
		width: 32,
		height: 32
	}

	state = {
		imageURL: '',
		id: ''
	}

	currentId = ''

	static getDerivedStateFromProps(props, state) {
		// Store prevId in state so we can compare when props change.
		// Clear out previously-loaded data (so we don't render stale stuff).
		if (props.id !== state.id) {
			if (state.imageURL) {
				URL.revokeObjectURL(state.imageURL);
			}

			return {
				imageURL: '',
				id: props.id
			};
		}

		// No state update necessary
		return null;
	}

	componentDidMount() {
		this.loadAlbumArt(this.props.id);
	}

	componentDidUpdate(prevProps, prevState) {
		if (!prevState.imageURL) {
			this.loadAlbumArt(this.props.id);
		}
	}

	componentWillUnmount() {
		this.currentId = '';

		if (this.state.imageURL) {
			URL.revokeObjectURL(this.state.imageURL);
		}
	}

	async loadAlbumArt(id) {
		if (id === this.currentId) {
			// Data for this id is already loading
			return;
		}
		this.currentId = id;

		let picture = await getAttachment(JSON.stringify([id, 'coverArt']));
		if (id !== this.currentId) {
			// id changed since we started loading
			return;
		}

		let imageURL = '';
		if (picture instanceof ArrayBuffer) {
			picture = new Blob([new Uint8Array(picture)]);
		}

		if (picture instanceof Blob) {
			imageURL = URL.createObjectURL(picture);
		} else if (picture) {
			imageURL = picture;
		}

		this.setState({ imageURL });
	}

	render() {
		const {
			className,
			classes,
			width,
			height,
			...props
		} = this.props;

		const { imageURL } = this.state;

		return <div className={className} {...props}>
			{imageURL ?
				<img src={imageURL} width={width} height={height} className={classes.img}/> :
				<FileMusicIcon className={classes.icon} style={{
					width,
					height
				}}/>
			}
		</div>;
	}
};

const AlbumCover = withStyles(styles)(Def);
// const AlbumCover = Def;
export default AlbumCover;