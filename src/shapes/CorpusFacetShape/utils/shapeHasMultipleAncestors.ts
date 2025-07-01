import type { Editor, TLArrowBinding } from "tldraw";
import { type CorpusFacetShape, isCorpusFacetShape } from "../corpus-facet";

export function shapeHasMultipleAncestors(
	editor: Editor,
	corpusFacet: CorpusFacetShape,
): boolean {
	// Get all bindings connected to this corpus facet
	const bindings = editor.getBindingsInvolvingShape(corpusFacet.id, "arrow");

	if (!bindings.length) {
		return false;
	}

	// Find arrow-to-corpusFacet bindings (arrows pointing TO this corpusFacet)
	const incomingBindings = bindings.filter(
		(binding) => binding.toId === corpusFacet.id,
	);

	if (incomingBindings.length < 2) {
		return false;
	}

	let ancestorCount = 0;

	// For each incoming binding, find the arrow and then find what's on the other end
	for (const binding of incomingBindings) {
		const arrowId = binding.fromId;

		// Get all bindings for this arrow to find its source
		const arrowBindings = editor.getBindingsInvolvingShape<TLArrowBinding>(
			arrowId,
			"arrow",
		);

		// Find the other shape this arrow is connected to (its source)
		// This should be a binding where the arrow is the fromId and something else is the toId
		// and the terminal prop is not "end"
		const sourceBindings = arrowBindings.filter(
			(arrowBinding) =>
				// This binding connects FROM something TO our arrow
				arrowBinding.fromId === arrowId &&
				// And that something is not our current node
				arrowBinding.toId !== corpusFacet.id &&
				arrowBinding.props.terminal !== "end",
		);

		for (const sourceBinding of sourceBindings) {
			const potentialAncestorId = sourceBinding.toId;

			// Prevent self-referential bindings
			if (potentialAncestorId === corpusFacet.id) {
				continue;
			}

			const potentialAncestor = editor.getShape(potentialAncestorId);

			if (
				potentialAncestor &&
				isCorpusFacetShape(potentialAncestor) &&
				potentialAncestor.id !== corpusFacet.id
			) {
				ancestorCount++;

				// Early return if we've found multiple ancestors
				if (ancestorCount >= 2) {
					return true;
				}
			}
		}
	}

	return ancestorCount >= 2;
}
