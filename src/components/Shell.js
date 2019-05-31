/* global APP_TITLE */
import React from 'react';
import PropTypes from 'prop-types';

import appLogo from '../images/airfield-logo.svg';

/*
Theme/Style stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';

/*
Material UI components
*/
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

const styles = (theme) => ({
	root: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		backgroundColor: theme.palette.background.default
	},
	title: {
		flex: 1,
		display: 'flex',
		alignItems: 'center',
		overflow: 'hidden',
		'& > *': {
			display: 'inline'
		},
		'& > span:first-child': {
			overflow: 'hidden',
			textOverflow: 'ellipsis',
			whiteSpace: 'nowrap'
		}
	},
	logo: {
		height: 32,
		marginRight: theme.spacing.unit
	},
	appBar: {
	},
	'@media (max-height: 445px)': {
		appBar: {
			minHeight: 48
		}
	}
});

const Def = class Shell extends React.Component {
	static propTypes = {
		classes: PropTypes.object.isRequired,
		theme: PropTypes.object.isRequired,
		children: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		]),
		title: PropTypes.string,
		header: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node,
			PropTypes.string
		]),
		controls: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		])
	}

	static defaultProps = {
		title: '',
		header: ''
	}

	// updateTitle = () => document.title = this.props.title

	// componentDidMount() {
	// 	this.updateTitle();
	// }

	// componentDidUpdate() {
	// 	this.updateTitle();
	// }

	render() {
		const {
			classes,
			children
		} = this.props;

		const header = typeof this.props.header !== 'string' || !this.props.header ?
			this.props.header :
			<Typography variant="h6" color="inherit" className={classes.title} component="h1">
				{this.props.header}
			</Typography>;

		return <div className={classes.root}>
			<AppBar position="static">
				<Toolbar className={classes.appBar}>
					<img src={appLogo} alt={APP_TITLE} className={classes.logo}/>
					{header}
					{this.props.controls}
				</Toolbar>
			</AppBar>
			{children}
		</div>;
	}
};

const Shell = withStyles(styles, { withTheme: true })(Def);
export default Shell;