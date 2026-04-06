package dto

type CapabilitiesResponse struct {
	DeploymentMode  string `json:"deployment_mode"`
	BillingEnabled  bool   `json:"billing_enabled"`
	RegionsEnabled  bool   `json:"regions_enabled"`
	EmailProvider   string `json:"email_provider"`
	LicenseValid    bool   `json:"license_valid,omitempty"`
	LicensePlan     string `json:"license_plan,omitempty"`
}
