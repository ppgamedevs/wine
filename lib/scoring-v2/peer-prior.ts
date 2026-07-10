import { DEFAULT_PEER_Q_PRIOR } from "@/lib/scoring-v2/constants";
import { median } from "@/lib/scoring-v2/math";
import {
  priceBucketForPeerPrior,
  type ExpectedQualitySample,
} from "@/lib/scoring-v2/expected-quality";

export interface PeerPriorSample {
  wineType: string | undefined;
  price: number;
  modelQuality: number;
}

function peerKey(wineType: string | undefined, price: number): string {
  const type = (wineType ?? "white").toLowerCase();
  return `${type}:${priceBucketForPeerPrior(price)}`;
}

export function buildPeerQualityPriors(
  samples: PeerPriorSample[],
): Map<string, number> {
  const grouped = new Map<string, number[]>();

  for (const sample of samples) {
    const key = peerKey(sample.wineType, sample.price);
    const bucket = grouped.get(key) ?? [];
    bucket.push(sample.modelQuality);
    grouped.set(key, bucket);
  }

  const priors = new Map<string, number>();
  for (const [key, values] of grouped) {
    priors.set(key, Math.round(median(values)));
  }

  return priors;
}

export function resolvePeerQualityPrior(
  wineType: string | undefined,
  price: number,
  priors?: Map<string, number>,
): number {
  if (!priors || priors.size === 0) return DEFAULT_PEER_Q_PRIOR;
  return priors.get(peerKey(wineType, price)) ?? DEFAULT_PEER_Q_PRIOR;
}

export function peerPriorSampleFromExpected(
  sample: ExpectedQualitySample,
): PeerPriorSample {
  return {
    wineType: sample.wineType,
    price: sample.price,
    modelQuality: sample.modelQuality,
  };
}
