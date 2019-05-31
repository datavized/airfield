import React from 'react';
import classNames from 'classnames';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

/*
Material UI stuff
*/
import withStyles from '@material-ui/core/styles/withStyles';
import { fade } from '@material-ui/core/styles/colorManipulator';
import PropTypes from 'prop-types';
import Tooltip from '@material-ui/core/Tooltip';

const styles = theme => ({
	container: {
		'& .rc-slider': {
			height: 32,
			padding: [[15, 0]],
			// transform: 'translateY(-17px)',

			'& .rc-slider-rail': {
				height: 2
			},
			'& .rc-slider-track': {
				backgroundColor: theme.palette.primary.main,
				height: 2
			},
			'& .rc-slider-handle': {
				backgroundColor: theme.palette.primary.main,
				border: 'none',
				width: 12,
				height: 12,
				transition: 'transform 150ms cubic-bezier(0.0, 0, 0.2, 1) 0ms,box-shadow 150ms cubic-bezier(0.0, 0, 0.2, 1) 0ms',

				'&:hover': { // todo: focused
					boxShadow: `0px 0px 0px 9px ${fade(theme.palette.primary.main, 0.16)}`
				}
				// todo: '&$activated': {
				// 	boxShadow: `0px 0px 0px 9px ${fade(theme.palette.primary.main, 0.16)}`
				// }
			}
		},
		// padding: `0 ${theme.spacing.unit * 2}px`
		'& .rc-slider-disabled': {
			backgroundColor: 'transparent',

			'& .rc-slider-rail': {
				backgroundColor: theme.palette.action.disabledBackground
			},
			'& .rc-slider-track': {
				backgroundColor: theme.palette.action.disabled
			},
			'& .rc-slider-handle': {
				backgroundColor: theme.palette.grey[500],
				cursor: 'no-drop'
			}
		}
	}
});

const Handle = Slider.Handle;

function createSliderWithTooltip(Component) {
	return class HandleWrapper extends React.Component {
		static propTypes = {
			classes: PropTypes.object.isRequired,
			className: PropTypes.string,
			theme: PropTypes.object.isRequired,
			marks: PropTypes.object,
			tipFormatter: PropTypes.func,
			handleStyle: PropTypes.arrayOf(PropTypes.object),
			trackStyle: PropTypes.arrayOf(PropTypes.object),
			railStyle: PropTypes.object,
			tipProps: PropTypes.object,
			count: PropTypes.number,
			disabled: PropTypes.bool
		}

		static defaultProps = {
			tipFormatter: value => value,
			handleStyle: [{}],
			trackStyle: [{}],
			tipProps: {}
		}

		state = {
			visibles: {}
		}

		handleTooltipVisibleChange = (index, visible) => {
			this.setState((prevState) => {
				return {
					visibles: {
						...prevState.visibles,
						[index]: visible
					}
				};
			});
		}
		handleWithTooltip = ({ value, dragging, index, disabled, ...restProps }) => {
			const {
				tipFormatter,
				tipProps
			} = this.props;

			const {
				title = tipFormatter(value),
				placement = 'top',
				...restTooltipProps
			} = tipProps;

			// todo: replace prefixCls with className?
			// todo: override tooltipOpen to remove animation

			return (
				<Tooltip
					{...restTooltipProps}
					title={title}
					placement={placement}
					open={!disabled && (this.state.visibles[index] || dragging)}
					key={index}
				>
					<Handle
						{...restProps}
						value={value}
						onMouseEnter={() => this.handleTooltipVisibleChange(index, true)}
						onMouseLeave={() => this.handleTooltipVisibleChange(index, false)}
					/>
				</Tooltip>
			);
		}
		render() {
			const { classes, className, ...otherProps } = this.props;
			const {
				handleStyle,
				trackStyle,
				railStyle
			} = this.props;

			const style = {};
			if (this.props.marks) {
				style.marginBottom = 32;
			}

			const rangeCount = this.props.count ||
				Component.defaultProps.count || 0;
			const handleCount = rangeCount + 1;

			for (let i = handleStyle.length; i < handleCount; i++) {
				handleStyle[i] = handleStyle[i - 1];
			}

			const props = {
				...otherProps,
				style,
				trackStyle,
				railStyle,
				handleStyle
			};
			return <div className={classNames(classes.container, className)}>
				<Component
					{...props}
					handle={this.handleWithTooltip}
				/>
			</div>;
		}
	};
}

const Def = withStyles(styles)(createSliderWithTooltip(Slider));
export default Def;

const Range = withStyles(styles)(createSliderWithTooltip(Slider.Range));
export { Range };