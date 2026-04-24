package provider

import (
	"context"
	"fmt"

	"github.com/hashicorp/terraform-plugin-framework/attr"
	"github.com/hashicorp/terraform-plugin-framework/datasource"
	"github.com/hashicorp/terraform-plugin-framework/datasource/schema"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/hashicorp/terraform-plugin-log/tflog"
)

// Ensure the implementation satisfies the expected interfaces.
var (
	_ datasource.DataSource              = &FlagsDataSource{}
	_ datasource.DataSourceWithConfigure = &FlagsDataSource{}
)

// NewFlagsDataSource is a helper function to create the data source.
func NewFlagsDataSource() datasource.DataSource {
	return &FlagsDataSource{}
}

// FlagsDataSource defines the data source implementation.
type FlagsDataSource struct {
	client *Client
}

// FlagsDataSourceModel describes the data source data model.
type FlagsDataSourceModel struct {
	ProjectID types.String       `tfsdk:"project_id"`
	Flags     []FlagResourceModel `tfsdk:"flags"`
}

// Metadata returns the data source type name.
func (d *FlagsDataSource) Metadata(_ context.Context, req datasource.MetadataRequest, resp *datasource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_flags"
}

// Schema defines the schema for the data source.
func (d *FlagsDataSource) Schema(_ context.Context, _ datasource.SchemaRequest, resp *datasource.SchemaResponse) {
	resp.Schema = schema.Schema{
		MarkdownDescription: "Fetches the list of feature flags from FeatureSignals for a given project.",

		Attributes: map[string]schema.Attribute{
			"project_id": schema.StringAttribute{
				MarkdownDescription: "The project ID to list flags for.",
				Required:            true,
			},
			"flags": schema.ListNestedAttribute{
				MarkdownDescription: "The list of flags in the project.",
				Computed:            true,
				NestedObject: schema.NestedAttributeObject{
					Attributes: map[string]schema.Attribute{
						"id": schema.StringAttribute{
							MarkdownDescription: "The unique identifier of the flag.",
							Computed:            true,
						},
						"project_id": schema.StringAttribute{
							MarkdownDescription: "The project ID this flag belongs to.",
							Computed:            true,
						},
						"key": schema.StringAttribute{
							MarkdownDescription: "The unique key for the flag within the project.",
							Computed:            true,
						},
						"name": schema.StringAttribute{
							MarkdownDescription: "A human-readable name for the flag.",
							Computed:            true,
						},
						"description": schema.StringAttribute{
							MarkdownDescription: "A description of what the flag controls.",
							Computed:            true,
						},
						"flag_type": schema.StringAttribute{
							MarkdownDescription: "The type of the flag.",
							Computed:            true,
						},
						"category": schema.StringAttribute{
							MarkdownDescription: "The category of the flag.",
							Computed:            true,
						},
						"status": schema.StringAttribute{
							MarkdownDescription: "The status of the flag.",
							Computed:            true,
						},
						"default_value": schema.StringAttribute{
							MarkdownDescription: "The default value as a JSON string.",
							Computed:            true,
						},
						"tags": schema.SetAttribute{
							MarkdownDescription: "Tags associated with the flag.",
							ElementType:         types.StringType,
							Computed:            true,
						},
						"enabled": schema.BoolAttribute{
							MarkdownDescription: "Global enabled state for the flag.",
							Computed:            true,
						},
						"environments": schema.ListNestedAttribute{
							MarkdownDescription: "Per-environment configurations.",
							Computed:            true,
							NestedObject: schema.NestedAttributeObject{
								Attributes: map[string]schema.Attribute{
									"key": schema.StringAttribute{
										Computed: true,
									},
									"enabled": schema.BoolAttribute{
										Computed: true,
									},
									"rules": schema.StringAttribute{
										Computed: true,
									},
								},
							},
						},
						"created_at": schema.StringAttribute{
							Computed: true,
						},
						"updated_at": schema.StringAttribute{
							Computed: true,
						},
					},
				},
			},
		},
	}
}

// Configure assigns the client from the provider.
func (d *FlagsDataSource) Configure(_ context.Context, req datasource.ConfigureRequest, resp *datasource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}

	client, ok := req.ProviderData.(*Client)
	if !ok {
		resp.Diagnostics.AddError(
			"Unexpected Data Source Configure Type",
			fmt.Sprintf("Expected *Client, got: %T. Please report this bug.", req.ProviderData),
		)
		return
	}

	d.client = client
}

// Read refreshes the data source state.
func (d *FlagsDataSource) Read(ctx context.Context, req datasource.ReadRequest, resp *datasource.ReadResponse) {
	var config FlagsDataSourceModel
	diags := req.Config.Get(ctx, &config)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	projectID := config.ProjectID.ValueString()
	tflog.Debug(ctx, "Reading flags for project", map[string]any{
		"project_id": projectID,
	})

	flags, err := d.client.ListFlags(ctx, projectID)
	if err != nil {
		resp.Diagnostics.AddError(
			"Error reading flags",
			fmt.Sprintf("Could not list flags for project %q: %s", projectID, err),
		)
		return
	}

	// Map API response to Terraform model
	flagModels := make([]FlagResourceModel, 0, len(flags))
	for _, f := range flags {
		model := FlagResourceModel{}
		model.ID = types.StringValue(f.ID)
		model.ProjectID = types.StringValue(f.ProjectID)
		model.Key = types.StringValue(f.Key)
		model.Name = types.StringValue(f.Name)
		model.Description = types.StringValue(f.Description)
		model.FlagType = types.StringValue(f.FlagType)
		model.Category = types.StringValue(f.Category)
		model.Status = types.StringValue(f.Status)
		model.DefaultValue = types.StringValue(f.DefaultValue)
		model.Enabled = types.BoolValue(f.Enabled)
		model.CreatedAt = types.StringValue(f.CreatedAt)
		model.UpdatedAt = types.StringValue(f.UpdatedAt)

		// Tags
		tagVals := make([]attr.Value, len(f.Tags))
		for i, t := range f.Tags {
			tagVals[i] = types.StringValue(t)
		}
		tags, d := types.SetValue(types.StringType, tagVals)
		resp.Diagnostics.Append(d...)
		model.Tags = tags

		// Environments - use list nested from the data source schema
		if len(f.Environments) > 0 {
			envObjs := make([]attr.Value, len(f.Environments))
			for i, env := range f.Environments {
				obj, d := types.ObjectValue(
					map[string]attr.Type{
						"key":     types.StringType,
						"enabled": types.BoolType,
						"rules":   types.StringType,
					},
					map[string]attr.Value{
						"key":     types.StringValue(env.Key),
						"enabled": types.BoolValue(env.Enabled),
						"rules":   types.StringValue(env.Rules),
					},
				)
				resp.Diagnostics.Append(d...)
				envObjs[i] = obj
			}
			envs, d := types.ListValue(
				types.ObjectType{
					AttrTypes: map[string]attr.Type{
						"key":     types.StringType,
						"enabled": types.BoolType,
						"rules":   types.StringType,
					},
				},
				envObjs,
			)
			resp.Diagnostics.Append(d...)
			model.Environments = envs
		} else {
			model.Environments = types.ListNull(
				types.ObjectType{
					AttrTypes: map[string]attr.Type{
						"key":     types.StringType,
						"enabled": types.BoolType,
						"rules":   types.StringType,
					},
				},
			)
		}

		flagModels = append(flagModels, model)
	}

	config.Flags = flagModels

	resp.Diagnostics.Append(resp.State.Set(ctx, &config)...)
}