package domain

// Supported data regions for multi-region deployments.
const (
	RegionUS = "us"
	RegionEU = "eu"
	RegionIN = "in"
)

// RegionInfo describes a deployable data region.
type RegionInfo struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Flag        string `json:"flag"`
	APIEndpoint string `json:"api_endpoint"`
	AppEndpoint string `json:"app_endpoint"`
}

// Regions is the authoritative list of supported data regions.
// Endpoint URLs are overridden at deploy time via config; these are defaults.
var Regions = map[string]RegionInfo{
	RegionUS: {Code: RegionUS, Name: "United States", Flag: "🇺🇸", APIEndpoint: "https://api.featuresignals.com", AppEndpoint: "https://app.featuresignals.com"},
	RegionEU: {Code: RegionEU, Name: "Europe", Flag: "🇪🇺", APIEndpoint: "https://api.eu.featuresignals.com", AppEndpoint: "https://app.eu.featuresignals.com"},
	RegionIN: {Code: RegionIN, Name: "India", Flag: "🇮🇳", APIEndpoint: "https://api.in.featuresignals.com", AppEndpoint: "https://app.in.featuresignals.com"},
}

// ValidRegion returns true if the given region code is supported.
func ValidRegion(code string) bool {
	_, ok := Regions[code]
	return ok
}

// RegionCodes returns the list of supported region codes, primary region first.
func RegionCodes() []string {
	return []string{RegionIN, RegionUS, RegionEU}
}
