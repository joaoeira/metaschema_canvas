import {
  BaseBoxShapeUtil,
  type Geometry2d,
  HTMLContainer,
  Rectangle2d,
} from "tldraw";
import { CorpusFacet } from "./components/CorpusFacet/CorpusFacet";
import {
  CORPUS_FACET_SHAPE_TYPE,
  type CorpusFacetShape,
  corpusFacetShapeProps,
} from "./corpus-facet";

export class CorpusFacetShapeUtil extends BaseBoxShapeUtil<CorpusFacetShape> {
  static override type = CORPUS_FACET_SHAPE_TYPE;
  static props = corpusFacetShapeProps;

  override getDefaultProps(): CorpusFacetShape["props"] {
    return {
      instructions: "",
      data: [],
      w: 100,
      h: 100,
    };
  }

  override getGeometry(shape: CorpusFacetShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override component(shape: CorpusFacetShape) {
    return (
      <HTMLContainer
        style={{ pointerEvents: "all" }}
        data-shape-type={CORPUS_FACET_SHAPE_TYPE}
      >
        <CorpusFacet shape={shape} />
      </HTMLContainer>
    );
  }

  override indicator(shape: CorpusFacetShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
