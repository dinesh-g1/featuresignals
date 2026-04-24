data "featuresignals_flags" "all" {
  project_id = "proj_abc123"
}

output "all_flag_keys" {
  value = [for f in data.featuresignals_flags.all.flags : f.key]
}

output "total_flags" {
  value = data.featuresignals_flags.all.flags[*].id
}
