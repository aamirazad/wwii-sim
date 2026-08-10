export function evaluateMathExpression(input: string): number | null {
	const source = input.replaceAll(/\s/g, "");
	if (!source) return 0;
	let index = 0;

	const number = (): number => {
		const start = index;
		while (/[0-9.]/.test(source[index] ?? "")) index += 1;
		if (start === index) throw new Error("Expected number");
		const value = Number(source.slice(start, index));
		if (!Number.isFinite(value)) throw new Error("Invalid number");
		return value;
	};

	const factor = (): number => {
		if (source[index] === "+") {
			index += 1;
			return factor();
		}
		if (source[index] === "-") {
			index += 1;
			return -factor();
		}
		if (source[index] === "(") {
			index += 1;
			const value = expression();
			if (source[index] !== ")") throw new Error("Missing parenthesis");
			index += 1;
			return value;
		}
		return number();
	};

	const term = (): number => {
		let value = factor();
		while (source[index] === "*" || source[index] === "/") {
			const operator = source[index++];
			const right = factor();
			if (operator === "/" && right === 0) throw new Error("Division by zero");
			value = operator === "*" ? value * right : value / right;
		}
		return value;
	};

	const expression = (): number => {
		let value = term();
		while (source[index] === "+" || source[index] === "-") {
			const operator = source[index++];
			const right = term();
			value = operator === "+" ? value + right : value - right;
		}
		return value;
	};

	try {
		const value = expression();
		if (index !== source.length || !Number.isInteger(value)) return null;
		return value;
	} catch {
		return null;
	}
}
