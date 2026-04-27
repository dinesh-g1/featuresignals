package domain

// Supported data regions for multi-region deployments.
const (
	RegionUS  = "us"
	RegionEU  = "eu"
	RegionIN  = "in"
	RegionDev = "dev"
)

// RegionInfo describes a deployable data region.
type RegionInfo struct {
	Code string `json:"code"`
	Name string `json:"name"`
	Flag string `json:"flag"`
}

// Regions is the authoritative list of supported data regions.
var Regions = map[string]RegionInfo{
	RegionIN:  {Code: RegionIN, Name: "India", Flag: "🇮🇳"},
	RegionUS:  {Code: RegionUS, Name: "United States", Flag: "🇺🇸"},
	RegionEU:  {Code: RegionEU, Name: "Europe", Flag: "🇪🇺"},
	RegionDev: {Code: RegionDev, Name: "Development", Flag: "\U0001f6e0\ufe0f"},
}

// ValidRegion returns true if the given region code is supported.
func ValidRegion(code string) bool {
	_, ok := Regions[code]
	return ok
}

// RegionCodes returns the list of supported region codes, primary region first.
// Dev is intentionally excluded — it is not user-facing.
func RegionCodes() []string {
	return []string{RegionIN, RegionUS, RegionEU}
}
