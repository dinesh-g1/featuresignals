package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/hashicorp/terraform-plugin-framework-validators/setvalidator"
	"github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
	"github.com/hashicorp/terraform-plugin-framework/attr"
	"github.com/hashicorp/terraform-plugin-framework/diag"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/booldefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/boolplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/setdefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringdefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/hashicorp/terraform-plugin-log/tflog"
)

// Ensure the implementation satisfies the expected interfaces.
var (
	_ resource.Resource                = &FlagResource{}
	_ resource.ResourceWithConfigure   = &FlagResource{}
	_ resource.ResourceWithImportState = &FlagResource{}
)

// NewFlagResource is a helper function to create the resource.
func NewFlagResource() resource.Resource {
	return &FlagResource{}
}

// FlagResource defines the resource implementation.
type FlagResource struct {
	client *Client
}

// FlagResourceModel describes the resource data model.
type FlagResourceModel struct {
	ID           types.String `tfsdk:"id"`
	ProjectID    types.String `tfsdk:"project_id"`
	Key          types.String `tfsdk:"key"`
	Name         types.String `tfsdk:"name"`
	Description  types.String `tfsdk:"description"`
	FlagType     types.String `tfsdk:"flag_type"`
	Category     types.String `tfsdk:"category"`
	Status       types.String `tfsdk:"status"`
	DefaultValue types.String `tfsdk:"default_value"`
	Tags         types.Set    `tfsdk:"tags"`
	Enabled      types.Bool   `tfsdk:"enabled"`
	Environments types.List   `tfsdk:"environments"`
	CreatedAt    types.String `tfsdk:"created_at"`
	UpdatedAt    types.String `tfsdk:"updated_at"`
}

// environmentElementType defines the type for environment list elements.
var environmentElementType = types.ObjectType{
	AttrTypes: map[string]attr.Type{
		"key":     types.StringType,
		"enabled": types.BoolType,
		"rules":   types.StringType,
	},
}

// Metadata returns the resource type name.
func (r *FlagResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_flag"
}

// Schema defines the schema for the resource.
func (r *FlagResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		MarkdownDescription: "FeatureSignals flag resource. Manage feature flags and their per-environment configuration.",

		Attributes: map[string]schema.Attribute{
			"id": schema.StringAttribute{
				MarkdownDescription: "The unique identifier of the flag.",
				Computed:            true,
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.UseStateForUnknown(),
				},
			},
			"project_id": schema.StringAttribute{
				MarkdownDescription: "The project ID this flag belongs to.",
				Required:            true,
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.RequiresReplace(),
				},
			},
			"key": schema.StringAttribute{
				MarkdownDescription: "The unique key for the flag within the project. Must be URL-safe and unique.",
				Required:            true,
				Validators: []validator.String{
					stringvalidator.LengthAtLeast(1),
					stringvalidator.LengthAtMost(128),
				},
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.RequiresReplace(),
				},
			},
			"name": schema.StringAttribute{
				MarkdownDescription: "A human-readable name for the flag.",
				Optional:            true,
				Computed:            true,
			},
			"description": schema.StringAttribute{
				MarkdownDescription: "A description of what the flag controls.",
				Optional:            true,
				Computed:            true,
			},
			"flag_type": schema.StringAttribute{
				MarkdownDescription: "The type of flag. Valid values: `boolean`, `string`, `integer`, `float`, `json`.",
				Optional:            true,
				Computed:            true,
				Default:             stringdefault.StaticString("boolean"),
				Validators: []validator.String{
					stringvalidator.OneOf("boolean", "string", "integer", "float", "json"),
				},
			},
			"category": schema.StringAttribute{
				MarkdownDescription: "The category of flag. Valid values: `release`, `experiment`, `operational`, `permission`.",
				Optional:            true,
				Computed:            true,
				Default:             stringdefault.StaticString("release"),
				Validators: []validator.String{
					stringvalidator.OneOf("release", "experiment", "operational", "permission"),
				},
			},
			"status": schema.StringAttribute{
				MarkdownDescription: "The status of the flag. Valid values: `active`, `inactive`, `archived`.",
				Optional:            true,
				Computed:            true,
				Default:             stringdefault.StaticString("active"),
				Validators: []validator.String{
					stringvalidator.OneOf("active", "inactive", "archived"),
				},
			},
			"default_value": schema.StringAttribute{
				MarkdownDescription: "The default value for the flag, as a JSON string. Evaluated when no targeting rule matches.",
				Optional:            true,
				Computed:            true,
			},
			"tags": schema.SetAttribute{
				MarkdownDescription: "A set of tags for organizing flags. Example: `[\"team:frontend\", \"sprint:42\"]`.",
				ElementType:         types.StringType,
				Optional:            true,
				Computed:            true,
				Default:             setdefault.StaticValue(types.SetValueMust(types.StringType, []attr.Value{})),
				Validators: []validator.Set{
					setvalidator.SizeAtMost(50),
				},
			},
			"enabled": schema.BoolAttribute{
				MarkdownDescription: "Global enabled state for the flag. When false, the flag evaluates to its default value everywhere.",
				Optional:            true,
				Computed:            true,
				Default:             booldefault.StaticBool(false),
				PlanModifiers: []planmodifier.Bool{
					boolplanmodifier.UseStateForUnknown(),
				},
			},
			"environments": schema.ListAttribute{
				MarkdownDescription: "Per-environment configurations for the flag. Each element defines the state of the flag in a specific environment.",
				ElementType:         environmentElementType,
				Optional:            true,
				Computed:            true,
			},
			"created_at": schema.StringAttribute{
				MarkdownDescription: "Timestamp when the flag was created.",
				Computed:            true,
			},
			"updated_at": schema.StringAttribute{
				MarkdownDescription: "Timestamp when the flag was last updated.",
				Computed:            true,
			},
		},
	}
}

