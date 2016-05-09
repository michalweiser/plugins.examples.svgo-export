// SVGO v0.1α, by Ale Muñoz
//
// This Plugin compresses SVG assets using [SVGO](https://github.com/svg/svgo) right after they're exported from Sketch.
// 
// It uses the new Action API in Sketch 3.8.

// This is the content of the `manifest.json` file for this Plugin. See how we're attaching the Plugin to the `ExportSlices.finish` event in `handlers.actions` by assigning a function name (`compressSVG`, defined in `svgo.js` to the action name we're interested in).
var manifest = {
  "author" : "Ale Muñoz",
  "commands" : [
    {
      "script" : "svgo.js",
      "name" : "SVGO",
      "handlers" : {
        "actions" : {
          "ExportSlices.finish": "compressSVG"
        }
      },
      "identifier" : "com.sketchapp.sketch.svgo"
    }
  ],
  "identifier" : "com.sketchapp.sketch.8bbc676e-337d-408b-bd87-d0a4421e056e",
  "version" : "0.1α",
  "description" : "Uses SVGO to compress exported SVG assets.\nNote: it needs svgo installed somewhere on your path!",
  "authorEmail" : "ale@sketchapp.com",
  "name" : "SVGO (αlphα)"
}

// Utility function we'll use later, to remove duplicates on an Array
var uniqueArray = function(arrArg) {
  return arrArg.filter(function(elem, pos,arr) {
    return arr.indexOf(elem) == pos;
  });
};

// This is the function where we'll do the heavy lifting (i.e: compress all SVG files in a given folder).
// Make sure you either have svgo installed on `/usr/local/bin` or adjust the path accordingly in the code.
// The SVGO options are based on our experience working with Sketch's exported SVGs, and to the best of our knowledge they shouldn't effect the rendering of your assets, just reduce their size.
function optimizeFolderWithSVGO(folderPath) {
  var command = "/usr/local/bin/svgo --folder='" + folderPath + "' --pretty --disable=convertShapeToPath --enable=removeTitle --enable=removeDesc --enable=removeDoctype --enable=removeEmptyAttrs --enable=removeUnknownsAndDefaults --enable=removeUnusedNS --enable=removeEditorsNSData"

  var task = [[NSTask alloc] init]
  [task setLaunchPath:@"/bin/bash"]
  [task setArguments:["-l", "-c", command]]
  [task launch]
  [task waitUntilExit]

  if ([task terminationStatus] == 0) {
    return true
  } else {
    return false
  }
}

// This is the handler we defined on `manifest.json` for the event (`ExportSlices.finish`). It will be passed a `context` object as a parameter.
// `context.actionContext` is the action that has been triggered, and it looks like this:
// ```json
// {
//   "document": "<MSImmutableDocumentData: 0x7fbe8644fae0> (6125882F-2DBB-4E1C-856B-92C6761BA0E3)",
//   "exports": [{
//     "path": "/Users/ale/Desktop/tmp/svgo/Rectangle.svg",
//     "request": "<MSExportRequest: 0x7fbe86264300>"
//   }]
// }
// ```
// 
// In this particular example, there's only one item in the `exports` array, but if you've exported 10.000 assets it will be a bit more crowded. The `ExportSlices.finish` event is only called once for the whole export operation, rather than being triggered 10.000 times.
var compressSVG = function(context){
  var exports = context.actionContext.exports,
      shouldCompressSVG = false,
      pathsToCompress = []

  // We'll take a look at the Array that contains all the exported assets…
  for (var i=0; i < exports.count(); i++) {
    var currentExport = exports.objectAtIndex(i)
    // When we find an asset in SVG format, then we'll want to compress the folder it's been exported to.
    if (currentExport.request.format() == 'svg') {
      shouldCompressSVG = true
      var currentPath = "" + currentExport.path.stringByDeletingLastPathComponent() // the ("" + ) trick coerces the value into a JS string, otherwise the uniqueArray function won't sort the array properly
      pathsToCompress.push(currentPath)
    }
  }

  // Time to compress some folders
  if (shouldCompressSVG) {
    // Let's remove duplicates
    var paths = uniqueArray(pathsToCompress),
        success = false
    for (var p=0; p < paths.length; p++) {
      var path = paths[p]
      log('Compressing SVG files in ' + path)
      // Exporting!
      if(optimizeFolderWithSVGO(paths[p])) {
        log('✅ compression ok')
        success = true
      } else {
        log('❌ compression error')
        success = false
      }
    }
    // And finally, make some noise to let the user know if the command worked as expected or not (this can take a while if you're exporting many assets, so it's a nice touch :-)
    var ding = [[NSTask alloc] init],
        audio = ""

    [ding setLaunchPath:@"/bin/bash"]
    if (success) {
      audio = "Glass"
    } else {
      audio = "Basso"
    }
    [ding setArguments:["-c", "afplay /System/Library/Sounds/" + audio + ".aiff"]]
    [ding launch]
  }
}