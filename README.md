# Lil's Ice Cream Android Bridge

Small Render web service that lets the Android customer app talk to CloudKit without putting Apple server credentials in the Android APK.

## Current Scope

- Read current truck status from CloudKit.
- Read current truck location from CloudKit.
- Save/update Android customer profiles in CloudKit.
- Save Android push tokens without overwriting existing iOS APNs token records.
- Create `Pin` records when Android customers tap `Wave Us Down`.
- Optionally notify the existing iOS truck app through the current production APNs push server after a wave is saved.

## Environment Variables

See `.env.example`.

Required for CloudKit:

- `CLOUDKIT_CONTAINER_ID`
- `CLOUDKIT_ENVIRONMENT`
- `CLOUDKIT_DATABASE`
- `CLOUDKIT_KEY_ID`
- `CLOUDKIT_PRIVATE_KEY`

Optional:

- `APNS_PUSH_URL`
- `USER_APP_APNS_TOPIC`

## Routes

- `GET /health`
- `GET /truck/status`
- `GET /truck/location`
- `POST /profiles`
- `DELETE /profiles/:recordName`
- `POST /push-tokens/user`
- `POST /pins`

## Render Start Command

```bash
npm start
```

## Apple Setup Needed

Create a CloudKit server-to-server key for:

`iCloud.NovotnyConcessionsLLC.IceCream`

Put the key ID and private key into Render environment variables. Do not commit the private key.

## Notes On Android Push

The current iOS truck app sends APNs pushes through the existing production push server. Android uses FCM, so Android customer tokens are stored separately as:

`AndroidUserPushToken_{normalizedPhone}`

This avoids overwriting iOS records named:

`UserPushToken_{normalizedPhone}`

Adding Android customer push delivery for zone alerts/end-of-day will require a later safe update to the truck push workflow so it can route Android tokens through FCM.

