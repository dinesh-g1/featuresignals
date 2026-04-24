package provider

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/hashicorp/terraform-plugin-framework/providerserver"
	"github.com/hashicorp/terraform-plugin-go/tfprotov6"
	"github.com/hashicorp/terraform-plugin-testing/helper/resource"
	"github.com/hashicorp/terraform-plugin-testing/terraform"
)

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

// testAccProviderFactories returns a set of ProtoV6 provider factories backed
// by an httptest.Server that mocks the FeatureSignals API, along with the
// full URL of the test server for use in provider HCL configuration.
func testAccProviderFactories(t *testing.T, mux *http.ServeMux) (map[string]func() (tfprotov6.ProviderServer, error), string) {
	t.Helper()

	ts := httptest.NewServer(mux)
	t.Cleanup(ts.Close)

	factories := map[string]func() (tfprotov6.ProviderServer, error){
		"featuresignals": providerserver.NewProtocol6WithError(New()),
	}

	return factories, ts.URL
}

// providerConfig returns a provider configuration HCL block pointing at the
// given test server URL.
func providerConfig(hostURL string) string {
	return fmt.Sprintf(`
provider "featuresignals" {
  host    = "%s"
  api_key = "test-api-key"
}
`, hostURL)
}

// ---------------------------------------------------------------------------
// Mock handler helpers
// ---------------------------------------------------------------------------

// registerFlagHandlers registers HTTP handlers on the provided mux that
// simulate the FeatureSignals REST API for flag CRUD operations and listing.
// All state is kept in-memory and scoped to the caller-supplied mux.
func registerFlagHandlers(mux *http.ServeMux) {
	flags := make(map[string]FlagResponse)

	// POST /v1/flags — Create flag
	mux.HandleFunc("POST /v1/flags", func(w http.ResponseWriter, r *http.Request) {
		var req FlagCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}

		id := "flag_" + req.Key
		flag := FlagResponse{
			ID:           id,
			ProjectID:    req.ProjectID,
			Key:          req.Key,
			Name:         req.Name,
			Description:  req.Description,
			FlagType:     req.FlagType,
			Category:     req.Category,
			Status:       req.Status,
			DefaultValue: req.DefaultValue,
			Tags:         req.Tags,
			Enabled:      req.Enabled,
			Environments: req.Environments,
			CreatedAt:    "2025-01-01T00:00:00Z",
			UpdatedAt:    "2025-01-01T00:00:00Z",
		}

		// Apply defaults if not provided
		if flag.FlagType == "" {
			flag.FlagType = "boolean"
		}
		if flag.Category == "" {
			flag.Category = "release"
		}
		if flag.Status == "" {
			flag.Status = "active"
		}
		if flag.DefaultValue == "" {
			flag.DefaultValue = "false"
		}
		if len(flag.Tags) == 0 {
			flag.Tags = []string{}
		}

		flags[id] = flag

		writeJSON(w, http.StatusCreated, flag)
	})

	// GET /v1/flags/{id} — Get single flag
	mux.HandleFunc("GET /v1/flags/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		flag, ok := flags[id]
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "flag not found"})
			return
		}
		writeJSON(w, http.StatusOK, flag)
	})

	// PUT /v1/flags/{id} — Update flag
	mux.HandleFunc("PUT /v1/flags/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		existing, ok := flags[id]
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "flag not found"})
			return
		}

		var req FlagUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}

		if req.Name != "" {
			existing.Name = req.Name
		}
		if req.Description != "" {
			existing.Description = req.Description
		}
		if req.FlagType != "" {
			existing.FlagType = req.FlagType
		}
		if req.Category != "" {
			existing.Category = req.Category
		}
		if req.Status != "" {
			existing.Status = req.Status
		}
		if req.DefaultValue != "" {
			existing.DefaultValue = req.DefaultValue
		}
		if req.Tags != nil {
			existing.Tags = req.Tags
		}
		if req.Enabled != nil {
			existing.Enabled = *req.Enabled
		}
		if req.Environments != nil {
			existing.Environments = req.Environments
		}
		existing.UpdatedAt = "2025-06-01T00:00:00Z"

		flags[id] = existing
		writeJSON(w, http.StatusOK, existing)
	})

	// DELETE /v1/flags/{id} — Delete flag
	mux.HandleFunc("DELETE /v1/flags/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if _, ok := flags[id]; !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "flag not found"})
			return
		}
		delete(flags, id)
		w.WriteHeader(http.StatusNoContent)
	})

	// GET /v1/flags — List flags (filtered by ?project_id)
	mux.HandleFunc("GET /v1/flags", func(w http.ResponseWriter, r *http.Request) {
		projectID := r.URL.Query().Get("project_id")
		var result []FlagResponse
		for _, f := range flags {
			if projectID == "" || f.ProjectID == projectID {
				result = append(result, f)
			}
		}
		if result == nil {
			result = []FlagResponse{}
		}
		writeJSON(w, http.StatusOK, ListFlagsResponse{Data: result, Total: len(result)})
	})

	// GET /health — Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
}

