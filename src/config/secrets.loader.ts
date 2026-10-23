import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { Logger } from '@nestjs/common';

// Create a logger dedicated to loading application secrets.
const logger = new Logger('SecretsLoader');

export async function loadSecrets(): Promise<void> {
  // Read the AWS secret name or ARN from the environment.
  const secretName = process.env.AWS_SECRET_NAME;

  // If no AWS secret is configured, use the existing local configuration.
  if (!secretName) {
    logger.warn('AWS_SECRET_NAME not set, using .env values');
    return;
  }

  // Create the AWS Secrets Manager client.
  // Use AWS_REGION if configured; otherwise, default to ap-south-1.
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });

  try {
    // Send a request to AWS to retrieve the specified secret.
    const res = await client.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );

    // Ensure AWS returned a string containing the secret.
    // Stop startup if the secret value is missing.
    if (!res.SecretString) {
      throw new Error(`Secret "${secretName}" has no SecretString`);
    }

    // Declare a variable to hold the parsed JSON secret.
    let secrets: Record<string, unknown>;

    try {
      // Convert the JSON string returned by AWS into a JavaScript object.
      secrets = JSON.parse(res.SecretString);
    } catch {
      // Never include the actual secret content in error messages.
      throw new Error(`Secret "${secretName}" is not valid JSON`);
    }

    // Copy each secret into process.env.
    // AWS values override existing values with the same environment key.
    for (const [key, value] of Object.entries(secrets)) {
      process.env[key] = String(value);
    }

    // Log the number of loaded secrets, not their values.
    logger.log('Secrets loaded successfully.');
  } catch (e) {
    // Convert the caught error to Error for accessing its name and message.
    const err = e as Error;

    // Log the failure without logging the secret's contents.
    logger.error(
      `Failed to load secrets "${secretName}": ${err.name}: ${err.message}`,
    );

    // Re-throw the error so the application does not start
    // with missing or incorrectly loaded required secrets.
    throw err;
  } finally {
    // Close the AWS client after the retrieval attempt completes,
    // whether it succeeds or fails.
    client.destroy();
  }
}
