/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_233839710")

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "number464575497",
    "max": null,
    "min": null,
    "name": "Year",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_233839710")

  // remove field
  collection.fields.removeById("number464575497")

  return app.save(collection)
})
