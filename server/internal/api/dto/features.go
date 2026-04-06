package dto

type FeatureItemResponse struct {
	Feature string `json:"feature"`
	Enabled bool   `json:"enabled"`
	MinPlan string `json:"min_plan"`
}

type FeaturesListResponse struct {
	Plan     string                `json:"plan"`
	Features []FeatureItemResponse `json:"features"`
}
