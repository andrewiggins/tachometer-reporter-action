declare global {
	namespace JSX {
		type CustomHTMLElement = import("node-html-parser").HTMLElement;

		interface Element extends CustomHTMLElement {}
		interface ElementChildrenAttribute {
			children: any;
		}
	}
}

// WE MUST EXPORT A TYPE here in order for VSCode to see this a module. If we
// don't export a type, then VSCode JSDoc intellisense will only include these
// types when `global.d.ts` is opened in the editor.
export type GitHubActionClient = ReturnType<
	typeof import("@actions/github").getOctokit
>;

// Sample context: https://github.com/andrewiggins/tachometer-reporter-action/runs/860022655?check_suite_focus=true
type GitHubActionContext = typeof import("@actions/github").context;
type CommentData = import("@octokit/types").IssuesGetCommentResponseData;

type OctokitResponse<T> = import("@octokit/types").OctokitResponse<T>;
type Workflow = import("@octokit/types").ActionsGetWorkflowResponseData;
type WorkflowRun = import("@octokit/types").ActionsGetWorkflowRunResponseData;
type WorkflowRunJob = import("@octokit/types").ActionsGetJobForWorkflowRunResponseData;

type WorkflowRunJobsAsyncIterator = AsyncIterableIterator<
	OctokitResponse<WorkflowRunJob[]>
>;

type Commit = import("@octokit/types").GitGetCommitResponseData;

interface CommitInfo extends Commit {
	html_url: string;
}

interface CommentContext {
	owner: string;
	repo: string;
	issueNumber: number;
	commentId: number | null;
	lockId: string;
	footer: string;
	footerRe: RegExp;
	matches(comment: CommentData): boolean;
	createDelayFactor: number;
	created: boolean;
}

interface ActionInfo {
	workflow: {
		id: Workflow["id"];
		name: Workflow["name"];
		srcHtmlUrl: string;
		runsHtmlUrl: string;
	};
	run: {
		id: WorkflowRun["id"];
		number: WorkflowRun["run_number"];
		name: string;
		htmlUrl: string;
	};
	job: {
		id?: WorkflowRunJob["id"];
		name: WorkflowRunJob["name"];
		htmlUrl?: WorkflowRunJob["html_url"];
		index?: number;
	};
}

interface Inputs {
	path: string;
	reportId?: string;
	initialize?: boolean;
	prBenchName?: string;
	baseBenchName?: string;
	summarize?: true | string[];
	keepOldResults?: boolean;
	defaultOpen?: boolean;
	followSymbolicLinks: boolean;
}

type Measurement = import("tachometer/lib/types").Measurement & {
	name?: string;
};
type TachResults = import("tachometer/lib/json-output").JsonOutputFile;
type BenchmarkResult = TachResults["benchmarks"][0];
type ConfidenceInterval = TachResults["benchmarks"][0]["mean"];

interface PatchedBenchmarkResult extends BenchmarkResult {
	measurement?: Measurement;
}

interface PatchedTachResults extends TachResults {
	benchmarks: Array<PatchedBenchmarkResult>;
}

type ResultsByMeasurement = Map<string, PatchedBenchmarkResult[]>;

interface MeasurementSummary {
	measurementId: string;
	measurement: Measurement;
	summary: JSX.Element | null;
}

interface Report {
	id: string;
	title: string;
	prBenchName: string | null;
	baseBenchName: string | null;
	actionInfo: ActionInfo | null;
	isRunning: boolean;
	// results: BenchmarkResult[];
	status: JSX.Element | null;
	summaries: MeasurementSummary[];
	body: JSX.Element;
}

interface SerializedMeasurementSummary extends MeasurementSummary {
	summary: string;
}

interface SerializedReport extends Report {
	status: string;
	summaries: Array<SerializedMeasurementSummary>;
	body: string;
}

interface Logger {
	warn(msg: string): void;
	info(msg: string): void;
	debug(getMsg: () => string): void;
	startGroup(name: string): void;
	endGroup(): void;
}

interface LockConfig {
	/**
	 * Trying to find a comment in a list and creating comments takes a bit longer
	 * than just reading comments when you have the ID. So creating gets its own
	 * delay config to accommodate this.
	 */
	createDelayMs: number;

	/**
	 * Minimum amount of time lock must be consistently held before safely
	 * assuming it was successfully acquired. Default: 2500ms
	 */
	minHoldTimeMs: number; // milliseconds

	/**
	 * Time to sleep between checks to see if the lock is still held by writer
	 * before actually updating comment. Defaults to 500ms or minHoldTimeMs/2 if
	 * minHoldTimeMs < 500
	 */
	checkDelayMs: number; // milliseconds

	/**
	 * Minimum amount of time to wait before trying to acquire the lock again
	 * after seeing it is held by another writer. Default: 1000ms
	 */
	minWaitTimeMs: number; // milliseconds

	/**
	 * Maximum amount of time to wait before trying to acquire the lock again
	 * after seeing it is held by another writer. Default: 3000ms
	 */
	maxWaitTimeMs: number; // milliseconds

	/**
	 * How long to consecutively wait until giving up and failing to acquire lock
	 */
	waitTimeoutMs: number; // milliseconds
}

/**
 * An abstraction for the various dimensions of data we display.
 */
interface Dimension {
	label: string;
	format: (r: BenchmarkResult) => string;
	tableConfig?: { alignment?: "left" | "center" | "right" };
}
