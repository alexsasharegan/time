/**
 * A duration is just a time unit in milliseconds.
 */
export enum Duration {
	Millisecond = 1,
	Microsecond = Duration.Millisecond / 1000,
	Second = Duration.Millisecond * 1000,
	Minute = Duration.Second * 60,
	Hour = Duration.Minute * 60,
	Day = Duration.Hour * 24,
	Week = Duration.Day * 7
}

function createConverter(targetTimeUnit: number): (duration: number) => number {
	return duration => duration / targetTimeUnit;
}

export const durationTo = {
	Microsecond: createConverter(Duration.Microsecond),
	Millisecond: createConverter(Duration.Millisecond),
	Second: createConverter(Duration.Second),
	Minute: createConverter(Duration.Minute),
	Hour: createConverter(Duration.Hour),
	Day: createConverter(Duration.Day),
	Week: createConverter(Duration.Week)
};

/**
 * Resolves the given Promise, but throws a TimeoutError if the timeout is
 * reached before the Promise is resolved. Uses the optional message for the
 * error, or else a default message.
 *
 * @param {*} p The promise to resolve
 * @param {*} duration Time in milliseconds
 * @param {*} message Optional message for the TimeoutError
 */
export function resolveWithTimeout<T>(
	p: Promise<T>,
	duration: number,
	message?: string
): Promise<T> {
	return Promise.race([
		p,
		timeAfter(duration).then(() => {
			throw new RangeError(message || `timeout exceeded (${duration}ms)`);
		})
	]);
}

export function timeAfter(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

export function timeAfterWithCancel(ms: number): [Promise<void>, () => void] {
	let id = -1;
	let timer = new Promise<void>(r => {
		id = setTimeout(r, ms);
	});
	return [
		timer,
		function cancel() {
			clearTimeout(id);
		}
	];
}

interface SemanticEpoch {
	matches(unixMs: number, now?: Date): boolean;
	label: string;
}

export const Today: SemanticEpoch = {
	label: "Today",
	matches(unix, now = new Date()) {
		let elapsed = 0;
		elapsed += Duration.Millisecond * now.getMilliseconds();
		elapsed += Duration.Second * now.getSeconds();
		elapsed += Duration.Minute * now.getMinutes();
		elapsed += Duration.Hour * now.getHours();

		return unix >= now.getTime() - elapsed;
	}
};

export const Yesterday: SemanticEpoch = {
	label: "Yesterday",
	matches(unix, now = new Date()) {
		let elapsed = 0;
		elapsed += Duration.Millisecond * now.getMilliseconds();
		elapsed += Duration.Second * now.getSeconds();
		elapsed += Duration.Minute * now.getMinutes();
		elapsed += Duration.Hour * now.getHours();
		// Ensure not today
		if (unix >= now.getTime() - elapsed) {
			return false;
		}

		elapsed += Duration.Day;

		return unix >= now.getTime() - elapsed;
	}
};

export const ThisWeek: SemanticEpoch = {
	label: "This Week",
	matches(unix, now = new Date()) {
		let elapsed = 0;
		elapsed += Duration.Millisecond * now.getMilliseconds();
		elapsed += Duration.Second * now.getSeconds();
		elapsed += Duration.Minute * now.getMinutes();
		elapsed += Duration.Hour * now.getHours();
		elapsed += Duration.Day * now.getDay();

		return unix >= now.getTime() - elapsed;
	}
};

export const ThisMonth: SemanticEpoch = {
	label: "This Month",
	matches(unix, now = new Date()) {
		let elapsed = 0;
		elapsed += Duration.Millisecond * now.getMilliseconds();
		elapsed += Duration.Second * now.getSeconds();
		elapsed += Duration.Minute * now.getMinutes();
		elapsed += Duration.Hour * now.getHours();
		elapsed += Duration.Day * now.getDate() - 1;

		return unix >= now.getTime() - elapsed;
	}
};

export const Older: SemanticEpoch = {
	label: "Older",
	matches(unix, now = new Date()) {
		return unix > now.getTime();
	}
};

export const Epochs = {
	[Today.label]: Today,
	[Yesterday.label]: Yesterday,
	[ThisWeek.label]: ThisWeek,
	[ThisMonth.label]: ThisMonth,
	[Older.label]: Older
};

export function whichEpoch(unixMs: number, now: Date = new Date()): string {
	switch (true) {
		default:
			return Older.label;
		case unixMs > now.getTime():
			throw new RangeError("cannot match SemanticEpoch from the future");
		case Today.matches(unixMs, now):
			return Today.label;
		case Yesterday.matches(unixMs, now):
			return Yesterday.label;
		case ThisWeek.matches(unixMs, now):
			return ThisWeek.label;
		case ThisMonth.matches(unixMs, now):
			return ThisMonth.label;
	}
}
