/**
 * External dependencies
 */
import classnames from 'classnames';
import ResizableBox from 'react-resizable-box';
import {
	startCase,
	isEmpty,
	map,
	get,
	flowRight,
} from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component } from '@wordpress/element';
import { mediaUpload } from '@wordpress/utils';
import {
	Placeholder,
	Dashicon,
	Toolbar,
	DropZone,
	FormFileUpload,
	withAPIData,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import withEditorSettings from '../../with-editor-settings';
import Editable from '../../editable';
import MediaUploadButton from '../../media-upload-button';
import InspectorControls from '../../inspector-controls';
import TextControl from '../../inspector-controls/text-control';
import SelectControl from '../../inspector-controls/select-control';
import BlockControls from '../../block-controls';
import BlockAlignmentToolbar from '../../block-alignment-toolbar';
import BlockDescription from '../../block-description';
import UrlInputButton from '../../url-input/button';
import ImageSize from './image-size';

class ImageBlock extends Component {
	constructor() {
		super( ...arguments );
		this.updateAlt = this.updateAlt.bind( this );
		this.updateAlignment = this.updateAlignment.bind( this );
		this.onSelectImage = this.onSelectImage.bind( this );
		this.onSetHref = this.onSetHref.bind( this );
		this.updateImageURL = this.updateImageURL.bind( this );
	}

	onSelectImage( media ) {
		this.props.setAttributes( { url: media.url, alt: media.alt, caption: media.caption, id: media.id } );
	}

	onSetHref( value ) {
		this.props.setAttributes( { href: value } );
	}

	updateAlt( newAlt ) {
		this.props.setAttributes( { alt: newAlt } );
	}

	updateAlignment( nextAlign ) {
		const extraUpdatedAttributes = [ 'wide', 'full' ].indexOf( nextAlign ) !== -1
			? { width: undefined, height: undefined }
			: {};
		this.props.setAttributes( { ...extraUpdatedAttributes, align: nextAlign } );
	}

	updateImageURL( url ) {
		this.props.setAttributes( { url } );
	}

	getAvailableSizes() {
		return get( this.props.image, [ 'data', 'media_details', 'sizes' ], {} );
	}

	render() {
		const { attributes, setAttributes, focus, setFocus, className, settings } = this.props;
		const { url, alt, caption, align, id, href, width, height } = attributes;

		const availableSizes = this.getAvailableSizes();
		const figureStyle = width ? { width } : {};
		const isResizable = [ 'wide', 'full' ].indexOf( align ) === -1;
		const uploadButtonProps = { isLarge: true };
		const uploadFromFiles = ( event ) => mediaUpload( event.target.files, setAttributes );
		const dropFiles = ( files ) => mediaUpload( files, setAttributes );

		const controls = (
			focus && (
				<BlockControls key="controls">
					<BlockAlignmentToolbar
						value={ align }
						onChange={ this.updateAlignment }
					/>

					<Toolbar>
						<MediaUploadButton
							buttonProps={ {
								className: 'components-icon-button components-toolbar__control',
								'aria-label': __( 'Edit image' ),
							} }
							onSelect={ this.onSelectImage }
							type="image"
							value={ id }
						>
							<Dashicon icon="edit" />
						</MediaUploadButton>
						<UrlInputButton onChange={ this.onSetHref } url={ href } />
					</Toolbar>
				</BlockControls>
			)
		);

		if ( ! url ) {
			return [
				controls,
				<Placeholder
					key="placeholder"
					instructions={ __( 'Drag image here or insert from media library' ) }
					icon="format-image"
					label={ __( 'Image' ) }
					className={ className }>
					<DropZone
						onFilesDrop={ dropFiles }
					/>
					<FormFileUpload
						isLarge
						className="wp-block-image__upload-button"
						onChange={ uploadFromFiles }
						accept="image/*"
					>
						{ __( 'Upload' ) }
					</FormFileUpload>
					<MediaUploadButton
						buttonProps={ uploadButtonProps }
						onSelect={ this.onSelectImage }
						type="image"
					>
						{ __( 'Insert from Media Library' ) }
					</MediaUploadButton>
				</Placeholder>,
			];
		}

		const focusCaption = ( focusValue ) => setFocus( { editable: 'caption', ...focusValue } );
		const classes = classnames( className, {
			'is-transient': 0 === url.indexOf( 'blob:' ),
			'is-resized': !! width,
			'is-focused': !! focus,
		} );

		// Disable reason: Each block can be selected by clicking on it

		/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/onclick-has-role, jsx-a11y/click-events-have-key-events */
		return [
			controls,
			focus && (
				<InspectorControls key="inspector">
					<BlockDescription>
						<p>{ __( 'Worth a thousand words.' ) }</p>
					</BlockDescription>
					<h3>{ __( 'Image Settings' ) }</h3>
					<TextControl label={ __( 'Alternate Text' ) } value={ alt } onChange={ this.updateAlt } />
					{ ! isEmpty( availableSizes ) && (
						<SelectControl
							label={ __( 'Size' ) }
							value={ url }
							options={ map( availableSizes, ( size, name ) => ( {
								value: size.source_url,
								label: startCase( name ),
							} ) ) }
							onChange={ this.updateImageURL }
						/>
					) }
				</InspectorControls>
			),
			<figure key="image" className={ classes } style={ figureStyle }>
				<ImageSize src={ url } dirtynessTrigger={ align }>
					{ ( sizes ) => {
						const {
							imageWidthWithinContainer,
							imageHeightWithinContainer,
							imageWidth,
							imageHeight,
						} = sizes;
						const currentWidth = width || imageWidthWithinContainer;
						const currentHeight = height || imageHeightWithinContainer;
						const img = <img src={ url } alt={ alt } onClick={ setFocus } />;
						if ( ! isResizable || ! imageWidthWithinContainer ) {
							return img;
						}
						const ratio = imageWidth / imageHeight;
						const minWidth = imageWidth < imageHeight ? 10 : 10 * ratio;
						const minHeight = imageHeight < imageWidth ? 10 : 10 / ratio;
						return (
							<ResizableBox
								width={ currentWidth }
								height={ currentHeight }
								minWidth={ minWidth }
								maxWidth={ settings.maxWidth }
								minHeight={ minHeight }
								maxHeight={ settings.maxWidth / ratio }
								lockAspectRatio
								handlerClasses={ {
									topRight: 'wp-block-image__resize-handler-top-right',
									bottomRight: 'wp-block-image__resize-handler-bottom-right',
									topLeft: 'wp-block-image__resize-handler-top-left',
									bottomLeft: 'wp-block-image__resize-handler-bottom-left',
								} }
								enable={ { top: false, right: true, bottom: false, left: false, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true } }
								onResize={ ( event, direction, elt ) => {
									setAttributes( {
										width: elt.clientWidth,
										height: elt.clientHeight,
									} );
								} }
							>
								{ img }
							</ResizableBox>
						);
					} }
				</ImageSize>
				{ ( caption && caption.length > 0 ) || !! focus ? (
					<Editable
						tagName="figcaption"
						placeholder={ __( 'Write caption…' ) }
						value={ caption }
						focus={ focus && focus.editable === 'caption' ? focus : undefined }
						onFocus={ focusCaption }
						onChange={ ( value ) => setAttributes( { caption: value } ) }
						inlineToolbar
					/>
				) : null }
			</figure>,
		];
		/* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/onclick-has-role, jsx-a11y/click-events-have-key-events */
	}
}

export default flowRight( [
	withEditorSettings(),
	withAPIData( ( props ) => {
		const { id } = props.attributes;
		if ( ! id ) {
			return {};
		}

		return {
			image: `/wp/v2/media/${ id }`,
		};
	} ),
] )( ImageBlock );
