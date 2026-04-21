"use client";

import { useState } from "react";
import { X, ArrowLeft, ArrowRight, Check, Building, Shield, Server, Eye } from "lucide-react";
import { createCustomer, createLicense, environments } from "@/lib/api";
import type { Customer, License, CustomerEnvironment } from "@/lib/types";

interface OnboardingWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "customer" | "plan" | "deployment" | "review";

export function OnboardingWizard({ onClose, onSuccess }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [createdLicenseId, setCreatedLicenseId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    // Step 1: Customer Information
    name: "",
    slug: "",
    contactEmail: "",
    contactName: "",
    companySize: "1-10",

    // Step 2: Plan & Licensing
    plan: "pro" as "free" | "trial" | "pro" | "enterprise",
    billingCycle: "monthly" as "monthly" | "annual",
    maxSeats: 10,
    maxProjects: 3,
    maxEnvironments: 2,
    maxEvaluationsPerMonth: 1000000,
    maxApiCallsPerMonth: 100000,
    licenseDurationMonths: 12,

    // Step 3: Deployment Configuration
    deploymentModel: "isolated" as "shared" | "isolated" | "onprem",
    vpsType: "cpx11" as "cpx11" | "cpx21" | "cpx31" | "cpx41",
    region: "us-east" as "us-east" | "eu-central" | "asia-southeast",
    subdomain: "",
    customDomain: "",
    enableSupport: true,
    enableBackups: true,
  });

  const steps: { id: Step; title: string; description: string; icon: React.ReactNode }[] = [
    {
      id: "customer",
      title: "Customer Information",
      description: "Basic organization details",
      icon: <Building className="h-5 w-5" />,
    },
    {
      id: "plan",
      title: "Plan & Licensing",
      description: "Select plan and set limits",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: "deployment",
      title: "Deployment",
      description: "Configure infrastructure",
      icon: <Server className="h-5 w-5" />,
    },
    {
      id: "review",
      title: "Review & Create",
      description: "Confirm and provision",
      icon: <Eye className="h-5 w-5" />,
    },
  ];

  const vpsTypes = [
    { id: "cpx11", name: "Small (2 vCPU, 2GB RAM)", cost: 20 },
    { id: "cpx21", name: "Medium (3 vCPU, 4GB RAM)", cost: 40 },
    { id: "cpx31", name: "Large (4 vCPU, 8GB RAM)", cost: 80 },
    { id: "cpx41", name: "X-Large (8 vCPU, 16GB RAM)", cost: 160 },
  ];

  const regions = [
    { id: "us-east", name: "US East (N. Virginia)" },
    { id: "eu-central", name: "EU Central (Germany)" },
    { id: "asia-southeast", name: "Asia Southeast (Singapore)" },
  ];

  const planLimits = {
    free: { seats: 3, projects: 1, environments: 1, evaluations: 10000 },
    trial: { seats: 5, projects: 2, environments: 2, evaluations: 50000 },
    pro: { seats: 10, projects: 3, environments: 2, evaluations: 1000000 },
    enterprise: { seats: 50, projects: 10, environments: 5, evaluations: 10000000 },
  };

  // Auto-generate slug from name
  const updateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((prev) => ({ ...prev, slug, subdomain: slug || "" }));
  };

  const handleNext = () => {
    setError(null);
    const stepsOrder: Step[] = ["customer", "plan", "deployment", "review"];
    const currentIndex = stepsOrder.indexOf(currentStep);
    if (currentIndex < stepsOrder.length - 1) {
      setCurrentStep(stepsOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepsOrder: Step[] = ["customer", "plan", "deployment", "review"];
    const currentIndex = stepsOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepsOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create organization
      const orgResponse = await createCustomer({
        name: form.name,
        slug: form.slug || undefined,
        plan: form.plan,
        data_region: form.region.split("-")[0], // Extract region prefix (us, eu, asia)
      });

      const orgId = orgResponse.id;
      setCreatedOrgId(orgId);

      // Step 2: Create license
      const licenseResponse = await createLicense({
        org_id: orgId,
        customer_name: form.name,
        customer_email: form.contactEmail || undefined,
        plan: form.plan,
        billing_cycle: form.billingCycle,
        max_seats: form.maxSeats,
        max_projects: form.maxProjects,
        max_environments: form.maxEnvironments,
        max_evaluations_per_month: form.maxEvaluationsPerMonth,
        max_api_calls_per_month: form.maxApiCallsPerMonth,
      });

      setCreatedLicenseId(licenseResponse.id);

      // Step 3: Provision environment if isolated deployment
      if (form.deploymentModel === "isolated") {
        await environments.provision({
          customer_name: form.name,
          org_id: orgId,
          vps_type: form.vpsType,
          region: form.region,
          plan: form.plan,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create customer";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "customer":
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Organization Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  updateSlug(e.target.value);
                }}
                placeholder="Acme Corporation"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Slug (auto-generated)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="acme-corp"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Used in URLs. Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="billing@acme.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="Jane Doe"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Company Size
              </label>
              <select
                value={form.companySize}
                onChange={(e) => setForm({ ...form, companySize: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501+">501+ employees</option>
              </select>
            </div>
          </div>
        );

      case "plan":
        const limits = planLimits[form.plan];
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Plan *
              </label>
              <select
                value={form.plan}
                onChange={(e) => {
                  const newPlan = e.target.value as typeof form.plan;
                  setForm({
                    ...form,
                    plan: newPlan,
                    maxSeats: planLimits[newPlan].seats,
                    maxProjects: planLimits[newPlan].projects,
                    maxEnvironments: planLimits[newPlan].environments,
                    maxEvaluationsPerMonth: planLimits[newPlan].evaluations,
                  });
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="free">Free (Self-Service)</option>
                <option value="trial">Trial (14 days)</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {form.plan === "free" && "Core features only, no support"}
                {form.plan === "trial" && "Full platform access for 14 days"}
                {form.plan === "pro" && "Production-ready with standard support"}
                {form.plan === "enterprise" && "Full platform with premium support & SLAs"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Billing Cycle
                </label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm({ ...form, billingCycle: e.target.value as "monthly" | "annual" })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual (Save 20%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  License Duration (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={form.licenseDurationMonths}
                  onChange={(e) => setForm({ ...form, licenseDurationMonths: parseInt(e.target.value) || 12 })}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-300">Resource Limits</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Max Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxSeats}
                    onChange={(e) => setForm({ ...form, maxSeats: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Max Projects</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxProjects}
                    onChange={(e) => setForm({ ...form, maxProjects: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Max Environments</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxEnvironments}
                    onChange={(e) => setForm({ ...form, maxEnvironments: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Evals/Month</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={form.maxEvaluationsPerMonth}
                    onChange={(e) => setForm({ ...form, maxEvaluationsPerMonth: parseInt(e.target.value) || 1000 })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "deployment":
        const selectedVps = vpsTypes.find(v => v.id === form.vpsType);
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Deployment Model *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["shared", "isolated", "onprem"] as const).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setForm({ ...form, deploymentModel: model })}
                    className={`rounded-lg border p-3 text-center transition ${
                      form.deploymentModel === model
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    <div className="text-xs font-medium capitalize">{model}</div>
                    <div className="mt-1 text-xs">
                      {model === "shared" && "Multi-tenant"}
                      {model === "isolated" && "Dedicated VPS"}
                      {model === "onprem" && "Self-hosted"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {form.deploymentModel === "isolated" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    VPS Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {vpsTypes.map((vps) => (
                      <button
                        key={vps.id}
                        type="button"
                        onClick={() => setForm({ ...form, vpsType: vps.id as typeof form.vpsType })}
                        className={`rounded-lg border p-3 text-left transition ${
                          form.vpsType === vps.id
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                        }`}
                      >
                        <div className="text-xs font-medium">{vps.name}</div>
                        <div className="mt-1 text-xs">${vps.cost}/month</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    Region *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {regions.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => setForm({ ...form, region: region.id as typeof form.region })}
                        className={`rounded-lg border p-3 text-center transition ${
                          form.region === region.id
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                        }`}
                      >
                        <div className="text-xs font-medium">{region.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Subdomain
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={form.subdomain}
                        onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                        placeholder={form.slug}
                        className="w-full rounded-l-lg border border-r-0 border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex items-center rounded-r-lg border border-l-0 border-gray-700 bg-gray-900 px-3 text-sm text-gray-400">
                        .featuresignals.com
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Custom Domain (optional)
                    </label>
                    <input
                      type="text"
                      value={form.customDomain}
                      onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                      placeholder="flags.acme.com"
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Additional Services</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableBackups"
                      checked={form.enableBackups}
                      onChange={(e) => setForm({ ...form, enableBackups: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="enableBackups" className="text-sm text-gray-400">
                      Enable Daily Backups (+$10/month)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableSupport"
                      checked={form.enableSupport}
                      onChange={(e) => setForm({ ...form, enableSupport: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="enableSupport" className="text-sm text-gray-400">
                      Priority Support (+$50/month)
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-300">Cost Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">VPS ({selectedVps?.name})</span>
                      <span className="text-gray-300">${selectedVps?.cost}/month</span>
                    </div>
                    {form.enableBackups && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Daily Backups</span>
                        <span className="text-gray-300">$10/month</span>
                      </div>
                    )}
                    {form.enableSupport && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Priority Support</span>
                        <span className="text-gray-300">$50/month</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-gray-800 pt-2">
                      <span className="font-medium text-gray-300">Total Monthly Cost</span>
                      <span className="font-medium text-white">
                        $
                        {selectedVps!.cost +
                          (form.enableBackups ? 10 : 0) +
                          (form.enableSupport ? 50 : 0)}
                        /month
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "review":
        const selectedVpsReview = vpsTypes.find(v => v.id === form.vpsType);
        const selectedRegion = regions.find(r => r.id === form.region);

        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-300">Customer Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Organization</p>
                  <p className="text-white">{form.name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Slug</p>
                  <p className="text-white">{form.slug || "(auto-generated)"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Contact</p>
                  <p className="text-white">{form.contactName || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email</p>
                  <p className="text-white">{form.contactEmail || "Not specified"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-300">Plan & License</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Plan</p>
                  <p className="text-white capitalize">{form.plan}</p>
                </div>
                <div>
                  <p className="text-gray-400">Billing Cycle</p>
                  <p className="text-white capitalize">{form.billingCycle}</p>
                </div>
                <div>
                  <p className="text-gray-400">Max Seats</p>
                  <p className="text-white">{form.maxSeats}</p>
                </div>
                <div>
                  <p className="text-gray-400">Max Environments</p>
                  <p className="text-white">{form.maxEnvironments}</p>
                </div>
                <div>
                  <p className="text-gray-400">License Duration</p>
                  <p className="text-white">{form.licenseDurationMonths} months</p>
                </div>
                <div>
                  <p className="text-gray-400">Max Evaluations</p>
                  <p className="text-white">{form.maxEvaluationsPerMonth.toLocaleString()}/month</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-300">Deployment</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Model</p>
                  <p className="text-white capitalize">{form.deploymentModel}</p>
                </div>
                {form.deploymentModel === "isolated" && (
                  <>
                    <div>
                      <p className="text-gray-400">VPS Type</p>
                      <p className="text-white">{selectedVpsReview?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Region</p>
                      <p className="text-white">{selectedRegion?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Subdomain</p>
                      <p className="text-white">{form.subdomain || form.slug}.featuresignals.com</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Monthly Cost</p>
                      <p className="text-white">
                        $
                        {selectedVpsReview!.cost +
                          (form.enableBackups ? 10 : 0) +
                          (form.enableSupport ? 50 : 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {createdOrgId && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    Organization created successfully (ID: {createdOrgId.slice(0, 8)}...)
                  </span>
                </div>
              </div>
            )}

            {createdLicenseId && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    License created successfully
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> {form.deploymentModel === "isolated"
                  ? "VPS provisioning will take approximately 15 minutes. The customer will receive an email with login instructions once complete."
                  : "The customer will receive an email with login instructions immediately."}
              </p>
            </div>
          </div>
        );
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case "customer":
        return form.name.trim().length > 0;
      case "plan":
        return form.plan && form.maxSeats > 0 && form.maxEvaluationsPerMonth > 0;
      case "deployment":
        if (form.deploymentModel === "isolated") {
          return form.vpsType && form.region && (form.subdomain || form.slug);
        }
        return true;
      case "review":
        return true;
    }
  };

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Create Enterprise Customer</h2>
              <p className="mt-1 text-sm text-gray-400">
                Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="mt-6 flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (index <= currentStepIndex) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`flex items-center gap-2 ${index <= currentStepIndex ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      index < currentStepIndex
                        ? "bg-green-500 text-white"
                        : index === currentStepIndex
                        ? "bg-blue-500 text-white"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="hidden text-left sm:block">
                    <div
                      className={`text-xs font-medium ${
                        index <= currentStepIndex ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`ml-2 h-0.5 flex-1 sm:ml-4 ${
                      index < currentStepIndex ? "bg-green-500" : "bg-gray-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStep()}

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={currentStepIndex === 0 ? onClose : handleBack}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
              disabled={loading}
            >
              {currentStepIndex === 0 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="mr-2 inline h-4 w-4" />
                  Back
                </>
              )}
            </button>

            <button
              type="button"
              onClick={currentStepIndex === steps.length - 1 ? handleSubmit : handleNext}
              disabled={loading || !isStepValid()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                "Processing..."
              ) : currentStepIndex === steps.length - 1 ? (
                <>
                  <Check className="mr-2 inline h-4 w-4" />
                  Create Customer
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
