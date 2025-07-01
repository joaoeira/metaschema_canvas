import { Schema } from "effect";

export const PaperSchema = Schema.Struct({
	title: Schema.String,
	abstract: Schema.String,
	authors: Schema.Array(Schema.String),
	publishedDate: Schema.String,
});

export type Paper = Schema.Schema.Type<typeof PaperSchema>;
export type ExtendedPaper = Paper & unknown;
