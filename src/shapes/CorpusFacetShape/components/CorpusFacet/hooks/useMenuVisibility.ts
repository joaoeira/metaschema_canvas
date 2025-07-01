import { useMachine } from "@xstate/react";
import { useCallback, useMemo } from "react";
import { type Editor, useEditor } from "tldraw";
import { assign, fromCallback, setup } from "xstate";

const HIDE_VISIBILITY_TIMEOUT = 16;
const SHOW_VISIBILITY_TIMEOUT = 16;

type PositionCoords = {
	x: number;
	y: number;
};

type MenuVisibilityContext = {
	position: PositionCoords;
	nextPosition: PositionCoords;
	isVisible: boolean;
	isInteractive: boolean;
};

type MenuVisibilityEvent =
	| { type: "SHOW" }
	| { type: "HIDE"; immediate?: boolean }
	| { type: "MOVE"; x: number; y: number }
	| { type: "TIMEOUT_COMPLETE" };

const createTimerActor = (editor: Editor, duration: number) =>
	fromCallback(({ sendBack }) => {
		const timeoutId = editor.timers.setTimeout(() => {
			sendBack({ type: "TIMEOUT_COMPLETE" });
		}, duration);

		return () => {
			clearTimeout(timeoutId);
		};
	});

const createMenuVisibilityMachine = (editor: Editor) =>
	setup({
		types: {
			context: {} as MenuVisibilityContext,
			events: {} as MenuVisibilityEvent,
		},
		actors: {
			showTimer: createTimerActor(editor, SHOW_VISIBILITY_TIMEOUT),
			hideTimer: createTimerActor(editor, HIDE_VISIBILITY_TIMEOUT),
		},
	}).createMachine({
		id: "menuVisibility",
		initial: "hidden",
		context: {
			position: { x: -1000, y: -1000 },
			nextPosition: { x: -1000, y: -1000 },
			isVisible: false,
			isInteractive: false,
		} as MenuVisibilityContext,
		states: {
			hidden: {
				entry: assign({
					isVisible: false,
					isInteractive: false,
				}),
				on: {
					SHOW: {
						target: "showing",
					},
					MOVE: {
						actions: assign({
							nextPosition: ({ event }) => ({ x: event.x, y: event.y }),
						}),
					},
				},
			},
			showing: {
				invoke: {
					id: "showTimer",
					src: "showTimer",
					onDone: {
						target: "shown",
						actions: assign({
							position: ({ context }) => context.nextPosition,
							isVisible: true,
							isInteractive: true,
						}),
					},
				},
				on: {
					TIMEOUT_COMPLETE: {
						target: "shown",
						actions: assign({
							position: ({ context }) => context.nextPosition,
							isVisible: true,
							isInteractive: true,
						}),
					},
					HIDE: {
						target: "hidden",
					},
					MOVE: {
						actions: assign({
							nextPosition: ({ event }) => ({ x: event.x, y: event.y }),
						}),
					},
				},
			},
			shown: {
				entry: assign({
					isVisible: true,
					isInteractive: true,
				}),
				on: {
					HIDE: [
						{
							guard: ({ event }) => event.immediate === true,
							target: "hidden",
						},
						{
							target: "hiding",
							actions: assign({
								isInteractive: false,
							}),
						},
					],
					MOVE: {
						actions: assign({
							nextPosition: ({ event }) => ({ x: event.x, y: event.y }),
							position: ({ event }) => ({ x: event.x, y: event.y }),
						}),
					},
				},
			},
			hiding: {
				entry: assign({
					isInteractive: false,
				}),
				invoke: {
					id: "hideTimer",
					src: "hideTimer",
					onDone: {
						target: "hidden",
					},
				},
				on: {
					TIMEOUT_COMPLETE: {
						target: "hidden",
					},
					SHOW: {
						target: "shown",
						actions: assign({
							isInteractive: true,
							position: ({ context }) => context.nextPosition,
						}),
					},
					MOVE: {
						actions: assign({
							nextPosition: ({ event }) => ({ x: event.x, y: event.y }),
						}),
					},
				},
			},
		},
	});

type MenuVisibilityState = {
	isVisible: boolean;
	isInteractive: boolean;
	show: () => void;
	hide: (immediate?: boolean) => void;
	move: (x: number, y: number) => void;
	position: PositionCoords;
};

export function useMenuVisibility(): MenuVisibilityState {
	const editor = useEditor();

	const machine = useMemo(() => createMenuVisibilityMachine(editor), [editor]);

	const [state, send] = useMachine(machine);

	const show = useCallback(() => {
		send({ type: "SHOW" });
	}, [send]);

	const hide = useCallback(
		(immediate = false) => {
			send({ type: "HIDE", immediate });
		},
		[send],
	);

	const move = useCallback(
		(x: number, y: number) => {
			send({ type: "MOVE", x, y });
		},
		[send],
	);

	return {
		isVisible: state.context.isVisible,
		isInteractive: state.context.isInteractive,
		position: state.context.position,
		show,
		hide,
		move,
	};
}
