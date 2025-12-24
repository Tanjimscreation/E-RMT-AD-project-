/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "bool1069225213",
    "name": "emailVerified",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // remove field
  collection.fields.removeById("bool1069225213")

  return app.save(collection)
})
