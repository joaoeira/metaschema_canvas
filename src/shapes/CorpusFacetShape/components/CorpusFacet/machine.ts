import { Effect } from "effect";
import { assign, fromCallback, setup } from "xstate";
import { AIService, AIServiceLive } from "../../../../services/ai/ai";
import type { ExtendedPaper } from "../../../../types/Paper";

type CorpusFacetContext = {
	sourceData: ExtendedPaper[] | null;
	instructions: string | null;
	data: ExtendedPaper[] | null;
	schemaFields: ReadonlyArray<string> | null;
	callbacks: {
		onDataReceived: (data: ExtendedPaper[]) => void;
	};
};

type CorpusFacetInput = {
	sourceData: ExtendedPaper[] | null;
	instructions: string;
	data: ExtendedPaper[] | null;
	callbacks: {
		onDataReceived: (data: ExtendedPaper[]) => void;
	};
};

type CorpusFacetEvent =
	| { type: "RETRY" }
	| { type: "SET_INSTRUCTIONS"; instructions: string }
	| { type: "SET_SOURCE_DATA"; sourceData: ExtendedPaper[] | null }
	| { type: "ACTOR.DATA_CHUNK_RECEIVED"; data: ExtendedPaper[] }
	| { type: "ACTOR.SCHEMA_GENERATED"; schemaFields: ReadonlyArray<string> }
	| { type: "ACTOR.DATA_RECEIVED"; data: ExtendedPaper[] }
	| { type: "ACTOR.ERROR" };

type CallbackActorEvents = Extract<
	CorpusFacetEvent,
	{ type: `ACTOR.${string}` }
>;

export const machine = setup({
	types: {
		context: {
			sourceData: null,
			instructions: null,
			data: null,
			partialData: null,
			schemaFields: null,
			callbacks: {
				onDataReceived: () => {},
			},
		} as CorpusFacetContext,
		input: {} as CorpusFacetInput,
		events: {} as CorpusFacetEvent,
	},
	actors: {
		getData: fromCallback(
			({
				input,
				sendBack,
			}: {
				input: {
					sourceData: ExtendedPaper[];
					instructions: string;
				};
				sendBack: (event: CallbackActorEvents) => void;
			}) => {
				Effect.runPromise(
					Effect.gen(function* () {
						if (!input.sourceData || !input.instructions) {
							return yield* Effect.fail(new Error("Missing required data"));
						}

						const aiService = yield* AIService;
						return yield* aiService
							.transformData(input.sourceData, input.instructions, {
								onDataChunkReceived: (data: ExtendedPaper[]) => {
									sendBack({
										type: "ACTOR.DATA_CHUNK_RECEIVED",
										data,
									});
								},
								onSchemaGenerated: (schemaFields: ReadonlyArray<string>) => {
									sendBack({
										type: "ACTOR.SCHEMA_GENERATED",
										schemaFields,
									});
								},
							})
							.pipe(
								Effect.tapError((error) => {
									console.error(error);
									return Effect.succeed(null);
								}),
							);
					}).pipe(Effect.provide(AIServiceLive)),
				)
					.then((results) => {
						sendBack({ type: "ACTOR.DATA_RECEIVED", data: results });
					})
					.catch(() => {
						sendBack({ type: "ACTOR.ERROR" });
					});

				return () => {};
			},
		),
	},
	guards: {
		"has data": ({ context }) => !!context.data && context.data.length > 0,
		"has source data and instruction": ({ context }) =>
			!!context.sourceData && !!context.instructions,
	},
}).createMachine({
	context: ({ input }) => {
		return {
			sourceData: input.sourceData,
			instructions: input.instructions,
			data: input.data,
			partialData: null,
			schemaFields: null,
			callbacks: {
				onDataReceived: (data: ExtendedPaper[]) => {
					input.callbacks.onDataReceived(data);
				},
			},
		};
	},
	id: "CorpusFacetMachine",
	initial: "init",
	states: {
		init: {
			on: {
				SET_INSTRUCTIONS: {
					actions: assign({
						instructions: ({ event }) => event.instructions,
					}),
				},
				SET_SOURCE_DATA: {
					actions: assign({
						sourceData: ({ event }) => event.sourceData,
					}),
				},
			},
			always: [
				{
					target: "done",
					guard: {
						type: "has data",
					},
				},
				{
					target: "getting data",
					guard: {
						type: "has source data and instruction",
					},
				},
			],
		},
		done: {
			type: "final",
		},
		"getting data": {
			invoke: {
				input: ({ context }) => {
					if (!context.sourceData || !context.instructions) {
						throw new Error("Missing required data");
					}

					return {
						sourceData: context.sourceData as ExtendedPaper[],
						instructions: context.instructions as string,
					};
				},
				onError: {
					target: "error",
				},
				src: "getData",
			},
			on: {
				"ACTOR.DATA_CHUNK_RECEIVED": {
					actions: assign({
						data: ({ event, context }) => [
							...(context.data ?? []),
							...event.data,
						],
					}),
				},
				"ACTOR.SCHEMA_GENERATED": {
					actions: assign({
						schemaFields: ({ event }) => event.schemaFields,
					}),
				},
				"ACTOR.DATA_RECEIVED": {
					target: "done",
					actions: assign({
						data: ({ event, context }) => {
							if (context.callbacks.onDataReceived) {
								context.callbacks.onDataReceived(event.data);
							}

							return event.data;
						},
					}),
				},
				"ACTOR.ERROR": {
					target: "error",
				},
			},
		},
		error: {
			on: {
				RETRY: {
					target: "init",
				},
			},
		},
	},
});
