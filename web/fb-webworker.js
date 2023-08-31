importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');

// This is our magic WASM-hacked fontbakery
const FBVERSION = 'fontbakery-0.9.0a3.dev22+gf0ee7af7-py3-none-any.whl'
const FBWEBAPIVERSION = 'fbwebapi-0.1.0-py3-none-any.whl'

const fbhome = self.location.href.replace('fb-webworker.js', FBVERSION);
const fbwebapihome = self.location.href.replace('fb-webworker.js', FBWEBAPIVERSION);

const EXCLUDE_CHECKS = [
  // Needs dependencies
  'com.adobe.fonts/check/freetype_rasterizer',
  'com.google.fonts/check/hinting_impact',
  'com.google.fonts/check/fontv',
  'com.google.fonts/check/alt_caron:googlefonts',
  // Needs network
  'com.google.fonts/check/vendor_id',
  'com.google.fonts/check/fontdata_namecheck',
  'com.google.fonts/check/vertical_metrics_regressions',
  'com.google.fonts/check/fontbakery_version',
  // Shaping checks
  'com.google.fonts/check/render_own_name',
  'com.google.fonts/check/shaping/regression',
  'com.google.fonts/check/shaping/forbidden',
  'com.google.fonts/check/shaping/collides',
  'com.google.fonts/check/dotted_circle',
  'com.google.fonts/check/soft_dotted',
  // UFO checks
  'com.daltonmaag/check/ufo_required_fields',
  'com.daltonmaag/check/ufo_recommended_fields',
  'com.google.fonts/check/designspace_has_sources',
  'com.google.fonts/check/designspace_has_default_master',
  'com.google.fonts/check/designspace_has_consistent_glyphset',
  'com.google.fonts/check/designspace_has_consistent_codepoints',
];

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide();
  await pyodide.loadPackage('micropip');
  const micropip = pyodide.pyimport('micropip');
  await micropip.install([
    fbhome,
    fbwebapihome,
    'axisregistry',
    'setuptools',
  ]);
  console.log('Ready!');
}
const pyodideReadyPromise = loadPyodideAndPackages();


self.onmessage = async (event) => {
  // make sure loading is done
  await pyodideReadyPromise;
  const {id, files, profile} = event.data;

  const callback = (msg) => self.postMessage(msg.toJs());

  // Write the files
  const filenames = [];
  for (const [name, buffer] of Object.entries(files)) {
    pyodide.FS.writeFile(
        name,
        buffer,
    );
    filenames.push(name);
  }

  self.filenames = filenames;
  self.callback = callback;
  self.profile = profile;
  self.exclude_checks = EXCLUDE_CHECKS;
  try {
    await self.pyodide.runPythonAsync(`
        from fbwebapi import run_fontbakery
        from js import filenames, callback, exclude_checks, profile

        run_fontbakery(filenames,
          profilename=profile,
          callback=callback,
          exclude_checks=exclude_checks
        )
    `);
  } catch (error) {
    self.postMessage({error: error.message, id});
  }
};
