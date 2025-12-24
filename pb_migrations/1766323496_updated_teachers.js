/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // update collection data
  unmarshal({
    "otp": {
      "enabled": true
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // update collection data
  unmarshal({
    "otp": {
      "enabled": false
    }
  }, collection)

  return app.save(collection)
})
