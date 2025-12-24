/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // update collection data
  unmarshal({
    "authAlert": {
      "enabled": false
    },
    "mfa": {
      "enabled": false
    },
    "oauth2": {
      "enabled": false
    },
    "otp": {
      "enabled": false
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // update collection data
  unmarshal({
    "authAlert": {
      "enabled": true
    },
    "mfa": {
      "enabled": true
    },
    "oauth2": {
      "enabled": true
    },
    "otp": {
      "enabled": true
    }
  }, collection)

  return app.save(collection)
})
