export type SimpleReplacer = (token: string) => string | number;
export type SimpleReplacerAsync = (token: string) => Promise<string | number>;
export type MatchReplacer = (token: RegExp, match: RegExpExecArray) => string | number;
export type MatchReplacerAsync = (token: RegExp, match: RegExpExecArray) => Promise<string | number>;
export type ValuesRecord = Record<string, string | number | SimpleReplacer>;
export type ValuesArray = Array<[string, string | number | SimpleReplacer] | [RegExp, string | number | MatchReplacer]>;
export type ValuesRecordAsync = Record<string, string | number | SimpleReplacer | SimpleReplacerAsync>;
export type ValuesArrayAsync = Array<
	| [string, string | number | SimpleReplacer | SimpleReplacerAsync]
	| [RegExp, string | number | MatchReplacer | MatchReplacerAsync]
>;

export const detokenize = (input: string, values: ValuesRecord | ValuesArray) =>
	createDetokenizationArray(input, values).join('');

export const detokenizeSync = detokenize;

export const detokenizeAsync = async (input: string, values: ValuesRecordAsync | ValuesArrayAsync) =>
	(await Promise.all(createDetokenizationArray(input, values))).join('');

/**
 * Splits the string into an array of original and replaced string parts.
 *
 * The purpose is to just do an easy join for sync, and (await Promise.all).join for
 * async implementation.
 *
 * Example:
 * ```ts
 * createDetokenizationArray('a{a}b', {'{a}': 'A'}); // '['a', 'A', 'b']'
 * ```
 */
function createDetokenizationArray(input: string, values: ValuesRecord | ValuesArray): (string | number)[];
function createDetokenizationArray(
	input: string,
	values: ValuesRecordAsync | ValuesArrayAsync
): (string | number | Promise<string | number>)[];
function createDetokenizationArray(
	input: string,
	values: ValuesRecordAsync | ValuesArrayAsync
): (string | number | Promise<string | number>)[] {
	type Split =
		| {isReplaced?: undefined; content: string}
		| {isReplaced: true; content: string | number | Promise<string | number>};

	// We initialize the splits with input string
	let splits: Split[] = [{content: input}];

	// Normalize values into a consistent iterable
	const valuesIterable = Array.isArray(values) ? values : Object.entries(values);

	// Process tokens
	for (const [token, replacer] of valuesIterable) {
		// Normalized function to find token in a string and return all of the required data
		const findToken: (input: string) => [number, string, RegExpExecArray?] | null =
			typeof token === 'string'
				? (input: string) => {
						const index = input.indexOf(token);
						return index > -1 ? [input.indexOf(token), token] : null;
				  }
				: (input: string) => {
						const match = token.exec(input);
						return match ? [match.index, match[0], match] : null;
				  };

		// Normalized token replacer
		const replaceToken = typeof replacer === 'function' ? replacer : () => replacer;

		const tokenSplits: Split[] = [];

		// Process current splits
		for (const split of splits) {
			if (split.isReplaced) {
				tokenSplits.push(split);
				continue;
			}

			// Process one working split at a time
			let workingSplit = split;
			while (true) {
				const match = findToken(workingSplit.content);

				if (match != null) {
					// Splits the string into before match, match, and after match.
					// Before and match are added to the splits, while after match is
					// assigned as a working split to be processed by next iteration.
					const [index, needle, regExpMatch] = match;
					tokenSplits.push({content: workingSplit.content.slice(0, index)});
					tokenSplits.push({isReplaced: true, content: (replaceToken as any)(token, regExpMatch)});
					workingSplit = {content: workingSplit.content.slice(index + needle.length)};
				} else {
					tokenSplits.push(workingSplit);
					break;
				}
			}
		}

		splits = tokenSplits;
	}

	return splits.map((split) => split.content);
}
