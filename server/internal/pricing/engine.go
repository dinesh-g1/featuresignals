package pricing

// OperationalCosts represents fixed monthly operational costs in INR.
type OperationalCosts struct {
	ObservabilityINR    float64 `json:"observability_inr"`
	SoftwareLicensesINR float64 `json:"software_licenses_inr"`
	DeveloperSalaryINR  float64 `json:"developer_salary_inr"`
	OfficeINR           float64 `json:"office_inr"`
	MiscINR             float64 `json:"misc_inr"`
	TotalFixedINR       float64 `json:"total_fixed_inr"`
}

// DefaultOperationalCosts are estimated fixed monthly costs.
var DefaultOperationalCosts = OperationalCosts{
	ObservabilityINR:    1750,  // SigNoz cloud base plan
	SoftwareLicensesINR: 2500,  // GitHub, misc tools
	DeveloperSalaryINR:  80000, // Allocated share for infra/SRE
	OfficeINR:           5000,  // Co-working / remote allowance
	MiscINR:             2000,  // Domain, email, misc
	TotalFixedINR:       91250,
}