package domain

import "testing"

func TestIsFeatureEnabled(t *testing.T) {
	tests := []struct {
		name    string
		plan    string
		feature Feature
		want    bool
	}{
		{name: "free cannot use approvals", plan: PlanFree, feature: FeatureApprovals, want: false},
		{name: "free cannot use webhooks", plan: PlanFree, feature: FeatureWebhooks, want: false},
		{name: "free cannot use sso", plan: PlanFree, feature: FeatureSSO, want: false},
		{name: "pro can use approvals", plan: PlanPro, feature: FeatureApprovals, want: true},
		{name: "pro can use webhooks", plan: PlanPro, feature: FeatureWebhooks, want: true},
		{name: "pro can use scheduling", plan: PlanPro, feature: FeatureScheduling, want: true},
		{name: "pro can use audit export", plan: PlanPro, feature: FeatureAuditExport, want: true},
		{name: "pro cannot use sso", plan: PlanPro, feature: FeatureSSO, want: false},
		{name: "pro cannot use scim", plan: PlanPro, feature: FeatureSCIM, want: false},
		{name: "pro cannot use ip allowlist", plan: PlanPro, feature: FeatureIPAllowlist, want: false},
		{name: "pro cannot use custom roles", plan: PlanPro, feature: FeatureCustomRoles, want: false},
		{name: "enterprise can use approvals", plan: PlanEnterprise, feature: FeatureApprovals, want: true},
		{name: "enterprise can use sso", plan: PlanEnterprise, feature: FeatureSSO, want: true},
		{name: "enterprise can use scim", plan: PlanEnterprise, feature: FeatureSCIM, want: true},
		{name: "enterprise can use ip allowlist", plan: PlanEnterprise, feature: FeatureIPAllowlist, want: true},
		{name: "enterprise can use custom roles", plan: PlanEnterprise, feature: FeatureCustomRoles, want: true},
		{name: "trial gets pro features", plan: PlanTrial, feature: FeatureApprovals, want: true},
		{name: "trial gets webhooks", plan: PlanTrial, feature: FeatureWebhooks, want: true},
		{name: "trial cannot use sso", plan: PlanTrial, feature: FeatureSSO, want: false},
		{name: "unknown feature is ungated", plan: PlanFree, feature: Feature("nonexistent"), want: true},
		{name: "unknown plan treated as rank 0", plan: "unknown", feature: FeatureApprovals, want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := IsFeatureEnabled(tc.plan, tc.feature)
			if got != tc.want {
				t.Errorf("IsFeatureEnabled(%q, %q) = %v, want %v", tc.plan, tc.feature, got, tc.want)
			}
		})
	}
}

func TestPlanFeatures(t *testing.T) {
	freeFeatures := PlanFeatures(PlanFree)
	if len(freeFeatures) != 0 {
		t.Errorf("free plan should have 0 gated features, got %d: %v", len(freeFeatures), freeFeatures)
	}

	proFeatures := PlanFeatures(PlanPro)
	if len(proFeatures) == 0 {
		t.Fatal("pro plan should have at least one gated feature")
	}
	for _, f := range proFeatures {
		if !IsFeatureEnabled(PlanPro, Feature(f)) {
			t.Errorf("PlanFeatures returned %q for pro but IsFeatureEnabled is false", f)
		}
	}

	entFeatures := PlanFeatures(PlanEnterprise)
	if len(entFeatures) <= len(proFeatures) {
		t.Errorf("enterprise should have more features than pro: ent=%d, pro=%d", len(entFeatures), len(proFeatures))
	}
}

func TestFeatureMinPlanName(t *testing.T) {
	if got := FeatureMinPlanName(FeatureApprovals); got != PlanPro {
		t.Errorf("approvals min plan = %q, want %q", got, PlanPro)
	}
	if got := FeatureMinPlanName(FeatureSSO); got != PlanEnterprise {
		t.Errorf("sso min plan = %q, want %q", got, PlanEnterprise)
	}
	if got := FeatureMinPlanName(Feature("nonexistent")); got != PlanFree {
		t.Errorf("unknown feature min plan = %q, want %q", got, PlanFree)
	}
}

func TestAllFeatures(t *testing.T) {
	all := AllFeatures()
	if len(all) != len(featureMinPlan) {
		t.Errorf("AllFeatures returned %d entries, want %d", len(all), len(featureMinPlan))
	}
	if _, ok := all[string(FeatureApprovals)]; !ok {
		t.Error("AllFeatures missing approvals")
	}
}
