// Temporary until next version of Tachometer is released
interface BrowserConfig {
	/** Name of the browser. */
	name: BrowserName;
	/** Whether to run in headless mode. */
	headless: boolean;
	/** A remote WebDriver server to launch the browser from. */
	remoteUrl?: string;
	/** Launch the browser window with these dimensions. */
	windowSize: WindowSize;
	/** Path to custom browser binary. */
	binary?: string;
	/** Additional binary arguments. */
	addArguments?: string[];
	/** WebDriver default binary arguments to omit. */
	removeArguments?: string[];
	/** CPU Throttling rate. (1 is no throttle, 2 is 2x slowdown, etc). */
	cpuThrottlingRate?: number;
	/** Advanced preferences usually set from the about:config page. */
	preferences?: { [name: string]: string | number | boolean };
}

interface JsonOutputFile {
	benchmarks: Benchmark[];
}

interface BrowserConfigResult extends BrowserConfig {
	userAgent?: string;
}

interface Benchmark {
	name: string;
	bytesSent: number;
	version?: string;
	browser?: BrowserConfigResult;
	mean: ConfidenceInterval;
	differences: Array<Difference | null>;
	samples: number[];
}

interface Difference {
	absolute: ConfidenceInterval;
	percentChange: ConfidenceInterval;
}

interface ConfidenceInterval {
	low: number;
	high: number;
}
