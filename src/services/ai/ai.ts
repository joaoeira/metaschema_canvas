import { type AiError, AiLanguageModel } from "@effect/ai";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { FetchHttpClient } from "@effect/platform";
import {
	Array as Arr,
	Chunk,
	Config,
	type ConfigError,
	Context,
	Effect,
	ExecutionPlan,
	Layer,
	Redacted,
	Schedule,
	Schema,
	type SchemaAST,
	Stream,
} from "effect";

import type { ExtendedPaper } from "../../types/Paper";
import { SchemaSpec, toSchema } from "../../types/SchemaSpec";

function extractSchemaFields(
	schema: Schema.Schema<unknown>,
): ReadonlyArray<string> {
	const ast = schema.ast;

	if (ast._tag === "TypeLiteral") {
		return ast.propertySignatures.map(
			(prop: SchemaAST.PropertySignature) => String(prop.name),
			[],
		);
	}

	return [];
}

const AILayer = Layer.empty.pipe(
	Layer.provideMerge(
		OpenAiClient.layerConfig({
			apiKey: Config.succeed(
				Redacted.make(localStorage.getItem("OPENAI_API_KEY") ?? ""),
			),
		}),
	),
	Layer.provideMerge(FetchHttpClient.layer),
);

export class AIService extends Context.Tag("AIService")<
	AIService,
	{
		readonly transformData: (
			data: Array<ExtendedPaper>,
			instructions: string,
			callbacks?: {
				onSchemaGenerated?: (schemaFields: ReadonlyArray<string>) => void;
				onDataChunkReceived?: (data: ExtendedPaper[]) => void;
				onDataComplete?: (data: ExtendedPaper[]) => void;
			},
		) => Effect.Effect<
			ExtendedPaper[],
			ConfigError.ConfigError | AiError.AiError,
			never
		>;
	}
>() {}

const o3 = OpenAiLanguageModel.model("o3");
const gpt41 = OpenAiLanguageModel.model("gpt-4.1");

export const AIServiceLive = Layer.effect(
	AIService,
	Effect.gen(function* () {
		return {
			transformData: (
				data: Array<ExtendedPaper>,
				instructions: string,
				callbacks?: {
					onSchemaGenerated?: (schemaFields: ReadonlyArray<string>) => void;
					onDataChunkReceived?: (data: ExtendedPaper[]) => void;
					onDataComplete?: (data: ExtendedPaper[]) => void;
				},
			) =>
				Effect.gen(function* () {
					// Generate schema specification based on instructions
					const {
						value: { paperSchemaSpec },
					} = yield* Effect.gen(function* () {
						const model = yield* AiLanguageModel.AiLanguageModel;
						return yield* model.generateObject({
							prompt: `Spec out a object type that fulfills the following instructions:
							<instructions>
							${instructions}
							</instructions>

    The spec should be able to be filled out given the following data:
    - ${Object.keys(data[0]).join(`\n- `)}

    When analyzing the instructions, distinguish between:

    - Filtering/selection criteria (which subset of data to return) - these do not affect the schema
    - Output requirements (what information to include for each item) - these define additional schema fields

    Look for explicit output requirements indicated by phrases like 'include...', 'provide...', 'show...', 'add...', or 'with...' that specify information to be returned alongside the base data. These requirements should be added to the spec as additional fields, even when they appear embedded within filtering instructions

    In the event the instructions cannot be fulfilled partially or in full given the available data, omit the fields that cannot be fulfilled.
    Always return a spec that includes at least the title, plus whatever other fields are required for the spec. There is no need to include the fields from the original data that are not required for the spec.
    `,
							schema: Schema.Struct({ paperSchemaSpec: SchemaSpec }),
						});
					}).pipe(
						Effect.withExecutionPlan(
							ExecutionPlan.make({
								provide: o3,
								attempts: 3,
								schedule: Schedule.exponential("250 millis").pipe(
									Schedule.jittered,
								),
							}),
						),
						Effect.provide(AILayer),
					);

					const papersSchema = toSchema(paperSchemaSpec);

					if (callbacks && "onSchemaGenerated" in callbacks)
						yield* Effect.sync(() =>
							callbacks.onSchemaGenerated?.([
								...Object.keys(data[0]),
								...extractSchemaFields(papersSchema).filter(
									(field) => field !== "title", // title is already included in the original data
								),
							]),
						);

					const splitPapers = Arr.chunksOf(data, 20);

					const resultsChunk = yield* Stream.fromIterable(splitPapers).pipe(
						Stream.mapEffect(
							(p) =>
								Effect.gen(function* () {
									const {
										value: { papers: proposedPapers },
									} = yield* Effect.gen(function* () {
										const model = yield* AiLanguageModel.AiLanguageModel;
										return yield* model.generateObject({
											prompt: `You will be given a list of papers, a spec, and some instructions.
            Your task is to apply the spec to the papers and return the papers such that they fulfill the instructions.

						If a property from the spec is not present in the paper, write down 'N/A' for that property.

      Papers:

      ${p.map((paper) => `<paper>${JSON.stringify(paper)}</paper>`).join("\n")}

			Instructions:
			<instructions>
			${instructions}
			</instructions>
      `,
											schema: Schema.Struct({
												papers: Schema.Array(papersSchema),
											}),
										});
									}).pipe(
										Effect.withExecutionPlan(
											ExecutionPlan.make({
												provide: gpt41,
												attempts: 3,
												schedule: Schedule.exponential("250 millis").pipe(
													Schedule.jittered,
												),
											}),
										),
										Effect.provide(AILayer),
									);

									const results = yield* Effect.forEach(proposedPapers, (p) =>
										Effect.gen(function* () {
											const paper = yield* Effect.succeed(
												data.find((paper) => paper.title === p.title),
											);

											return {
												title: p.title,
												...paper,
												...p,
											} as ExtendedPaper;
										}),
									);

									if (callbacks && "onDataChunkReceived" in callbacks)
										yield* Effect.sync(() =>
											callbacks.onDataChunkReceived?.(results),
										);

									return results;
								}),
							{ concurrency: 10 },
						),
						Stream.runCollect,
					);

					const results = Chunk.toArray(resultsChunk).flat();

					return results;
				}),
		};
	}),
);
