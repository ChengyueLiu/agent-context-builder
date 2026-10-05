# Machine learning

### Common benchmarks and metrics
- Language modeling: perplexity; long context: LongBench, SCROLLS.
- Classification: accuracy, macro-F1.

### Major venues
NeurIPS, ICML, ICLR.

### What counts as a contribution
- New method: beats strong baselines on recognized benchmarks, with ablations showing what each component contributes.
- New finding: backed by systematic experiments that rule out simpler explanations.
- New benchmark or dataset: shows the shortcomings of existing benchmarks and how the new one addresses them.

### Common mistakes
- Accuracy is misleading under class imbalance; also report macro-F1 or per-class metrics.
- Report variance for gains on small datasets: a gain from a single run may just be noise.
