# CFN dynamic reference `ssm-secure` is rejected in Lambda env vars

## The trap

CFN supports two dynamic references for SSM Parameter Store values in
templates:

- `{{resolve:ssm:<name>:<version>}}` — for `String` and `StringList`
  parameter types. Widely supported across resource types.
- `{{resolve:ssm-secure:<name>:<version>}}` — for `SecureString`
  parameter types. **Allow-listed to a hardcoded set of resource
  properties** (RDS master passwords, IAM passwords, AD admin
  passwords, etc.).

`AWS::Lambda::Function.Environment.Variables` is **not on the
allow-list**. Synth-time tokens that resolve to `ssm-secure` fail at
deploy with:

```
Resource handler returned message: "SSM Secure reference is not
supported in: [AWS::Lambda::Function/Properties/Environment/Variables/X]"
```

The same restriction applies through CDK's
`StringParameter.fromSecureStringParameterAttributes(...).stringValue`
— that token resolves to `ssm-secure`, so plugging it into a Lambda
env var produces a template the deploy refuses.

## Workarounds (pick by sensitivity)

1. **Plain `String` SSM parameter** — use when the secret-at-rest
   doesn't add real defense. Example: a scrypt-hashed PIN. The
   plaintext value is already cryptographically protected; KMS
   encryption is theatre on top of that. CDK:
   `StringParameter.fromStringParameterAttributes(...).stringValue`.
   Free under the SSM Standard tier (up to 10k parameters).

2. **Secrets Manager** — use when the secret is an actual key/password
   that an attacker reading the env var would weaponise immediately
   (JWT signing key, DB password, API token). CFN supports
   `{{resolve:secretsmanager:...}}` in Lambda env vars. $0.40/secret/mo.

3. **Lambda runtime fetch via AWS Parameters and Secrets Lambda
   Extension** — value never lands in the function's env var. Adds
   ~100 ms cold-start cost and a layer; worth it for high-rotation
   secrets, overkill for boot-time constants.

Pre-merge sanity test (synth-time, no deploy needed):

```ts
const synthesized = JSON.stringify(envVarValue);
expect(synthesized).toContain('resolve:ssm:');         // plain SSM
expect(synthesized).not.toContain('resolve:ssm-secure'); // would fail at deploy
```

## Origin

Surfaced while migrating `last-loop-lepin`'s PIN hash from Secrets
Manager to SSM Parameter Store (to drop the $0.40/mo per-secret fee on
a value already hashed with scrypt). The first attempt used
`fromSecureStringParameterAttributes` and the CDK snapshot showed
`{{resolve:ssm-secure:…}}` baked into the Lambda env var. The deploy
would have failed; the snapshot test catches it at PR time instead.

## See also

- AWS docs: [Dynamic references — supported services for
  `ssm-secure`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html#dynamic-references-ssm-secure-strings)
- AWS re:Post: [Injecting sensitive data as environment variables to
  Lambda Functions](https://repost.aws/questions/QU6nVd4eo8SFizcURzjfo68Q/injecting-sensitive-data-as-environment-variables-to-lambda-functions)
