import { type RecordProps, T, type TLBaseShape, type TLRecord } from "tldraw";
import type { ExtendedPaper } from "../../types/Paper";

export const CORPUS_FACET_SHAPE_TYPE = "corpusFacet" as const;
export const CORPUS_FACET_TOOL_ID = "corpusFacetTool" as const;

export type CorpusFacetShapeProps = {
	w: number;
	h: number;
	instructions: string;
	data: ExtendedPaper[] | null;
};

export type CorpusFacetShape = TLBaseShape<
	typeof CORPUS_FACET_SHAPE_TYPE,
	CorpusFacetShapeProps
>;

export const corpusFacetShapeProps = {
	w: T.number,
	h: T.number,
	instructions: T.string,
	data: T.nullable(T.arrayOf(T.any)),
} satisfies RecordProps<CorpusFacetShape>;

export function isCorpusFacetShape(shape: TLRecord): shape is CorpusFacetShape {
	if (!("type" in shape)) {
		return false;
	}
	return shape.type === CORPUS_FACET_SHAPE_TYPE;
}
