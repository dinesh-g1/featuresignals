output "vps_ip" {
  description = "Public IPv4 address of the VPS"
  value       = hcloud_server.customer_vps.ipv4_address
}

output "vps_id" {
  description = "Hetzner server ID"
  value       = hcloud_server.customer_vps.id
}

output "vps_name" {
  description = "Server name"
  value       = hcloud_server.customer_vps.name
}

output "ssh_connection" {
  description = "SSH connection string"
  value       = "root@${hcloud_server.customer_vps.ipv4_address}"
}
