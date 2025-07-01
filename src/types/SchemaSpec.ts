import { Schema } from "effect";

// https://github.com/harrysolovay/effect-metaschema-video/blob/main/packages/metaschema/main.ts
type SchemaSpec = (
	| {
			_tag: "null";
	  }
	| {
			_tag: "boolean";
	  }
	| {
			_tag: "integer";
	  }
	| {
			_tag: "number";
	  }
	| {
			_tag: "string";
	  }
	| {
			_tag: "array";
			item: SchemaSpec;
	  }
	| {
			_tag: "object";
			entries: ReadonlyArray<{
				key: string;
				spec: SchemaSpec;
			}>;
	  }
	| {
			_tag: "union";
			members: ReadonlyArray<SchemaSpec>;
	  }
) & {
	description: string;
};

const SuspendedSchemaSpec = Schema.suspend(
	(): Schema.Schema<SchemaSpec> => SchemaSpec,
);
export const SchemaSpec = Schema.Union(
	Schema.TaggedStruct("null", {}),
	Schema.TaggedStruct("boolean", {}),
	Schema.TaggedStruct("integer", {}),
	Schema.TaggedStruct("number", {}),
	Schema.TaggedStruct("string", {}),
	Schema.TaggedStruct("array", {
		item: SuspendedSchemaSpec,
	}),
	Schema.TaggedStruct("object", {
		entries: Schema.Array(
			Schema.Struct({
				key: Schema.String,
				spec: SuspendedSchemaSpec,
			}),
		),
	}),
	Schema.TaggedStruct("union", {
		members: Schema.Array(SuspendedSchemaSpec),
	}),
)
	.pipe(
		Schema.extend(
			Schema.Struct({
				description: Schema.String,
			}),
		),
	)
	.annotations({
		identifier: "SchemaSpec",
	});

// biome-ignore lint/suspicious/noExplicitAny: expected
export const toSchema = (spec: SchemaSpec): Schema.Schema<any> => {
	const initial = (() => {
		switch (spec._tag) {
			case "null": {
				return Schema.Null;
			}
			case "boolean": {
				return Schema.Boolean;
			}
			case "integer": {
				return Schema.Int;
			}
			case "number": {
				return Schema.Number;
			}
			case "string": {
				return Schema.String;
			}
			case "array": {
				return Schema.Array(toSchema(spec.item));
			}
			case "object": {
				return Schema.Struct(
					Object.fromEntries(
						spec.entries.map((entry) => [entry.key, toSchema(entry.spec)]),
					),
				);
			}
			case "union": {
				return Schema.Union(...spec.members.map(toSchema));
			}
		}
	})();
	return initial.annotations({
		description: spec.description,
	});
};
