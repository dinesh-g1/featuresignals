package dto

type IPAllowlistResponse struct {
	Enabled    bool     `json:"enabled"`
	CIDRRanges []string `json:"cidr_ranges"`
}
