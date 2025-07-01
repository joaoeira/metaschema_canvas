import { AiLanguageModel } from "@effect/ai";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { FetchHttpClient, FileSystem, Terminal } from "@effect/platform";
import { NodeFileSystem, NodeTerminal } from "@effect/platform-node";
import {
	Array as Arr,
	Chunk,
	Config,
	Effect,
	ExecutionPlan,
	Layer,
	Schedule,
	Schema,
	Stream,
} from "effect";
import { papers } from "./mock/data";
import { SchemaSpec, toSchema } from "./types/SchemaSpec";

const o3 = OpenAiLanguageModel.model("o3");
const o4Mini = OpenAiLanguageModel.model("o4-mini-2025-04-16");

const executionPlan = ExecutionPlan.make(
	{
		provide: o4Mini,
		attempts: 2,
		schedule: Schedule.exponential("250 millis").pipe(Schedule.jittered),
	},
	{
		provide: o3,
		attempts: 2,
		schedule: Schedule.exponential("250 millis").pipe(Schedule.jittered),
	},
);

export const transformData = Effect.fn("transformData")(function* (
	data: typeof papers,
	instructions: string,
) {
	const model = yield* AiLanguageModel.AiLanguageModel;

	const {
		value: { paperSchemaSpec },
	} = yield* model
		.generateObject({
			prompt: `Spec out a object type that fulfills the following instructions: ${instructions}.

    The spec should be able to be filled out given the following data:
    - Title
    - Authors
    - Abstract
    - Published Date

		When analyzing the instructions, distinguish between:

		- Filtering/selection criteria (which subset of data to return) - these do not affect the schema
		- Output requirements (what information to include for each item) - these define additional schema fields

		Look for explicit output requirements indicated by phrases like 'include...', 'provide...', 'show...', 'add...', or 'with...' that specify information to be returned alongside the base data. These requirements should be added to the spec as additional fields, even when they appear embedded within filtering instructions

    In the event the instructions cannot be fulfilled partially or in full given the available data, omit the fields that cannot be fulfilled.
    Always return a spec that includes at least the title, plus whatever other fields are required for the spec. There is no need to include the fields from the original data that are not required for the spec.
    `,
			schema: Schema.Struct({ paperSchemaSpec: SchemaSpec }),
		})
		.pipe(Effect.withExecutionPlan(executionPlan));

	const papersSchema = toSchema(paperSchemaSpec);

	const splitPapers = Arr.chunksOf(data.slice(0, 50), 10);

	const resultsChunk = yield* Stream.fromIterable(splitPapers).pipe(
		Stream.mapEffect(
			(p) =>
				Effect.gen(function* () {
					const {
						value: { papers: proposedPapers },
					} = yield* model
						.generateObject({
							prompt: `You will be given a list of papers, a spec, and some instructions.
							Your task is to apply the spec to the papers and return the papers such that they fulfill the instructions.

	    Papers:

	    ${p.map((paper) => `<paper>${JSON.stringify(paper)}</paper>`).join("\n")}
	    `,
							schema: Schema.Struct({ papers: Schema.Array(papersSchema) }),
						})
						.pipe(Effect.withExecutionPlan(executionPlan));

					return yield* Effect.forEach(proposedPapers, (p) =>
						Effect.gen(function* () {
							const paper = yield* Effect.succeed(
								papers.find((paper) => paper.title === p.title),
							);

							return {
								...p,
								...paper,
							};
						}),
					);
				}),
			{ concurrency: 5 },
		),
		Stream.runCollect,
	);

	const results = Chunk.toArray(resultsChunk).flat();

	return results;
});

const program = Effect.gen(function* () {
	const terminal = yield* Terminal.Terminal;
	yield* terminal.display("Please enter your instructions: ");
	const userQuery = yield* terminal.readLine;

	const results = yield* transformData(papers, userQuery);

	const fs = yield* FileSystem.FileSystem;
	yield* fs.writeFile(
		"./results.json",
		new TextEncoder().encode(JSON.stringify(results, null, 2)),
		{ flag: "w" },
	);
});

export const layer = Layer.empty.pipe(
	Layer.provideMerge(OpenAiLanguageModel.model("o4-mini-2025-04-16")),
	Layer.provideMerge(
		OpenAiClient.layerConfig({
			apiKey: Config.redacted("OPENAI_API_KEY"),
		}),
	),
	Layer.provideMerge(FetchHttpClient.layer),
	Layer.provideMerge(NodeTerminal.layer),
	Layer.provideMerge(NodeFileSystem.layer),
);

await program.pipe(Effect.provide(layer), Effect.runPromise);
