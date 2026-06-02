variable "name" { type = string }
variable "project" { type = string }
variable "region" { type = string }
variable "zone" { type = string }
variable "machine_type" { type = string }
variable "image" { type = string }
variable "network" { type = string }
variable "ssh_user" { type = string }
variable "ssh_public_key" { type = string }
variable "labels" { type = map(string) default = {} }

provider "google" {
  project = var.project
  region  = var.region
  zone    = var.zone
}

resource "google_compute_instance" "this" {
  name         = var.name
  machine_type = var.machine_type
  zone         = var.zone
  labels       = merge(var.labels, { managed_by = "cloudops-control-center" })

  boot_disk {
    initialize_params {
      image = var.image
    }
  }

  network_interface {
    network = var.network
    access_config {}
  }

  metadata = {
    ssh-keys = "${var.ssh_user}:${var.ssh_public_key}"
  }
}

output "instance_id" {
  value = google_compute_instance.this.id
}

output "public_ip" {
  value = google_compute_instance.this.network_interface[0].access_config[0].nat_ip
}
