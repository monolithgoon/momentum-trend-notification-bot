import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { ITaggedLeaderboardSnapshotsBatch_2 } from "./types/ITaggedLeaderboardSnapshotsBatch.interface_2";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/NormalizedRestTickerSnapshot.interface";
import { LeaderboardTickerTransformer_3 } from "@core/models/rest_api/transformers/LeaderboardTickerTransformer_2 copy";
import { LeaderboardUpdateEvent } from "src/types/events/LeaderboardUpdateEvent.interface";
import { LeaderboardEngine_3 } from "./LeaderboardEngine_3";

interface LeaderboardOrchestratorOptions_3 {
	correlationId: string;
	snapshots: NormalizedRestTickerSnapshot[];
	snapshotTransformer: LeaderboardTickerTransformer_3;
	leaderboardEngine: LeaderboardEngine_3;
	leaderboardScanStrategyTag: string[]; // we’ll join for a single leaderboard tag string
	previewOnly?: boolean;
	onStepComplete?: (step: string, payload?: any) => void;
}

/**
 * Orchestrates: transform → leaderboard tag → engine.ingest → summarize
 * Engine handles computeKinetics, merge, aggregate rank, prune, sort, persist.
 */
export class LeaderboardOrchestrator_3 {
	private readonly correlationId: string;
	private readonly rawSnapshots: NormalizedRestTickerSnapshot[];
	private readonly transformer: LeaderboardTickerTransformer_3;
	private readonly engine: LeaderboardEngine_3;
	private readonly tag: string;
	private readonly previewOnly: boolean;
	private readonly onStep?: (step: string, payload?: any) => void;

	constructor(opts: LeaderboardOrchestratorOptions_3) {
		this.correlationId = opts.correlationId;
		this.rawSnapshots = opts.snapshots;
		this.transformer = opts.snapshotTransformer;
		this.engine = opts.leaderboardEngine;
		this.tag = opts.leaderboardScanStrategyTag.join(" | ");
		this.previewOnly = !!opts.previewOnly;
		this.onStep = opts.onStepComplete;
	}

	private emitStep(step: string, payload?: any) {
		this.onStep?.(step, { correlationId: this.correlationId, ...payload });
	}

	/**
	 * Main entrypoint used by the listener.
	 * Returns a compact summary for downstream event emission.
	 */
	async ingestSnapshotBatch(): Promise<LeaderboardUpdateEvent> {
		// 1) Transform raw normalized snapshots → leaderboard snapshots
		this.emitStep("transform:begin", { count: this.rawSnapshots.length });
		const transformed: ILeaderboardTickerSnapshot_2[] = this.rawSnapshots.map((s) => this.transformer.transform(s));
		this.emitStep("transform:done", { count: transformed.length });

		// 2) Tag batch
		const batch: ITaggedLeaderboardSnapshotsBatch_2 = {
			scan_strategy_tag: this.tag,
			normalized_leaderboard_snapshots: transformed,
		};

		// 3) Ingest via engine (compute kinetics, merge, aggregate, prune, sort, persist)
		this.emitStep("engine:ingest:begin", { previewOnly: this.previewOnly });

		// Expect the engine to return a final, sorted array & persisted state
		const finalLeaderboard: ILeaderboardTickerSnapshot_2[] = await this.engine.start(batch, {
			correlationId: this.correlationId,
			previewOnly: this.previewOnly,
		});

		this.emitStep("engine:ingest:done", {
			finalSize: finalLeaderboard.length,
		});

		// 4) Summarize for the listener
		return {
			leaderboardTag: this.tag,
			total: finalLeaderboard.length,
			topTicker: finalLeaderboard[0].ticker_symbol__ld_tick,
		};
	}
}
