import {detokenize, detokenizeSync, detokenizeAsync} from './main';

function resolveWith<T extends any>(value: T, time: number): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), time));
}

describe('detokenize()', () => {
	test('replaces object value map', () => {
		expect(detokenize('a{a}b{b}{a}{b}', {'{a}': 'A', '{b}': 'B'})).toBe('aAbBAB');
	});

	test('replaces array value map', () => {
		expect(
			detokenize('a{a}b{b}{a}{b}', [
				['{a}', 'A'],
				['{b}', 'B'],
			])
		).toBe('aAbBAB');
	});

	test('replaces values in order', () => {
		expect(
			detokenize('a{a}b', [
				['{a}', 'A'],
				['{a}', 'B'],
			])
		).toBe('aAb');
	});

	test('supports RegExp tokens', () => {
		expect(detokenize('a{a:foo}b', [[/{a:\w+}/, 'A']])).toBe('aAb');
	});

	test('supports replacer functions', () => {
		expect(detokenize('a{a}b', [['{a}', (token: string) => `${token}A`]])).toBe('a{a}Ab');
	});

	test('replacer functions receives match for dynamic tokens', () => {
		expect(detokenize('a{a:foo}b', [[/{a:(?<id>\w+)}/, (_token, match) => match.groups?.id || '']])).toBe('afoob');
	});

	test('real world example', () => {
		const staticValues: Record<string, string> = {
			downloads: 'F:\\Downloads',
			basename: 'image.jpg',
		};
		const result = detokenize('<downloads>/<basename>', [
			[
				new RegExp(`\\<(?<name>[^\\>]+)(?<!\\))>`),
				(_, match) => {
					const name = match.groups?.name as string;
					return staticValues[name] || '';
				},
			],
		]);

		expect(result).toBe(`${staticValues.downloads}/${staticValues.basename}`);
	});
});

describe('detokenizeSync()', () => {
	test('is an alias of detokenize()', () => {
		expect(detokenizeSync).toBe(detokenize);
	});
});

describe('detokenizeAsync()', () => {
	test('replaces object value map', () => {
		expect(detokenizeAsync('a{a}b{b}{a}{b}', {'{a}': 'A', '{b}': 'B'})).resolves.toBe('aAbBAB');
	});

	test('replaces array value map', () => {
		expect(
			detokenizeAsync('a{a}b{b}{a}{b}', [
				['{a}', 'A'],
				['{b}', 'B'],
			])
		).resolves.toBe('aAbBAB');
	});

	test('replaces values in order', () => {
		expect(
			detokenizeAsync('a{a}b', [
				['{a}', 'A'],
				['{a}', 'B'],
			])
		).resolves.toBe('aAb');
	});

	test('supports RegExp tokens', () => {
		expect(detokenizeAsync('a{a:foo}b', [[/{a:\w+}/, 'A']])).resolves.toBe('aAb');
	});

	test('supports replacer functions', () => {
		expect(detokenizeAsync('a{a}b', [['{a}', (token: string) => `${token}A`]])).resolves.toBe('a{a}Ab');
	});

	test('replacer functions receives match for dynamic tokens', () => {
		expect(
			detokenizeAsync('a{a:foo}b', [[/{a:(?<id>\w+)}/, (_token, match) => match.groups?.id || '']])
		).resolves.toBe('afoob');
	});

	test('replacer function can return a promise', () => {
		expect(
			detokenizeAsync('a{a}b{b}{c}{d}', {
				'{a}': 'A',
				'{b}': () => resolveWith('B', 60),
				'{c}': () => resolveWith('C', 30),
				'{d}': () => resolveWith('D', 45),
			})
		).resolves.toBe('aAbBCD');
	});
});
