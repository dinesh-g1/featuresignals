package domain

// Ruleset is an immutable snapshot of all data needed to evaluate flags
// for a single environment. It is built by the cache layer and passed to
// the evaluation engine.
//
// Moved here from the eval package so that both the eval engine and the
// cache layer can reference it without creating an import cycle.
type Ruleset struct {
	Flags    map[string]*Flag      // flagKey -> definition
	States   map[string]*FlagState // flagKey -> per-environment state
	Segments map[string]*Segment   // segmentKey -> segment definition
}
