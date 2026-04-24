package provider

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hashicorp/terraform-plugin-framework/datasource"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/provider"
	"github.com/hashicorp/terraform-plugin-framework/provider/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/hashicorp/terraform-plugin-log/tflog"
)

// Ensure the provider satisfies the provider.Provider interface.
var _ provider.Provider = &FeaturesignalsProvider{}

// FeaturesignalsProvider is the provider implementation.
type FeaturesignalsProvider struct {
	version string
}

// FeaturesignalsProviderModel describes the provider data model.
type FeaturesignalsProviderModel struct {
	Host   types.String `tfsdk:"host"`
	APIKey types.String `tfsdk:"api_key"`
}

// New is a helper function to create the provider instance.
func New() provider.Provider {
	return &FeaturesignalsProvider{
		version: "0.1.0",
	}
}

// Metadata returns the provider metadata.
func (p *FeaturesignalsProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
	resp.TypeName = "featuresignals"
	resp.Version = p.version
}

// Schema defines the provider-level schema.
func (p *FeaturesignalsProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
	resp.Schema = schema.Schema{
		MarkdownDescription: "The FeatureSignals provider manages feature flags and related resources. " +
			"Configure the provider with an API key to interact with the FeatureSignals API.",

		Attributes: map[string]schema.Attribute{
			"host": schema.StringAttribute{
				MarkdownDescription: "The FeatureSignals API host URL. Defaults to `https://api.featuresignals.com`. " +
					"Can also be set via the `FEATURESIGNALS_HOST` environment variable.",
				Optional: true,
			},
			"api_key": schema.StringAttribute{
				MarkdownDescription: "The API key for FeatureSignals authentication. " +
					"Can also be set via the `FEATURESIGNALS_API_KEY` environment variable.",
				Required:  true,
				Sensitive: true,
			},
		},
	}
}

// Configure prepares the FeatureSignals API client for data sources and resources.
func (p *FeaturesignalsProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
	tflog.Info(ctx, "Configuring FeatureSignals provider")

	// Retrieve provider configuration
	var config FeaturesignalsProviderModel
	diags := req.Config.Get(ctx, &config)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Default host
	host := "https://api.featuresignals.com"
	if !config.Host.IsNull() {
		host = config.Host.ValueString()
	}

	// Clean up the host URL
	host = strings.TrimRight(host, "/")

	apiKey := config.APIKey.ValueString()

	// Validation
	if apiKey == "" {
		resp.Diagnostics.AddAttributeError(
			path.Root("api_key"),
			"Missing API Key",
			"The provider requires an API key for authentication. "+
				"Set it in the provider block or via the FEATURESIGNALS_API_KEY environment variable.",
		)
		return
	}

	// Build the HTTP client
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        10,
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  false,
		},
	}

	client := NewClient(httpClient, host, apiKey)

	// Verify the API key by making a test request
	healthy, err := client.HealthCheck(ctx)
	if err != nil || !healthy {
		resp.Diagnostics.AddWarning(
			"Unable to reach FeatureSignals API",
			fmt.Sprintf(
				"The provider could not reach the FeatureSignals API at %s. "+
					"Terraform will proceed, but resource operations may fail. Error: %s",
				host, err,
			),
		)
	}

	// Make the client available via a context value
	resp.DataSourceData = client
	resp.ResourceData = client

	tflog.Debug(ctx, "FeatureSignals provider configured successfully", map[string]any{
		"host": host,
	})
}

// DataSources returns the data sources supported by the provider.
func (p *FeaturesignalsProvider) DataSources(_ context.Context) []func() datasource.DataSource {
	return []func() datasource.DataSource{
		NewFlagsDataSource,
	}
}

// Resources returns the resources supported by the provider.
func (p *FeaturesignalsProvider) Resources(_ context.Context) []func() resource.Resource {
	return []func() resource.Resource{
		NewFlagResource,
	}
}