// writeJSON is a helper that writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, statusCode int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(v)
}

// ---------------------------------------------------------------------------
// Acceptance tests
// ---------------------------------------------------------------------------

func TestAccFlagResource_Create(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id   = "proj_create"
  key          = "test-flag"
  name         = "Test Flag"
  description  = "A test flag description"
  flag_type    = "boolean"
  category     = "release"
  default_value = "false"
  tags         = ["team:test"]
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("featuresignals_flag.test", "project_id", "proj_create"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "key", "test-flag"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "name", "Test Flag"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "description", "A test flag description"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "flag_type", "boolean"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "category", "release"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "status", "active"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "default_value", "false"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "enabled", "false"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "tags.#", "1"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "tags.0", "team:test"),
					resource.TestCheckResourceAttrSet("featuresignals_flag.test", "id"),
					resource.TestCheckResourceAttrSet("featuresignals_flag.test", "created_at"),
					resource.TestCheckResourceAttrSet("featuresignals_flag.test", "updated_at"),
					testAccCheckFlagExists("featuresignals_flag.test", "flag_test-flag"),
				),
			},
		},
	})
}

func TestAccFlagResource_Update(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			// Step 1: Create initial flag
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_update"
  key           = "update-flag"
  name          = "Original Name"
  description   = "Original description"
  flag_type     = "boolean"
  category      = "release"
  default_value = "false"
  tags          = ["team:test"]
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("featuresignals_flag.test", "name", "Original Name"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "description", "Original description"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "default_value", "false"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "enabled", "false"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "tags.#", "1"),
				),
			},
			// Step 2: Update name, description, tags, enable, default_value
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_update"
  key           = "update-flag"
  name          = "Updated Name"
  description   = "Updated description"
  flag_type     = "boolean"
  category      = "release"
  default_value = "true"
  enabled       = true
  tags          = ["team:test", "sprint:42"]
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("featuresignals_flag.test", "name", "Updated Name"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "description", "Updated description"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "default_value", "true"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "enabled", "true"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "tags.#", "2"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "tags.0", "team:test"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "tags.1", "sprint:42"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "id", "flag_update-flag"),
				),
			},
		},
	})
}

func TestAccFlagResource_Delete(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			// Create flag — it will be destroyed at the end of the test
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_delete"
  key           = "delete-flag"
  name          = "To Be Deleted"
  default_value = "false"
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("featuresignals_flag.test", "key", "delete-flag"),
					resource.TestCheckResourceAttrSet("featuresignals_flag.test", "id"),
					testAccCheckFlagExists("featuresignals_flag.test", "flag_delete-flag"),
				),
			},
		},
	})
}

