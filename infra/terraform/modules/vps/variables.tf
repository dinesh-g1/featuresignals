variable "hetzner_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "customer_name" {
  description = "Customer identifier (used in subdomain and VPS name)"
  type        = string
}

variable "org_id" {
  description = "FeatureSignals organization ID"
  type        = string
}

variable "vps_type" {
  description = "Hetzner server type (cx22, cx32, cx42, cpX1, etc.)"
  type        = string
  default     = "cx32"
}

variable "region" {
  description = "Hetzner datacenter location (fsn1, nbg1, hel1, ash)"
  type        = string
  default     = "fsn1"
}

variable "ssh_public_key" {
  description = "SSH public key for deployment access"
  type        = string
}

variable "allowed_admin_cidrs" {
  description = "CIDR blocks allowed for SSH access (office IPs)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "docker_compose_template" {
  description = "docker-compose.yml content for the customer"
  type        = string
}

variable "env_vars" {
  description = "Environment variables for the customer's .env file"
  type        = map(string)
  sensitive   = true
}
