import {
  EC2Client,
  type EC2ClientConfig,
} from '@aws-sdk/client-ec2'
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import type { AwsCredentialIdentity, Provider } from '@aws-sdk/types'
import { CloudAdapterContext } from '../cloud-provider.adapter'

export const resolveAwsCredentials = async (
  ctx: CloudAdapterContext,
): Promise<AwsCredentialIdentity | Provider<AwsCredentialIdentity>> => {
  const { accessKeyId, secretAccessKey, roleArn, externalId } = ctx.credentials
  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey }
  }
  if (roleArn) {
    const sts = new STSClient({ region: ctx.defaultRegion ?? 'us-east-1' })
    const assumed = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `cloudops-${ctx.accountId.slice(0, 8)}`,
        ExternalId: externalId || undefined,
        DurationSeconds: 3600,
      }),
    )
    const c = assumed.Credentials
    if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
      throw new Error('AssumeRole did not return credentials')
    }
    return {
      accessKeyId: c.AccessKeyId,
      secretAccessKey: c.SecretAccessKey,
      sessionToken: c.SessionToken,
    }
  }
  throw new Error('AWS credentials missing: configure Access Key or IAM Role ARN')
}

export const createEc2Client = async (ctx: CloudAdapterContext, region: string): Promise<EC2Client> => {
  const credentials = await resolveAwsCredentials(ctx)
  const config: EC2ClientConfig = { region, credentials }
  return new EC2Client(config)
}

export const createStsClient = async (ctx: CloudAdapterContext): Promise<STSClient> => {
  const credentials = await resolveAwsCredentials(ctx)
  return new STSClient({ region: ctx.defaultRegion ?? 'us-east-1', credentials })
}

export const validateAwsSts = async (ctx: CloudAdapterContext): Promise<string> => {
  const sts = await createStsClient(ctx)
  const identity = await sts.send(new GetCallerIdentityCommand({}))
  return identity.Account ?? 'unknown'
}
