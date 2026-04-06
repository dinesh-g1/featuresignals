# Utho.com provisioning for India region.
#
# Utho does not have an official Terraform provider as of 2026.
# This module uses the Utho REST API via a null_resource provisioner
# to create and configure a cloud server, then uses remote-exec to
# harden and prepare it for FeatureSignals deployment.
#
# For full API docs: https://utho.com/api-docs

terraform {
  required_version = ">= 1.5.0"
}

variable "utho_api_key" {
  type      = string
  sensitive = true
}

variable "region" {
  type    = string
  default = "in"
}

variable "plan_id" {
  type        = string
  default     = "10045"
  description = "Utho plan ID (10045 = 4 vCPU / 8GB RAM / 160GB NVMe)"
}

variable "location_id" {
  type        = string
  default     = "inmumbaizone2"
  description = "Utho datacenter location (inmumbaizone2 = Mumbai)"
}

variable "ssh_key_id" {
  type        = string
  description = "Utho SSH key ID (upload via dashboard first)"
}

variable "domain_api" {
  type    = string
  default = "api.in.featuresignals.com"
}

variable "domain_app" {
  type    = string
  default = "app.in.featuresignals.com"
}

variable "server_hostname" {
  type    = string
  default = "fs-in"
}

resource "null_resource" "utho_server" {
  triggers = {
    hostname = var.server_hostname
    plan     = var.plan_id
    location = var.location_id
  }

  provisioner "local-exec" {
    command = <<-EOF
      curl -s -X POST "https://console.utho.com/api/v2/cloud/deploy" \
        -H "Authorization: Bearer ${var.utho_api_key}" \
        -H "Content-Type: application/json" \
        -d '{
          "dcslug": "${var.location_id}",
          "image": "ubuntu-24.04-x86_64",
          "planid": "${var.plan_id}",
          "hostname": "${var.server_hostname}",
          "sshkeys": ["${var.ssh_key_id}"],
          "label": "featuresignals-india",
          "backups": "1"
        }' | tee /tmp/utho-deploy-response.json

      echo ""
      echo "Server deployment initiated. Check Utho dashboard for IP address."
      echo "Once server is ready, run the setup script manually:"
      echo "  ssh root@<IP> 'bash -s' < deploy/terraform/utho/setup-utho.sh"
    EOF
  }
}

output "note" {
  value = "Check /tmp/utho-deploy-response.json for server details and Utho dashboard for IP"
}
