Metaschemas are schemas that define the structure of other schemas. They provide a way to represent schema definitions as data in a format that can be manipulated at runtime.

We can leverage Effect's Schema library to construct schemas programmatically. Effect Schemas are typically defined at compile-time using combinators like `Schema.Struct` and `Schema.Array`, but metaschemas allow these same structures to be built dynamically. When combined with AI language models, metaschemas enable a user experience where AI interprets user intent and generates appropriate schema structures without having to rely on predefined templates.

This Chrome extension serves as a proof of concept for a new mode of interacting with research corpora. Starting from a base table of papers the user can write natural language instructions to transform and refine the dataset. They might, for example, filter out papers unrelated to a specific topic, or restrict results to a particular publication window. Beyond filtering, users can also specify what information should be extracted and displayed. For example, if working with medical studies, they might request new columns for patient count, dosage information, or treatment outcomes. The canvas environment allows for free form exploration of these actions, running multiple in parallel and exploring different facets of the data corpus until they are satisfied with the results.

Metaschemas are leveraged to translate these user instructions into structured extraction templates. Rather than working with predefined schemas, the AI interprets the user's intent and generates appropriate data structures on demand. The canvas-based interface enables exploratory data analysis where users can run multiple extraction pipelines in parallel, each with different filters and output schemas. This iterative approach lets researchers refine their queries, compare different extraction strategies, and progressively narrow their focus until they've captured the precise information they need from their document corpus.

## Demo

https://www.loom.com/share/14d21cee8b9046b998acdb82b4c4ac25?sid=7cc5da84-dbcc-4994-bad5-53cdc23e5f6f

## How to use

1. Install dependencies `bun i`
2. Run the development server `bun run dev`
3. Load the extension in Chrome by navigating to `chrome://extensions/` and clicking "Load unpacked"
4. Select the `dist` directory
5. Open `chrome-extension://{extension-id}/src/canvas.html` in a new tab

An OpenAI API key is required to use the extension. You will be prompted to enter it when you first open the page. Keys are stored in local storage and never sent to any servers.
