package domain

import "sort"

// Feature identifies a gated product capability. Features are mapped to the
// minimum plan tier required to access them. The evaluation hot path is never
// gated — only management API endpoints.
type Feature string

const (
	FeatureApprovals   Feature = "approvals"
	FeatureWebhooks    Feature = "webhooks"
	FeatureScheduling  Feature = "scheduling"
	FeatureAuditExport Feature = "audit_export"
	FeatureSSO         Feature = "sso"
	FeatureSCIM        Feature = "scim"
	FeatureIPAllowlist Feature = "ip_allowlist"
	FeatureCustomRoles Feature = "custom_roles"
	FeatureMFA         Feature = "mfa"
	FeatureDataExport  Feature = "data_export"
)

// planRank orders plan tiers so that higher ranks include all features from
// lower ranks. Trial maps to Pro-level access.
var planRank = map[string]int{
	PlanFree:       0,
	PlanTrial:      2,
	PlanPro:        2,
	PlanEnterprise: 3,
}

// featureMinPlan maps each gated feature to the minimum plan tier required.
var featureMinPlan = map[Feature]string{
	FeatureApprovals:   PlanPro,
	FeatureWebhooks:    PlanPro,
	FeatureScheduling:  PlanPro,
	FeatureAuditExport: PlanPro,
	FeatureMFA:         PlanPro,
	FeatureDataExport:  PlanPro,
	FeatureSSO:         PlanEnterprise,
	FeatureSCIM:        PlanEnterprise,
	FeatureIPAllowlist: PlanEnterprise,
	FeatureCustomRoles: PlanEnterprise,
}

// IsFeatureEnabled returns true when the given plan includes the feature.
func IsFeatureEnabled(plan string, feature Feature) bool {
	required, ok := featureMinPlan[feature]
	if !ok {
		return true
	}
	return planRank[plan] >= planRank[required]
}

// FeatureMinPlanName returns the minimum plan name required for a feature.
func FeatureMinPlanName(feature Feature) string {
	if p, ok := featureMinPlan[feature]; ok {
		return p
	}
	return PlanFree
}

// PlanFeatures returns all features enabled for the given plan, sorted.
func PlanFeatures(plan string) []string {
	rank := planRank[plan]
	var features []string
	for f, minPlan := range featureMinPlan {
		if rank >= planRank[minPlan] {
			features = append(features, string(f))
		}
	}
	sort.Strings(features)
	return features
}

// AllFeatures returns every defined gated feature with its minimum plan.
func AllFeatures() map[string]string {
	result := make(map[string]string, len(featureMinPlan))
	for f, p := range featureMinPlan {
		result[string(f)] = p
	}
	return result
}
