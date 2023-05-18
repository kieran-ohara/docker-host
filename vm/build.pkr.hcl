
packer {
  required_plugins {
    aws = {
      version = ">= 1.2.5"
      source  = "github.com/hashicorp/amazon"
    }
    git = {
      version = ">= 0.3.2"
      source  = "github.com/ethanmdavidson/git"
    }
  }
}

data "git-commit" "cwd-head" {}
locals {
  truncated_sha = substr(data.git-commit.cwd-head.hash, 0, 8)
}

variable "aws_region" {
  type    = string
}
variable "aws_source_ami" {
  type    = string
  default = "ami-0ddf13256eb703053"
}
variable "aws_access_key" {
  type    = string
}
variable "aws_secret_key" {
  type    = string
}

source "aws-ebs" "docker-host" {
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region     = var.aws_region

  source_ami = var.aws_source_ami
  instance_type = "t4g.small"

  ami_name = "docker-host-${local.truncated_sha}-{{timestamp}}"

  ssh_username = "rocky"
}

build {
  name = "simple-docker"

  sources = [
    "source.aws-ebs.docker-host",
  ]

  provisioner "ansible" {
    host_alias       = source.name
    command          = "${path.cwd}/venv/bin/ansible-playbook"
    ansible_env_vars = ["COLLECTIONS_PATHS=${path.cwd}/ansible/collections"]
    playbook_file    = "./ansible/ansible-playbook.yml"
    use_proxy        = false
  }
}