func TestAccFlagResource_WithEnvironments(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_env"
  key           = "env-flag"
  name          = "Environment Flag"
  default_value = "false"

  environments = [
    {
      key     = "production"
      enabled = false
      rules   = jsonencode([])
    },
    {
      key     = "staging"
      enabled = true
      rules   = jsonencode([])
    }
  ]
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("featuresignals_flag.test", "project_id", "proj_env"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "key", "env-flag"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "environments.#", "2"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "environments.0.key", "production"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "environments.0.enabled", "false"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "environments.1.key", "staging"),
					resource.TestCheckResourceAttr("featuresignals_flag.test", "environments.1.enabled", "true"),
				),
			},
		},
	})
}

func TestAccFlagResource_ImportState(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			// Step 1: Create a flag to import
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_import"
  key           = "import-flag"
  name          = "Import Flag"
  default_value = "true"
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("featuresignals_flag.test", "id", "flag_import-flag"),
				),
			},
			// Step 2: Import by ID
			{
				ResourceName:            "featuresignals_flag.test",
				ImportState:             true,
				ImportStateVerify:       true,
				ImportStateVerifyIgnore: []string{"project_id"},
			},
		},
	})
}

func TestAccFlagResource_Validation(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			// Invalid flag_type
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id = "proj_val"
  key        = "invalid-type-flag"
  flag_type  = "invalid"
}
`,
				ExpectError: regexp.MustCompile(`Invalid Attribute Value`),
			},
			// Invalid category
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id = "proj_val"
  key        = "invalid-cat-flag"
  category   = "unknown"
}
`,
				ExpectError: regexp.MustCompile(`Invalid Attribute Value`),
			},
			// Invalid status
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id = "proj_val"
  key        = "invalid-status-flag"
  status     = "deleted"
}
`,
				ExpectError: regexp.MustCompile(`Invalid Attribute Value`),
			},
			// Empty key
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id = "proj_val"
  key        = ""
}
`,
				ExpectError: regexp.MustCompile(`Invalid Attribute Value`),
			},
		},
	})
}

func TestAccFlagsDataSource_List(t *testing.T) {
	mux := http.NewServeMux()
	registerFlagHandlers(mux)
	factories, hostURL := testAccProviderFactories(t, mux)

	resource.Test(t, resource.TestCase{
		ProtoV6ProviderFactories: factories,
		Steps: []resource.TestStep{
			// Step 1: Create a flag
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_ds"
  key           = "ds-flag"
  name          = "Data Source Flag"
  default_value = "false"
}
`,
			},
			// Step 2: Read it back via the data source
			{
				Config: providerConfig(hostURL) + `
resource "featuresignals_flag" "test" {
  project_id    = "proj_ds"
  key           = "ds-flag"
  name          = "Data Source Flag"
  default_value = "false"
}

data "featuresignals_flags" "all" {
  project_id = featuresignals_flag.test.project_id
}
`,
				Check: resource.ComposeAggregateTestCheckFunc(
					resource.TestCheckResourceAttr("data.featuresignals_flags.all", "project_id", "proj_ds"),
					resource.TestCheckResourceAttr("data.featuresignals_flags.all", "flags.#", "1"),
					resource.TestCheckResourceAttr("data.featuresignals_flags.all", "flags.0.key", "ds-flag"),
					resource.TestCheckResourceAttr("data.featuresignals_flags.all", "flags.0.name", "Data Source Flag"),
				),
			},
		},
	})
}

// ---------------------------------------------------------------------------
// Custom check functions
// ---------------------------------------------------------------------------

// testAccCheckFlagExists verifies that the flag resource exists in the
// in-memory mock store by checking the resource ID matches the expected ID.
func testAccCheckFlagExists(resourceName, expectedID string) resource.TestCheckFunc {
	return func(s *terraform.State) error {
		rs, ok := s.RootModule().Resources[resourceName]
		if !ok {
			return fmt.Errorf("resource not found: %s", resourceName)
		}

		if rs.Primary.ID != expectedID {
			return fmt.Errorf("expected ID %q, got %q", expectedID, rs.Primary.ID)
		}

		return nil
	}
}