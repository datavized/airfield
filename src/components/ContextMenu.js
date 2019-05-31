import React from 'react';
import PropTypes from 'prop-types';

/*
Material UI components
*/
import IconButton from './IconButton';
import Typography from '@material-ui/core/Typography';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';

const Def = class ContextMenu extends React.Component {
	static propTypes = {
		menuItems: PropTypes.arrayOf(PropTypes.object).isRequired,
		menuProps: PropTypes.object,
		id: PropTypes.string,
		label: PropTypes.string,
		dense: PropTypes.bool,
		icon: PropTypes.node
	}

	state = {
		anchorEl: null
	}

	handleClick = event => {
		event.stopPropagation();
		this.setState({ anchorEl: event.currentTarget });
	}

	handleSelect = index => event => {
		event.stopPropagation();
		this.handleClose();

		const handler = this.props.menuItems[index].onClick;
		if (handler) {
			handler(this.props.id);
		}
	}

	handleClose = event => {
		if (event && event.stopPropagation) {
			event.stopPropagation();
		}
		this.setState({ anchorEl: null });
	}

	render() {
		const {
			id,
			label,
			menuItems,
			dense,
			menuProps,
			icon,
			...iconButtonProps
		} = this.props;

		const { anchorEl } = this.state;

		/*
		todo: Add to props
		*/

		const ariaId = `context-menu-${id}`;

		return <IconButton
			aria-owns={anchorEl ? ariaId : null}
			aria-label={label}
			aria-haspopup="true"
			disableRipple={true}
			label={label}
			{...iconButtonProps}
			onClick={this.handleClick}
		>
			{icon}
			<Menu
				id={ariaId}
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={this.handleClose}
				{...menuProps}
			>
				{menuItems && menuItems.map((item, i) =>{
					if (React.isValidElement(item)) {
						return item;
					}
					const {key, label, icon, ...props} = item;
					return <MenuItem dense={!!dense} key={key || i} {...props} onClick={this.handleSelect(i)}>
						{ icon ? <ListItemIcon>{icon}</ListItemIcon> : null }
						<Typography variant="inherit" noWrap>{label}</Typography>
					</MenuItem>;
				})}
			</Menu>
		</IconButton>;
	}
};

const ContextMenu = Def;
export default ContextMenu;
