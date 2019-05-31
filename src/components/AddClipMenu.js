import React from 'react'; // import classNames from 'classnames';
import {
	loadAudioFile,
	getAudioIds,
	on as listenAudioStorage,
	off as unlistenAudioStorage
} from '../engine/audioStorage';
import titleText from '../util/audioFileTitleText';

/*
Material UI components
*/
import PropTypes from 'prop-types';
import ContextMenu from './ContextMenu';
import AddClipIcon from '@material-ui/icons/LibraryAdd';

function sortAudioFiles(a, b) {
	a = titleText(a);
	b = titleText(b);
	return a < b ? 1 : -1;
}

const Def = class AddClipMenu extends React.Component {
	static propTypes = {
		onSelect: PropTypes.func.isRequired
	}

	state = {
		audioFiles: []
	}

	loadAudioFiles = () => {
		/*
		todo:
		- only show up to ~10?
		- sort by recently added?
		- add "..." menu that brings up audio library as dialog box
		  in compact mode
		*/
		getAudioIds().then(ids => {
			Promise.all(ids.map(loadAudioFile)).then(audioFiles => {
				audioFiles.sort(sortAudioFiles);
				this.setState({ audioFiles });
			});
		});
	}

	componentDidMount() {
		listenAudioStorage('update', this.loadAudioFiles);
		this.loadAudioFiles();
	}

	componentWillUnmount() {
		unlistenAudioStorage('update', this.loadAudioFiles);
	}

	render() {
		const menuItems = this.state.audioFiles.map(file => ({
			key: file.id,
			label: titleText(file),
			onClick: () => this.props.onSelect(file.id)
		}));
		if (!menuItems.length) {
			menuItems.push({
				key: '-go-to-library',
				label: <em>Import audio files to library...</em>,
				onClick: () => this.props.onSelect(null)
			});
		}
		return <ContextMenu
			label="Add Clip"
			id={'add-clip'}
			menuItems={menuItems}
			icon={<AddClipIcon/>}
			menuProps={{
				PaperProps: {
					style: {
						maxHeight: window.innerHeight * 0.8,
						maxWidth: 400
					}
				}
			}}
		/>;
	}
};

const AddClipMenu = Def;
export default AddClipMenu;