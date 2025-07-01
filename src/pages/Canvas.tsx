import { useMemo, useRef } from "react";
import {
  defaultShapeUtils,
  type Editor,
  type TLArrowBinding,
  type TLUnknownBinding,
  Tldraw,
} from "tldraw";
import "tldraw/tldraw.css";
import { ApiKeyForm } from "../components/ApiKeyForm/ApiKeyForm";
import { useApiKey } from "../components/ApiKeyForm/hooks/useApiKey";
import InFrontOfTheCanvas from "../components/InFrontOfTheCanvas";
import { papers } from "../mock/data";
import { CorpusFacetShapeUtil } from "../shapes/CorpusFacetShape/CorpusFacetShapeUtil";
import {
  CORPUS_FACET_SHAPE_TYPE,
  type CorpusFacetShape,
  isCorpusFacetShape,
} from "../shapes/CorpusFacetShape/corpus-facet";

/**
 * Deletes all arrow shapes that have a binding involving the given shape.
 * It will delete arrows pointing to the corpus facet and away from it.
 */
export function deleteArrowsAfterCorpusFacetDeletion(
  editor: Editor,
  binding: TLArrowBinding
) {
  if (binding.type !== "arrow") return; // safety check

  const fromShape = editor.getShape(binding.fromId);
  const toShape = editor.getShape(binding.toId);

  if (fromShape && isCorpusFacetShape(fromShape)) {
    if (toShape && toShape.type === "arrow") {
      editor.deleteShape(binding.fromId);
    }

    return;
  }

  if (toShape && isCorpusFacetShape(toShape)) {
    if (fromShape && fromShape.type === "arrow") {
      editor.deleteShape(binding.fromId);
    }

    return;
  }
}

function Canvas() {
  const hasCreatedInitialCorpusFacet = useRef(false);
  const shapeUtils = useMemo(
    () => [...defaultShapeUtils, CorpusFacetShapeUtil],
    []
  );

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw
        shapeUtils={shapeUtils}
        components={{
          InFrontOfTheCanvas,
        }}
        onMount={(editor) => {
          if (!hasCreatedInitialCorpusFacet.current) {
            editor.createShape<CorpusFacetShape>({
              type: CORPUS_FACET_SHAPE_TYPE,
              props: {
                w: 640,
                h: 480,
                instructions: "",
                data: papers,
              },
            });

            hasCreatedInitialCorpusFacet.current = true;
          }

          const arrowBindingUtil = editor.getBindingUtil("arrow");
          function isArrowBinding(
            binding: TLUnknownBinding
          ): binding is TLArrowBinding {
            return binding.type === "arrow";
          }

          // Didn't look too much into why but its enough to do the ToShape and not necessary to also add the FromShape
          // at least to for now, to get the desired behavior
          arrowBindingUtil.onBeforeDeleteToShape = ({ binding }) => {
            if (!isArrowBinding(binding)) return;
            deleteArrowsAfterCorpusFacetDeletion(editor, binding);
          };
        }}
      />
    </div>
  );
}

export default function App() {
  const {
    apiKey,
    isValidated,
    isValidating,
    error,
    updateApiKey,
    validateAndSaveApiKey,
  } = useApiKey();

  if (!isValidated) {
    return (
      <ApiKeyForm
        apiKey={apiKey}
        error={error}
        isValidating={isValidating}
        onApiKeyChange={updateApiKey}
        onSubmit={validateAndSaveApiKey}
      />
    );
  }

  return <Canvas />;
}
