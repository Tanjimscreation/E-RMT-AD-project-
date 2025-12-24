/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3827815851")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select3981121951",
    "maxSelect": 1,
    "name": "class",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "AMBER",
      "AMETHYST",
      "CITRINE",
      "DIAMOND",
      "EMERALD",
      "SAPPHIRE",
      "TOPAZ",
      "TURQUOISE"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3827815851")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select3981121951",
    "maxSelect": 1,
    "name": "class",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "AMBER",
      "AMETHYST",
      "CITRINE"
    ]
  }))

  return app.save(collection)
})
