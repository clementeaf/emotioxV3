terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "emotiox-migration"
}

# Data Sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Get Default VPC and Subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Random String for Unique Bucket Prefix (if needed) & DB Pass
resource "random_password" "db_password" {
  length           = 16
  special          = false # Avoid special chars purely for connection string safety simplicity
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# --- RDS POSTGRESQL ---

resource "aws_security_group" "db_sg" {
  name        = "emotiox-db-sg-${random_string.suffix.result}"
  description = "Allow PostgreSQL access"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Public access for Lambda (outside VPC) and local dev
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "default" {
  identifier             = "emotiox-db-${random_string.suffix.result}"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp2"
  username               = "dbadmin"
  password               = random_password.db_password.result
  db_name                = "emotiox"
  publicly_accessible    = true
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.db_sg.id]
}

# --- COGNITO ---

resource "aws_cognito_user_pool" "pool" {
  name = "emotiox-users-${random_string.suffix.result}"

  auto_verified_attributes = ["email"]
  alias_attributes         = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name = "emotiox-app-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret = true
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]
}

# --- SSM PARAMETERS (BOOTSTRAP) ---

locals {
  prefix = "/emotioxv3/production"
}

resource "aws_ssm_parameter" "db_host" {
  name  = "${local.prefix}/DB_HOST"
  type  = "String"
  value = aws_db_instance.default.address
  overwrite = true
}

resource "aws_ssm_parameter" "db_port" {
  name  = "${local.prefix}/DB_PORT"
  type  = "String"
  value = tostring(aws_db_instance.default.port)
  overwrite = true
}

resource "aws_ssm_parameter" "db_name" {
  name  = "${local.prefix}/DB_NAME"
  type  = "String"
  value = aws_db_instance.default.db_name
  overwrite = true
}

resource "aws_ssm_parameter" "db_user" {
  name  = "${local.prefix}/DB_USER"
  type  = "String"
  value = aws_db_instance.default.username
  overwrite = true
}

resource "aws_ssm_parameter" "db_password" {
  name  = "${local.prefix}/DB_PASSWORD"
  type  = "SecureString"
  value = aws_db_instance.default.password
  overwrite = true
}

resource "aws_ssm_parameter" "db_ssl" {
  name  = "${local.prefix}/DB_SSL"
  type  = "String"
  value = "true"
  overwrite = true
}

resource "aws_ssm_parameter" "app_aws_region" {
  name  = "${local.prefix}/APP_AWS_REGION"
  type  = "String"
  value = data.aws_region.current.name
  overwrite = true
}

resource "aws_ssm_parameter" "cognito_pool_id" {
  name  = "${local.prefix}/COGNITO_USER_POOL_ID"
  type  = "String"
  value = aws_cognito_user_pool.pool.id
  overwrite = true
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "${local.prefix}/COGNITO_CLIENT_ID"
  type  = "String"
  value = aws_cognito_user_pool_client.client.id
  overwrite = true
}

# Note: COGNITO_CLIENT_SECRET is explicitly requested in some contexts
resource "aws_ssm_parameter" "cognito_client_secret" {
  name  = "${local.prefix}/COGNITO_CLIENT_SECRET"
  type  = "SecureString"
  value = aws_cognito_user_pool_client.client.client_secret
  overwrite = true
}

# We also need to set S3 Bucket and Certificate ARN here if we want full automation
# But S3 bucket name is dynamic per user choice.
# Certificate ARN was already manually set by the agent in previous steps.
# Importing it or managing it here might cause conflict if we simply 'overwrite'.
# BUT, redundancy is fine if values match.
# To be safe, we will NOT overwrite ACM_CERTIFICATE_ARN or S3_BUCKET_NAME here
# unless we create them here. For now, we assume those are handled by the manual step 
# or migration script, to avoid overwriting the correct values with blanks.

output "rds_endpoint" {
  value = aws_db_instance.default.endpoint
}
