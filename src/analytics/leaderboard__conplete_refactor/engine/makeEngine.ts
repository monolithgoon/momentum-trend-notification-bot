/** makeEngine — composition root for the modular pipeline */
import type { Logger } from "./ports/Logger";
import type { Metrics } from "./ports/Metrics";
import type { StoragePort } from "./ports/StoragePort";
import { PipelineEngine, Stage } from "./PipelineEngine";
import { PersistHistoryStage } from "./stages/PersistHistoryStage";
import { FetchHistoryStage } from "./stages/FetchHistoryStage";
import { ComputeSignalsStage } from "./stages/ComputeSignalsStage";
import { PruneStage } from "./stages/PruneStage";
import { MergeStage } from "./stages/MergeStage";
import { RankStage } from "./stages/RankStage";
import { SortStage } from "./stages/SortStage";
import { TrimStage } from "./stages/TrimStage";
import { PersistLeaderboardStage } from "./stages/PersistLeaderboardStage";
import { EmitStage } from "./stages/EmitStage";
import { IndexBasedDerivative } from "./strategies/derivatives/IndexBasedDerivative";
// import { TimeWeightedDerivative } from "./strategies/derivatives/TimeWeightedDerivative";
import { BasicRanking } from "./strategies/ranking/BasicRanking";
import { deriveKineticsCfg, type LeaderboardCfg } from "./config/LeaderboardCfg";

export function makeEngine(cfg: LeaderboardCfg, ports: { storage: StoragePort; log: Logger; metrics: Metrics }) {
	const kin = deriveKineticsCfg(cfg.windows, cfg.lookbackCap);
	const deriv = new IndexBasedDerivative();
	// const deriv = new TimeWeightedDerivative();
	const stages: Stage[] = [
		new PersistHistoryStage(ports.storage, ports.log, cfg.limits.chunkSize, cfg.features.previewSkipsPersist),
		new FetchHistoryStage(ports.storage, kin.lookbackSamples),
		new ComputeSignalsStage(
			deriv,
			{
				velWindowSamples: kin.velWindowSamples,
				accWindowSamples: kin.accWindowSamples,
				minSamplesForAccel: kin.minSamplesForAccel,
				appendCurrentIfMissing: true,
			},
			ports.log
		),
		new PruneStage(),
		new MergeStage(),
		new RankStage(new BasicRanking()),
		new SortStage(),
		new TrimStage(cfg.limits.maxLeaderboardLength),
		new PersistLeaderboardStage(ports.storage, cfg.features.previewSkipsPersist),
		new EmitStage(ports.log),
	];
	return new PipelineEngine(stages, ports.log);
}
