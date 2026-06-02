variable "name" { type = string }
variable "region" { type = string }
variable "ami_id" { type = string }
variable "instance_type" { type = string }
variable "subnet_id" { type = string }
variable "security_group_ids" { type = list(string) }
variable "ssh_key_name" { type = string }
variable "tags" { type = map(string) default = {} }

provider "aws" {
  region = var.region
}

resource "aws_instance" "this" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  key_name               = var.ssh_key_name

  tags = merge(var.tags, {
    Name = var.name
    ManagedBy = "CloudOpsControlCenter"
  })
}

output "instance_id" {
  value = aws_instance.this.id
}

output "public_ip" {
  value = aws_instance.this.public_ip
}
