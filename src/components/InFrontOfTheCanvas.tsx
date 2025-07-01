import { memo, useEffect, useRef, useState } from "react";
import {
  stopEventPropagation,
  type TLEventInfo,
  useAtom,
  useEditor,
  useQuickReactor,
  useValue,
  type VecLike,
} from "tldraw";
import { useMenuVisibility } from "../shapes/CorpusFacetShape/components/CorpusFacet/hooks/useMenuVisibility";
import { isCorpusFacetShape } from "../shapes/CorpusFacetShape/corpus-facet";
import { positionStrategies } from "../shapes/CorpusFacetShape/utils/positionStrategies";
import ShapeContextualMenu from "./ShapeContextualMenu";

export default memo(function InFrontOfTheCanvas() {
  const editor = useEditor();
  const menuRef = useRef<HTMLDivElement>(null);

  const [cursorPagePoint, setCursorPagePoint] = useState<VecLike>(
    editor.inputs.currentPagePoint
  ); // used to force the menu position to update when the cursor moves

  // We use an atom to force the menu position to update
  const forcePositionUpdateAtom = useAtom("force menu position update", 0);

  useEffect(() => {
    const handlePointerMove = (event: TLEventInfo) => {
      if (event.type === "pointer" && event.name === "pointer_move") {
        setCursorPagePoint(event.point);
      }
    };

    editor.on("event", handlePointerMove);
    return () => {
      editor.off("event", handlePointerMove);
    };
  }, [editor]);

  const { isVisible, isInteractive, hide, show, move, position } =
    useMenuVisibility();

  const shapeInfo = useValue(
    "shape at cursor",
    () => {
      const selectedShapes = editor.getSelectedShapes();

      // Only proceed if there's exactly one valid selected shape
      if (selectedShapes.length !== 1) return null;
      const selectedShape = selectedShapes[0];

      // Skip if no bounds available
      const bounds = editor.getShapePageBounds(selectedShape);
      if (!bounds) return null;

      if (!isCorpusFacetShape(selectedShape)) return null;

      // Skip if no data
      if (
        selectedShape.props.data === null ||
        selectedShape.props.data.length === 0
      )
        return null;

      return {
        shape: selectedShape,
        bounds,
      };
    },
    [editor, cursorPagePoint, isVisible]
  );

  const cameraState = useValue("camera state", () => editor.getCameraState(), [
    editor,
  ]);

  useQuickReactor(
    "menu position",
    function updateMenuPositionAndDisplay() {
      const menuElement = menuRef.current;

      if (!menuElement || !shapeInfo) {
        hide();
        return;
      }

      // Capture/force update when camera moves or selection changes
      editor.getCamera();
      forcePositionUpdateAtom.get();

      const position = positionStrategies.cursorSidePositioning(
        editor,
        menuElement,
        shapeInfo.shape
      );

      if (!position) {
        hide();
        return;
      }

      move(position.x, position.y);

      if (cameraState !== "moving") {
        show();
      }
    },
    [editor, shapeInfo, forcePositionUpdateAtom, cameraState]
  );

  useEffect(() => {
    const elm = menuRef.current;
    if (!elm) return;
    elm.dataset.isVisible = `${isVisible}`;
    elm.dataset.interactive = `${isInteractive}`;
  }, [isVisible, isInteractive]);

  return (
    <div
      ref={menuRef}
      className="tlui-contextual-menu"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: `translate(${position.x}px, ${position.y}px)`,
        pointerEvents: isInteractive ? "all" : "none",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.05s ease",
        zIndex: 1000,
      }}
      onPointerDown={stopEventPropagation}
    >
      <ShapeContextualMenu
        shape={shapeInfo?.shape}
        bounds={shapeInfo?.bounds}
        menuElement={menuRef.current}
      />
    </div>
  );
});
