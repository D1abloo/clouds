export const HCL_TEMPLATE_AWS = `module "web_instance" {
  source        = "../../modules/aws/instance"
  name          = "web-prod-01"
  region        = "eu-west-1"
  instance_type = "t3.medium"
  ami           = "ami-0c55b159cbfafe1f0"
  key_name      = "my-ssh-key"
  vpc_id        = "vpc-xxxxxx"
  subnet_id     = "subnet-xxxxxx"
  tags = {
    Environment = "production"
    Project     = "cloudops"
  }
}
`

export const HCL_TEMPLATE_GCP = `module "app_instance" {
  source       = "../../modules/gcp/compute-instance"
  name         = "app-prod-01"
  project      = "my-gcp-project"
  zone         = "europe-west1-b"
  machine_type = "e2-medium"
  image        = "debian-cloud/debian-11"
  disk_size_gb = 50
  network      = "default"
  tags         = ["http-server", "https-server"]
}
`

export const HCL_TEMPLATE_AZURE = `module "vm_instance" {
  source              = "../../modules/azure/virtual-machine"
  name                = "vm-prod-01"
  location            = "westeurope"
  resource_group_name = "rg-cloudops"
  vm_size             = "Standard_B2s"
  admin_username      = "azureuser"
  os_disk_type        = "Premium_LRS"
  image_publisher     = "Canonical"
  image_offer         = "0001-com-ubuntu-server-jammy"
  image_sku           = "22_04-lts"
  subnet_id           = "/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/default"
  tags = {
    Environment = "production"
  }
}
`

export const BUILTIN_TEMPLATES = [
  { id: 'aws-web', label: 'Web server (AWS t3.medium)', provider: 'AWS' as const, hcl: HCL_TEMPLATE_AWS },
  { id: 'gcp-app', label: 'App server (GCP e2-medium)', provider: 'GCP' as const, hcl: HCL_TEMPLATE_GCP },
  { id: 'azure-vm', label: 'VM Azure Standard B2s', provider: 'AZURE' as const, hcl: HCL_TEMPLATE_AZURE },
]
