import { clamp, type Editor, type TLShape } from "tldraw";

function verticalCenterPositioning(
	editor: Editor,
	menuElement: HTMLElement,
	shape: TLShape,
) {
	// Get shape bounds in page coordinates
	const bounds = editor.getShapePageBounds(shape);
	if (!bounds) return null;

	// Get container and its bounds relative to viewport
	const container = editor.getContainer();
	if (!container) return null;
	const containerRect = container.getBoundingClientRect();

	// Convert shape page bounds to viewport screen coordinates
	const topLeftViewport = editor.pageToScreen({ x: bounds.x, y: bounds.y });
	const bottomRightViewport = editor.pageToScreen({
		x: bounds.x + bounds.width,
		y: bounds.y + bounds.height,
	});

	// Shape bounds in viewport screen coordinates
	const shapeViewportBounds = {
		x: topLeftViewport.x,
		y: topLeftViewport.y,
		width: bottomRightViewport.x - topLeftViewport.x,
		height: bottomRightViewport.y - topLeftViewport.y,
	};

	const menuHeight = menuElement.offsetHeight;
	const menuWidth = menuElement.offsetWidth;
	if (!menuWidth || !menuHeight) return null;

	// Calculate the center X position relative to the viewport
	const centerXViewport =
		shapeViewportBounds.x + shapeViewportBounds.width / 2 - menuWidth / 2;

	// Initial desired Y: Position above the shape in viewport coordinates
	let desiredYViewport = shapeViewportBounds.y - MENU_GAP - menuHeight;

	// Define clamping boundaries based on the visible viewport area
	const viewportScreenBounds = editor.getViewportScreenBounds();
	const minX = viewportScreenBounds.x + SCREEN_MARGIN;
	const maxX =
		viewportScreenBounds.x + viewportScreenBounds.w - menuWidth - SCREEN_MARGIN;
	const minY = viewportScreenBounds.y + SCREEN_MARGIN;
	const maxY =
		viewportScreenBounds.y +
		viewportScreenBounds.h -
		menuHeight -
		SCREEN_MARGIN;

	// If positioning above goes outside viewport, position below instead
	if (desiredYViewport < minY) {
		desiredYViewport =
			shapeViewportBounds.y + shapeViewportBounds.height + MENU_GAP;
	}

	// Clamp positions to keep the menu within the viewport's visible area
	const clampedXViewport = clamp(centerXViewport, minX, maxX);
	const clampedYViewport = clamp(desiredYViewport, minY, maxY);

	// Convert final viewport coordinates to be relative to the tldraw container
	const finalXRelativeToContainer = clampedXViewport - containerRect.left;
	const finalYRelativeToContainer = clampedYViewport - containerRect.top;

	return {
		x: Math.round(finalXRelativeToContainer),
		y: Math.round(finalYRelativeToContainer),
	};
}

export type PositionCoords = {
	x: number;
	y: number;
};

const MENU_GAP = 8; // Gap between the menu and the shape
const SCREEN_MARGIN = 16; // Minimum margin from the viewport edges

/**
 * Calculates the position for the menu, placing it beside the shape
 * based on cursor position, relative to the tldraw container element.
 */
function cursorSidePositioning(
	editor: Editor,
	menuElement: HTMLElement,
	shape: TLShape,
): PositionCoords | null {
	const bounds = editor.getShapePageBounds(shape);
	if (!bounds) return null;

	const container = editor.getContainer();
	if (!container) return null;
	const containerRect = container.getBoundingClientRect(); // Get container position relative to viewport

	// Convert shape page bounds to viewport screen coordinates
	const topLeftViewport = editor.pageToScreen({ x: bounds.x, y: bounds.y });
	const bottomRightViewport = editor.pageToScreen({
		x: bounds.x + bounds.width,
		y: bounds.y + bounds.height,
	});

	// Shape bounds in viewport screen coordinates
	const shapeViewportBounds = {
		x: topLeftViewport.x,
		y: topLeftViewport.y,
		width: bottomRightViewport.x - topLeftViewport.x,
		height: bottomRightViewport.y - topLeftViewport.y,
	};

	const menuWidth = menuElement.offsetWidth;
	const menuHeight = menuElement.offsetHeight;
	if (!menuWidth || !menuHeight) return null;

	const viewportScreenBounds = editor.getViewportScreenBounds(); // Viewport bounds relative to the browser window

	const shapeCenterXViewport =
		shapeViewportBounds.x + shapeViewportBounds.width / 2;
	const pointerViewportPosition = editor.inputs.currentScreenPoint; // Cursor position in viewport coordinates

	// Decide initial placement side based on cursor position relative to shape center
	const placeOnRight = pointerViewportPosition.x >= shapeCenterXViewport;

	// Calculate initial desired X position (viewport coordinates)
	let desiredXViewport = placeOnRight
		? shapeViewportBounds.x + shapeViewportBounds.width + MENU_GAP // Place right
		: shapeViewportBounds.x - menuWidth - MENU_GAP; // Place left

	// Define clamping boundaries based on the visible viewport area, accounting for margins
	const minX = viewportScreenBounds.x + SCREEN_MARGIN;
	const maxX =
		viewportScreenBounds.x + viewportScreenBounds.w - menuWidth - SCREEN_MARGIN;
	const minY = viewportScreenBounds.y + SCREEN_MARGIN;
	const maxY =
		viewportScreenBounds.y +
		viewportScreenBounds.h -
		menuHeight -
		SCREEN_MARGIN;

	// Check if the initial placement fits within the viewport; if not, try the other side
	if (placeOnRight && desiredXViewport > maxX) {
		// Won't fit on right, try left
		desiredXViewport = shapeViewportBounds.x - menuWidth - MENU_GAP;
	} else if (!placeOnRight && desiredXViewport < minX) {
		// Won't fit on left, try right
		desiredXViewport =
			shapeViewportBounds.x + shapeViewportBounds.width + MENU_GAP;
	}

	// Calculate desired Y position (centered vertically with the shape, in viewport coordinates)
	const desiredYViewport =
		shapeViewportBounds.y + shapeViewportBounds.height / 2 - menuHeight / 2;

	// Clamp final positions to ensure the menu stays within the visible viewport area
	const clampedXViewport = clamp(desiredXViewport, minX, maxX);
	const clampedYViewport = clamp(desiredYViewport, minY, maxY);

	// Convert the final clamped viewport coordinates to be relative to the tldraw container element
	const finalXRelativeToContainer = clampedXViewport - containerRect.left;
	const finalYRelativeToContainer = clampedYViewport - containerRect.top;

	return {
		x: Math.round(finalXRelativeToContainer),
		y: Math.round(finalYRelativeToContainer),
	};
}

export const positionStrategies: Record<
	"verticalCenterPositioning" | "cursorSidePositioning",
	(
		editor: Editor,
		menuElement: HTMLElement,
		shape: TLShape,
	) => PositionCoords | null
> = {
	verticalCenterPositioning: verticalCenterPositioning,
	cursorSidePositioning: cursorSidePositioning,
};
