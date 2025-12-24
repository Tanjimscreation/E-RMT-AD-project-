/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number3356626015",
    "max": null,
    "min": null,
    "name": "pfp",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3614170744")

  // remove field
  collection.fields.removeById("number3356626015")

  return app.save(collection)
})
