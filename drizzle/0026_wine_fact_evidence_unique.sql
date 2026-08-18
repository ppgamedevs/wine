CREATE UNIQUE INDEX `wine_fact_evidence_wine_field_hash_uidx`
ON `wine_fact_evidence` (`wine_id`, `field`, `source_hash`);
