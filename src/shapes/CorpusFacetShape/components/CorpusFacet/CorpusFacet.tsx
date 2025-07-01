import { useActor } from "@xstate/react";
import { useRef } from "react";
import { useEditor, useValue } from "tldraw";
import {
  CORPUS_FACET_SHAPE_TYPE,
  type CorpusFacetShape,
} from "../../corpus-facet";
import { findImmediateAncestor } from "../../utils/findImmediateAncestor";
import { shapeHasMultipleAncestors } from "../../utils/shapeHasMultipleAncestors";
import { VirtualizedTable } from "./components/VirtualizedTable";
import { machine } from "./machine";

export function CorpusFacet({ shape }: { shape: CorpusFacetShape }) {
  const editor = useEditor();
  const instructionsInputRef = useRef<HTMLInputElement>(null);

  const [state, send] = useActor(machine, {
    input: {
      sourceData: null,
      instructions: shape.props.instructions,
      data: shape.props.data ?? null,
      callbacks: {
        onDataReceived: (data) => {
          editor.updateShape<CorpusFacetShape>({
            id: shape.id,
            type: CORPUS_FACET_SHAPE_TYPE,
            props: {
              data,
            },
          });
        },
      },
    },
  });

  useValue(
    "immediate ancestor",
    () => {
      const ancestor = findImmediateAncestor(editor, shape);
      if (state.status === "done") return;
      if (!ancestor) {
        send({
          type: "SET_SOURCE_DATA",
          sourceData: null,
        });
      } else if (ancestor.props.data) {
        send({
          type: "SET_SOURCE_DATA",
          sourceData: ancestor.props.data,
        });
        return ancestor;
      }
    },
    [editor, shape, send]
  );

  const hasMultipleAncestors = useValue(
    "has multiple ancestors",
    () => shapeHasMultipleAncestors(editor, shape) ?? false,
    [editor, shape]
  );

  const data = state.context.data;
  const schemaFields = state.context.schemaFields;

  if (state.matches("init")) {
    const hasAncestorData =
      !!state.context.sourceData && state.context.sourceData.length > 0;

    return (
      <div className="h-full w-full border border-slate-300 rounded overflow-hidden bg-gray-50 shadow-xs">
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Setup</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Enter instructions to transform and filter your data
              </p>
            </div>
          </div>

          <div className="w-full max-w-3/4 space-y-4">
            <div className="space-y-2">
              <input
                id="instructions-input"
                type="text"
                defaultValue={shape.props.instructions}
                ref={instructionsInputRef}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                placeholder="e.g., Only include papers about artificial intelligence, and add a column with the method used."
              />
            </div>

            <button
              type="button"
              disabled={!hasAncestorData || hasMultipleAncestors}
              onPointerDown={() => {
                const value = instructionsInputRef.current?.value;
                if (!value) return;
                send({
                  type: "SET_INSTRUCTIONS",
                  instructions: value,
                });
              }}
              className={`w-full font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none ${
                hasAncestorData && !hasMultipleAncestors
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {(() => {
                if (hasMultipleAncestors) {
                  return "Can only be connected to one data source";
                }
                if (hasAncestorData) {
                  return "Process Data";
                }
                return "Connect to data source first";
              })()}
            </button>

            {!hasAncestorData && (
              <div className="flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Info</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Draw an arrow from a table to this component to connect it to
                  a data source.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.matches("getting data") && !schemaFields?.length) {
    return (
      <div
        className="border border-slate-300 rounded overflow-hidden bg-gray-50 shadow-xs"
        style={{ height: "100%", width: "100%" }}
      >
        {state.context.instructions && (
          <div className="flex justify-start items-center p-2 bg-gray-100 border-b border-slate-300">
            <div className="w-3 h-3 border border-gray-400 border-t-gray-600 rounded-full animate-spin mr-2"></div>
            <p className="text-xs font-bold text-gray-600">
              {state.context.instructions}
            </p>
          </div>
        )}
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
          <div className="relative">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Processing data...
            </p>
            <p className="text-xs text-gray-500">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.matches("error") || !data) {
    return (
      <div
        className="border border-slate-300 rounded overflow-hidden bg-gray-50 shadow-xs"
        style={{ height: "100%", width: "100%" }}
      >
        {state.context.instructions && (
          <div className="flex justify-start p-2 bg-gray-100 border-b border-slate-300">
            <p className="text-xs font-bold text-gray-600">
              {state.context.instructions}
            </p>
          </div>
        )}
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
          <div className="relative">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Error</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Something went wrong
            </p>
            <p className="text-xs text-gray-500">Unable to process the data</p>
          </div>
        </div>
      </div>
    );
  }

  // Show table once we have schema fields, even if data is still loading
  if (schemaFields?.length || data?.length > 0) {
    const isLoading = state.matches("getting data");

    return (
      <div
        className="border border-slate-300 rounded overflow-hidden"
        style={{ height: "100%", width: "100%" }}
        onWheelCapture={(e) => {
          if (!editor.inputs.isDragging && !editor.inputs.isPanning) {
            // enable scrolling inside the container without triggering editor events
            e.stopPropagation();
          }
        }}
      >
        {state.context.instructions && (
          <div className="flex justify-start items-center p-2 bg-gray-100 border-b border-slate-300">
            {isLoading && (
              <div className="w-3 h-3 border border-gray-400 border-t-gray-600 rounded-full animate-spin mr-2"></div>
            )}
            <p className="text-xs font-bold text-gray-600">
              {state.context.instructions}
            </p>
          </div>
        )}
        <VirtualizedTable
          data={data}
          isLoading={isLoading}
          schemaFields={schemaFields}
        />
      </div>
    );
  }

  return (
    <div
      className="border border-slate-300 rounded overflow-hidden bg-gray-50 shadow-xs"
      style={{ height: "100%", width: "100%" }}
    >
      <div className="flex flex-col items-center justify-center h-full p-6 space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">No data available</p>
        </div>
      </div>
    </div>
  );
}
