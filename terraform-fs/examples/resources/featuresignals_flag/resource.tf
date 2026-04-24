resource "featuresignals_flag" "example" {
  project_id    = "proj_abc123"
  key           = "new-feature"
  name          = "New Feature"
  description   = "Controls visibility of the new feature section"
  flag_type     = "boolean"
  category      = "release"
  status        = "active"
  default_value = "false"
  tags          = ["team:frontend", "sprint:42", "area:billing"]

  environments = [
    {
      key     = "production"
      enabled = false
      rules   = jsonencode([])
    },
    {
      key     = "staging"
      enabled = true
      rules   = jsonencode([
        {
          attribute = "email"
          operator  = "ends_with"
          value     = "@acme.com"
        }
      ])
    },
    {
      key     = "development"
      enabled = true
      rules   = jsonencode([
        {
          attribute = "email"
          operator  = "ends_with"
          value     = "@acme.com"
        }
      ])
    },
  ]
}

output "flag_id" {
  value = featuresignals_flag.example.id
}

output "flag_key" {
  value = featuresignals_flag.example.key
}