// Configure assigns the client from the provider.
func (r *FlagResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}

	client, ok := req.ProviderData.(*Client)
	if !ok {
		resp.Diagnostics.AddError(
			"Unexpected Resource Configure Type",
			fmt.Sprintf("Expected *Client, got: %T. Please report this bug.", req.ProviderData),
		)
		return
	}

	r.client = client
}

// Create creates a new flag.
func (r *FlagResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan FlagResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	tflog.Debug(ctx, "Creating flag", map[string]any{
		"project_id": plan.ProjectID.ValueString(),
		"key":        plan.Key.ValueString(),
	})

	// Build the create request
	createReq := FlagCreateRequest{
		ProjectID:    plan.ProjectID.ValueString(),
		Key:          plan.Key.ValueString(),
		Name:         plan.Name.ValueString(),
		Description:  plan.Description.ValueString(),
		FlagType:     plan.FlagType.ValueString(),
		Category:     plan.Category.ValueString(),
		Status:       plan.Status.ValueString(),
		DefaultValue: plan.DefaultValue.ValueString(),
		Enabled:      plan.Enabled.ValueBool(),
	}

	// Validate default_value as JSON if provided
	if plan.DefaultValue.ValueString() != "" {
		if !json.Valid([]byte(plan.DefaultValue.ValueString())) {
			resp.Diagnostics.AddAttributeError(
				path.Root("default_value"),
				"Invalid Default Value",
				"The default_value must be a valid JSON string.",
			)
			return
		}
	}

	// Tags
	if !plan.Tags.IsNull() {
		tags := make([]string, 0, len(plan.Tags.Elements()))
		diags = plan.Tags.ElementsAs(ctx, &tags, false)
		resp.Diagnostics.Append(diags...)
		if resp.Diagnostics.HasError() {
			return
		}
		createReq.Tags = tags
	}

	// Environments
	if !plan.Environments.IsNull() {
		envs, diags := environmentsFromTerraform(ctx, plan.Environments)
		resp.Diagnostics.Append(diags...)
		if resp.Diagnostics.HasError() {
			return
		}
		createReq.Environments = envs
	}

	// Execute API call
	flag, err := r.client.CreateFlag(ctx, createReq)
	if err != nil {
		resp.Diagnostics.AddError(
			"Error creating flag",
			fmt.Sprintf("Could not create flag %q: %s", plan.Key.ValueString(), err),
		)
		return
	}

	// Update state with the response
	diags = r.updateModelFromResponse(ctx, &plan, flag)
	resp.Diagnostics.Append(diags...)

	// Set state
	resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Read refreshes the state.
func (r *FlagResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state FlagResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	flagID := state.ID.ValueString()
	tflog.Debug(ctx, "Reading flag", map[string]any{
		"flag_id": flagID,
	})

	flag, err := r.client.GetFlag(ctx, flagID)
	if err != nil {
		if strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "not found") {
			tflog.Warn(ctx, "Flag not found, removing from state", map[string]any{
				"flag_id": flagID,
			})
			resp.State.RemoveResource(ctx)
			return
		}
		resp.Diagnostics.AddError(
			"Error reading flag",
			fmt.Sprintf("Could not read flag %q: %s", flagID, err),
		)
		return
	}

	diags = r.updateModelFromResponse(ctx, &state, flag)
	resp.Diagnostics.Append(diags...)

	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

// Update updates the flag.
func (r *FlagResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan FlagResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	flagID := plan.ID.ValueString()
	tflog.Debug(ctx, "Updating flag", map[string]any{
		"flag_id": flagID,
		"key":     plan.Key.ValueString(),
	})

	// Build the update request
	updateReq := FlagUpdateRequest{
		Name:         plan.Name.ValueString(),
		Description:  plan.Description.ValueString(),
		FlagType:     plan.FlagType.ValueString(),
		Category:     plan.Category.ValueString(),
		Status:       plan.Status.ValueString(),
		DefaultValue: plan.DefaultValue.ValueString(),
		Enabled:      boolPtr(plan.Enabled.ValueBool()),
	}

	// Validate default_value as JSON if provided
	if plan.DefaultValue.ValueString() != "" {
		if !json.Valid([]byte(plan.DefaultValue.ValueString())) {
			resp.Diagnostics.AddAttributeError(
				path.Root("default_value"),
				"Invalid Default Value",
				"The default_value must be a valid JSON string.",
			)
			return
		}
	}

	// Tags
	if !plan.Tags.IsNull() {
		tags := make([]string, 0, len(plan.Tags.Elements()))
		diags = plan.Tags.ElementsAs(ctx, &tags, false)
		resp.Diagnostics.Append(diags...)
		if resp.Diagnostics.HasError() {
			return
		}
		updateReq.Tags = tags
	}

	// Environments
	if !plan.Environments.IsNull() {
		envs, diags := environmentsFromTerraform(ctx, plan.Environments)
		resp.Diagnostics.Append(diags...)
		if resp.Diagnostics.HasError() {
			return
		}
		updateReq.Environments = envs
	}

	// Execute API call
	flag, err := r.client.UpdateFlag(ctx, flagID, updateReq)
	if err != nil {
		resp.Diagnostics.AddError(
			"Error updating flag",
			fmt.Sprintf("Could not update flag %q: %s", flagID, err),
		)
		return
	}

	diags = r.updateModelFromResponse(ctx, &plan, flag)
	resp.Diagnostics.Append(diags...)

	resp.Diagnostics.Append(resp.State.Set(ctx, &plan)...)
}

// Delete deletes the flag.
func (r *FlagResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state FlagResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	flagID := state.ID.ValueString()
	tflog.Debug(ctx, "Deleting flag", map[string]any{
		"flag_id": flagID,
	})

	err := r.client.DeleteFlag(ctx, flagID)
	if err != nil {
		resp.Diagnostics.AddError(
			"Error deleting flag",
			fmt.Sprintf("Could not delete flag %q: %s", flagID, err),
		)
		return
	}
}

// ImportState handles importing an existing flag.
func (r *FlagResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// updateModelFromResponse populates the model from an API response.
func (r *FlagResource) updateModelFromResponse(ctx context.Context, model *FlagResourceModel, flag *FlagResponse) diag.Diagnostics {
	var diags diag.Diagnostics

	model.ID = types.StringValue(flag.ID)
	model.ProjectID = types.StringValue(flag.ProjectID)
	model.Key = types.StringValue(flag.Key)
	model.Name = types.StringValue(flag.Name)
	model.Description = types.StringValue(flag.Description)
	model.FlagType = types.StringValue(flag.FlagType)
	model.Category = types.StringValue(flag.Category)
	model.Status = types.StringValue(flag.Status)
	model.DefaultValue = types.StringValue(flag.DefaultValue)
	model.Enabled = types.BoolValue(flag.Enabled)
	model.CreatedAt = types.StringValue(flag.CreatedAt)
	model.UpdatedAt = types.StringValue(flag.UpdatedAt)

	// Tags
	tagList := make([]attr.Value, len(flag.Tags))
	for i, t := range flag.Tags {
		tagList[i] = types.StringValue(t)
	}
	tags, d := types.SetValue(types.StringType, tagList)
	diags.Append(d...)
	model.Tags = tags

	// Environments
	if len(flag.Environments) > 0 {
		envObjects := make([]attr.Value, len(flag.Environments))
		for i, env := range flag.Environments {
			obj, d := types.ObjectValue(environmentElementType.AttrTypes, map[string]attr.Value{
				"key":     types.StringValue(env.Key),
				"enabled": types.BoolValue(env.Enabled),
				"rules":   types.StringValue(env.Rules),
			})
			diags.Append(d...)
			envObjects[i] = obj
		}
		envs, d := types.ListValue(environmentElementType, envObjects)
		diags.Append(d...)
		model.Environments = envs
	} else {
		model.Environments = types.ListNull(environmentElementType)
	}

	return diags
}

// environmentsFromTerraform converts a Terraform list of environment objects to a slice of FlagEnvironment.
func environmentsFromTerraform(ctx context.Context, envList types.List) ([]FlagEnvironment, diag.Diagnostics) {
	var diags diag.Diagnostics
	envs := make([]FlagEnvironment, 0, len(envList.Elements()))

	for i, elem := range envList.Elements() {
		obj, ok := elem.(types.Object)
		if !ok {
			diags.AddAttributeError(
				path.Root("environments").AtListIndex(i),
				"Invalid Environment",
				"Each environment entry must be an object.",
			)
			continue
		}

		attrs := obj.Attributes()
		env := FlagEnvironment{
			Key:     attrs["key"].(types.String).ValueString(),
			Enabled: attrs["enabled"].(types.Bool).ValueBool(),
			Rules:   attrs["rules"].(types.String).ValueString(),
		}

		// Validate the environment key
		if env.Key == "" {
			diags.AddAttributeError(
				path.Root("environments").AtListIndex(i).AtName("key"),
				"Missing Environment Key",
				"Each environment must have a non-empty key.",
			)
			continue
		}

		envs = append(envs, env)
	}

	return envs, diags
}

// boolPtr returns a pointer to the given bool.
func boolPtr(b bool) *bool {
	return &b
}