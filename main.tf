terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    random = {
      source = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # OPTIONAL remote backend example (comment out if local)
  # backend "azurerm" {
  #   resource_group_name  = "vlas-tfstate-rg"
  #   storage_account_name = "vlastfstate1234"
  #   container_name       = "tfstate"
  #   key                  = "vlas.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {}
}

# -------------------------------
# RESOURCE GROUP
# -------------------------------

resource "azurerm_resource_group" "vlas_rg" {
  name     = "vlas-resource-group"
  location = "Central India"
}

# -------------------------------
# STORAGE ACCOUNT (Blob for manuals + AI outputs)
# -------------------------------

resource "azurerm_storage_account" "vlas_storage" {
  name                     = "vlasstorage${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.vlas_rg.name
  location                 = azurerm_resource_group.vlas_rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "random_string" "suffix" {
  length  = 5
  upper   = false
  lower   = true
  special = false
}

# -------------------------------
# COSMOS DB (Serverless)
# -------------------------------

resource "azurerm_cosmosdb_account" "vlas_cosmos" {
  name                = "vlas-cosmos-${random_string.suffix.result}"
  location            = azurerm_resource_group.vlas_rg.location
  resource_group_name = azurerm_resource_group.vlas_rg.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Session"
  }

  capabilities {
    name = "EnableServerless"
  }

  geo_location {
    location          = azurerm_resource_group.vlas_rg.location
    failover_priority = 0
  }
}

resource "azurerm_cosmosdb_sql_database" "vlas_db" {
  name                = "vlasdb"
  resource_group_name = azurerm_resource_group.vlas_rg.name
  account_name        = azurerm_cosmosdb_account.vlas_cosmos.name
}

resource "azurerm_cosmosdb_sql_container" "reservations" {
  name                = "Reservations"
  account_name        = azurerm_cosmosdb_account.vlas_cosmos.name
  resource_group_name = azurerm_resource_group.vlas_rg.name
  database_name       = azurerm_cosmosdb_sql_database.vlas_db.name

  partition_key_paths = ["/id"]
}

# -------------------------------
# AZURE FUNCTION APP (Node.js Backend)
# -------------------------------

resource "azurerm_service_plan" "vlas_plan" {
  name                = "vlas-functions-plan"
  resource_group_name = azurerm_resource_group.vlas_rg.name
  location            = azurerm_resource_group.vlas_rg.location
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption
}

resource "azurerm_linux_function_app" "vlas_function" {
  name                       = "vlas-function-app"
  resource_group_name        = azurerm_resource_group.vlas_rg.name
  location                   = azurerm_resource_group.vlas_rg.location
  service_plan_id            = azurerm_service_plan.vlas_plan.id
  storage_account_name       = azurerm_storage_account.vlas_storage.name
  storage_account_access_key = azurerm_storage_account.vlas_storage.primary_access_key

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    COSMOS_CONN_STRING = azurerm_cosmosdb_account.vlas_cosmos.connection_strings[0]
    FUNCTIONS_WORKER_RUNTIME = "node"
  }
}

# -------------------------------
# STATIC WEB APP (Frontend Deployment Target)
# -------------------------------

resource "azurerm_static_site" "vlas_swa" {
  name                = "vlas-static-site"
  resource_group_name = azurerm_resource_group.vlas_rg.name
  location            = azurerm_resource_group.vlas_rg.location

  sku_tier = "Free"
  sku_size = "Free"
}

# -------------------------------
# LAB SERVICES (Virtual Labs)
# -------------------------------

resource "azurerm_lab_service_lab" "vlas_lab" {
  name                = "vlas-lab"
  resource_group_name = azurerm_resource_group.vlas_rg.name
  location            = azurerm_resource_group.vlas_rg.location

  # Lab-specific parameters can be added depending on your Lab Plan
}

# -------------------------------
# MONITORING (App Insights)
# -------------------------------

resource "azurerm_application_insights" "vlas_appinsights" {
  name                = "vlas-insights"
  location            = azurerm_resource_group.vlas_rg.location
  resource_group_name = azurerm_resource_group.vlas_rg.name
  application_type    = "web"
}

# -------------------------------
# OUTPUTS
# -------------------------------

output "static_site_url" {
  value = azurerm_static_site.vlas_swa.default_host_name
}

output "function_app_url" {
  value = azurerm_linux_function_app.vlas_function.default_hostname
}

output "cosmos_db_endpoint" {
  value = azurerm_cosmosdb_account.vlas_cosmos.endpoint
}
