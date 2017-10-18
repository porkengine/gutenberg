/**
 * External dependencies
 */
import { includes } from 'lodash';

/**
 * Check whether the caret is horizontally at the edge of the container.
 *
 * @param  {Element} container Focusable element.
 * @param  {Boolean} isReverse Set to true to check left, false for right.
 * @return {Boolean}           True if at the edge, false if not.
 */
export function isHorizontalEdge( container, isReverse ) {
	if ( includes( [ 'INPUT', 'TEXTAREA' ], container.tagName ) ) {
		if ( container.selectionStart !== container.selectionEnd ) {
			return false;
		}

		if ( isReverse ) {
			return container.selectionStart === 0;
		}

		return container.value.length === container.selectionStart;
	}

	if ( ! container.isContentEditable ) {
		return true;
	}

	const selection = window.getSelection();
	const range = selection.rangeCount ? selection.getRangeAt( 0 ) : null;

	if ( ! range || ! range.collapsed ) {
		return false;
	}

	const position = isReverse ? 'start' : 'end';
	const order = isReverse ? 'first' : 'last';
	const offset = range[ `${ position }Offset` ];

	let node = range.startContainer;

	if ( isReverse && offset !== 0 ) {
		return false;
	}

	if ( ! isReverse && offset !== node.textContent.length ) {
		return false;
	}

	while ( node !== container ) {
		const parentNode = node.parentNode;

		if ( parentNode[ `${ order }Child` ] !== node ) {
			return false;
		}

		node = parentNode;
	}

	return true;
}

/**
 * Gets vertical edge information:
 *   * isEdge: Whether the caret is at the vertical edge of the container.
 *   * rect: Dimensions of the caret when available.
 *
 * @param  {Element} container Focusable element.
 * @param  {Boolean} isReverse Set to true to check top, false for bottom.
 * @return {Object}            Vertical edge information.
 */
export function getVerticalEdge( container, isReverse ) {
	if ( includes( [ 'INPUT', 'TEXTAREA' ], container.tagName ) ) {
		return {
			isEdge: isHorizontalEdge( container, isReverse ),
		};
	}

	if ( ! container.isContentEditable ) {
		return { isEdge: true };
	}

	const selection = window.getSelection();
	const range = selection.rangeCount ? selection.getRangeAt( 0 ) : null;

	if ( ! range || ! range.collapsed ) {
		return { isEdge: false };
	}

	// Adjust for empty containers.
	const rangeRect =
		range.startContainer.nodeType === window.Node.ELEMENT_NODE
		? range.startContainer.getBoundingClientRect()
		: range.getClientRects()[ 0 ];

	if ( ! rangeRect ) {
		return { isEdge: false };
	}

	const buffer = rangeRect.height / 2;
	const editableRect = container.getBoundingClientRect();

	// Too low.
	if ( isReverse && rangeRect.top - buffer > editableRect.top ) {
		return {
			rect: rangeRect,
			isEdge: false,
		};
	}

	// Too high.
	if ( ! isReverse && rangeRect.bottom + buffer < editableRect.bottom ) {
		return {
			rect: rangeRect,
			isEdge: false,
		};
	}

	return {
		rect: rangeRect,
		isEdge: true,
	};
}

/**
 * Places the caret at start or end of a given element.
 *
 * @param {Element} container Focusable element.
 * @param {Boolean} isReverse True for end, false for start.
 */
export function placeCaretAtHorizontalEdge( container, isReverse ) {
	if ( includes( [ 'INPUT', 'TEXTAREA' ], container.tagName ) ) {
		container.focus();
		if ( isReverse ) {
			container.selectionStart = 0;
			container.selectionEnd = 0;
		} else {
			container.selectionStart = container.value.length;
			container.selectionEnd = container.value.length;
		}
		return;
	}

	if ( ! container.isContentEditable ) {
		container.focus();
		return;
	}

	// Content editables
	const range = document.createRange();
	range.selectNodeContents( container );
	range.collapse( isReverse );
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange( range );
	container.focus();
}

/**
 * Polyfill.
 * Get a collapsed range for a given point.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/caretRangeFromPoint
 *
 * @param  {Document} doc The document of the range.
 * @param  {Float}    x   Horizontal position within the current viewport.
 * @param  {Float}    y   Vertical position within the current viewport.
 * @return {?Range}       The best range for the given point.
 */
function caretRangeFromPoint( doc, x, y ) {
	if ( doc.caretRangeFromPoint ) {
		return doc.caretRangeFromPoint( x, y );
	}

	if ( ! doc.caretPositionFromPoint ) {
		return null;
	}

	const point = doc.caretPositionFromPoint( x, y );
	const range = doc.createRange();

	range.setStart( point.offsetNode, point.offset );
	range.collapse( true );

	return range;
}

/**
 * Places the caret at the top or bottom of a given element.
 *
 * @param {Element} container           Focusable element.
 * @param {Boolean} isReverse           True for bottom, false for top.
 * @param {DOMRect} [rect]              The rectangle to position the caret with.
 * @param {Boolean} [mayUseScroll=true] True to allow scrolling, false to disallow.
 */
export function placeCaretAtVerticalEdge( container, isReverse, rect, mayUseScroll = true ) {
	if ( ! rect || ! container.isContentEditable ) {
		placeCaretAtHorizontalEdge( container, isReverse );
		return;
	}

	const buffer = rect.height / 2;
	const editableRect = container.getBoundingClientRect();
	const x = rect.left + ( rect.width / 2 );
	const y = isReverse ? ( editableRect.bottom - buffer ) : ( editableRect.top + buffer );
	const selection = window.getSelection();

	// Temporary high z-index above toolbar.
	// This is preferred over getting the toolbar node and set styles.
	container.style.zIndex = '10000';

	const range = caretRangeFromPoint( document, x, y );

	container.style.zIndex = null;

	if ( ! range || ! container.contains( range.startContainer ) ) {
		if ( mayUseScroll ) {
			// Might be out of view.
			// Easier than attempting to calculate manually.
			container.scrollIntoView( isReverse );
			placeCaretAtVerticalEdge( container, isReverse, rect, false );
			return;
		}

		placeCaretAtHorizontalEdge( container, isReverse );
		return;
	}

	selection.removeAllRanges();
	selection.addRange( range );
	container.focus();
	// Editable was already focussed, it goes back to old range...
	// This fixes it.
	selection.removeAllRanges();
	selection.addRange( range );
}

/**
 * Checks whether the user is on MacOS or not
 *
 * @return {Boolean}           Is Mac or Not
 */
export function isMac() {
	return window.navigator.platform.toLowerCase().indexOf( 'mac' ) !== -1;
}
