import { memo } from "react";
import {
  type Box,
  createShapeId,
  type Editor,
  type TLArrowShape,
  type TLShape,
  useEditor,
  type VecLike,
} from "tldraw";
import {
  CORPUS_FACET_SHAPE_TYPE,
  type CorpusFacetShape,
  isCorpusFacetShape,
} from "../shapes/CorpusFacetShape/corpus-facet";

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Plus icon</title>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function createDescendantCorpusFacetShape(
  editor: Editor,
  parentId: CorpusFacetShape["id"]
) {
  const arrowId = createShapeId();
  const descendantId = createShapeId();

  // we get the shape here rather than passing to make sure we get the latest state
  // e.g. if you pass the prop of a component then you won't get the latest position data
  const parent = editor.getShape(parentId);

  if (!parent || !isCorpusFacetShape(parent)) {
    throw new Error("Parent is not a corpus facet shape");
  }

  const mousePos = editor.inputs.currentPagePoint;

  const newShapePos: VecLike = {
    x: mousePos.x > parent.x ? mousePos.x + 100 : mousePos.x - 100,
    y: parent.y,
  };

  const descendant = editor
    .createShape<CorpusFacetShape>({
      type: CORPUS_FACET_SHAPE_TYPE,
      id: descendantId,
      x: newShapePos.x,
      y: newShapePos.y,
      props: {
        w: 640,
        h: 480,
        instructions: "",
        data: [],
      },
    })
    .createShape<TLArrowShape>({
      type: "arrow",
      id: arrowId,
      props: {
        arrowheadEnd: "arrow",
        arrowheadStart: "none",
        color: "black",
        dash: "solid",
        size: "s",
      },
    })
    .createBindings([
      {
        type: "arrow",
        fromId: arrowId,
        toId: parent.id,
        props: {
          terminal: "start",
        },
      },
      {
        type: "arrow",
        fromId: arrowId,
        toId: descendantId,
        props: {
          terminal: "end",
        },
      },
    ])
    .getShape(descendantId);

  if (!descendant) return;

  const bounds = editor.getShapePageBounds(descendant);
  if (!bounds) return;

  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };

  editor.select(descendantId).centerOnPoint(center);
}

export default memo(function ShapeContextualMenu({
  shape,
  bounds,
}: {
  shape?: TLShape;
  bounds?: Box;
  menuElement: HTMLDivElement | null;
}) {
  const editor = useEditor();
  const type = shape?.type;
  if (!type || !shape || !bounds) return null;

  if (!isCorpusFacetShape(shape)) return null;

  return (
    <button
      type="button"
      className="w-8 h-8 bg-stone-50 border border-stone-200 rounded flex items-center justify-center shadow-sm hover:bg-stone-100 transition-colors"
      onPointerDown={() => {
        createDescendantCorpusFacetShape(editor, shape.id);
      }}
    >
      <PlusIcon />
    </button>
  );
});
