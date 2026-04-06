package dto

import "github.com/featuresignals/server/internal/domain"

type RegionsResponse struct {
	Regions []domain.RegionInfo `json:"regions"`
}
