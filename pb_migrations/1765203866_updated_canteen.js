/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1258950274")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool570631283",
    "name": "lunchReceived",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1258950274")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool570631283",
    "name": "lunchRecieved",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
