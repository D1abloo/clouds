# Cloud SDK integration

CloudOps uses official SDKs for **AWS**, **GCP**, and **Azure**. Demo mode does not call external APIs.

## Demo vs real

| Mode | When | Behavior |
|------|------|----------|
| Demo | Form auth = **Demo** or `FORCE_CLOUD_DEMO=true` | Synthetic inventory |
| Real | Valid credentials stored (encrypted) | SDK calls; fallback to demo on error |

## AWS

- **Packages:** `@aws-sdk/client-ec2`, `@aws-sdk/client-sts`
- **Auth:** Access Key + Secret, or IAM Role ARN (+ optional External ID)
- **Validate:** `sts:GetCallerIdentity`
- **Sync:** `DescribeInstances` per region (up to 8 regions)

## GCP

- **Package:** `@google-cloud/compute`
- **Auth:** Service Account JSON (paste in form)
- **Project ID:** Account ID field or `config.projectId`
- **Sync:** `aggregatedListAsync` across zones

## Azure

- **Packages:** `@azure/arm-compute`, `@azure/arm-network`, `@azure/arm-subscriptions`, `@azure/identity`
- **Auth:** Tenant ID + Client ID + Client Secret, or Managed Identity
- **Subscription ID:** Account ID field
- **Sync:** `virtualMachines.listAll`

## Environment

```env
VAULT_ENCRYPTION_KEY=your-32-char-minimum-secret
# Optional: force demo for all accounts
# FORCE_CLOUD_DEMO=true
```
