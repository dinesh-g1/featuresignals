provider "featuresignals" {
  api_key = var.featuresignals_api_key
  host    = "https://api.featuresignals.com"
}

resource "featuresignals_flag" "example" {
  project_id    = "proj_abc123"
  key           = "new-feature"
  name          = "New Feature"
  description   = "Controls visibility of the new feature"
  flag_type     = "boolean"
  default_value = "false"
  tags          = ["team:frontend", "sprint:42"]

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
