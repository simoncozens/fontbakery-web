importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');

// This is our magic WASM-hacked fontbakery
const FBVERSION = 'fontbakery-0.9.0a3.dev28+g5305b0e8-py3-none-any.whl'
const GLYPHSETSVERSION = 'glyphsets-0.6.3.dev11+g853b386-py3-none-any.whl'
const FBWEBAPIVERSION = 'fbwebapi-0.1.0-py3-none-any.whl'

const fbhome = self.location.href.replace('fb-webworker.js', FBVERSION);
const fbwebapihome = self.location.href.replace(
    'fb-webworker.js',
    FBWEBAPIVERSION,
);
const glyphsetshome = self.location.href.replace(
    'fb-webworker.js',
    GLYPHSETSVERSION,
);

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
  'com.google.fonts/check/metadata/includes_production_subsets',
  'com.google.fonts/check/metadata/designer_profiles',
  'com.google.fonts/check/description/broken_links',
  'com.google.fonts/check/metadata/broken_links',
  // Shaping checks
  'com.google.fonts/check/render_own_name',
  'com.google.fonts/check/shaping/regression',
  'com.google.fonts/check/shaping/forbidden',
  'com.google.fonts/check/shaping/collides',
  'com.google.fonts/check/dotted_circle',
  'com.google.fonts/check/soft_dotted',
  'com.google.fonts/check/metadata/can_render_samples',
  // UFO checks
  'com.daltonmaag/check/ufo_required_fields',
  'com.daltonmaag/check/ufo_recommended_fields',
  'com.google.fonts/check/designspace_has_sources',
  'com.google.fonts/check/designspace_has_default_master',
  'com.google.fonts/check/designspace_has_consistent_glyphset',
  'com.google.fonts/check/designspace_has_consistent_codepoints',
  // Other checks
  'com.google.fonts/check/metadata/family_directory_name', // No directories!
  'com.google.fonts/check/slant_direction', // Needs uharfbuzz
];

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide();
  await pyodide.loadPackage('micropip');
  const micropip = pyodide.pyimport('micropip');
  await pyodide.loadPackage(glyphsetshome);
  await micropip.install([
    fbhome,
    fbwebapihome,
    'axisregistry',
    'setuptools',
    'lxml',
  ]);
}
const pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  // make sure loading is done
  const {id, files, profile, loglevels, fulllists} = event.data;
  await pyodideReadyPromise;
  self.postMessage({ready: true});
  self.profile = profile;
  if (id == 'justload') {
    return;
  }
  if (id == 'listchecks') {
    try {
      const checks = await self.pyodide.runPythonAsync(`
          from fbwebapi import dump_all_the_checks

          dump_all_the_checks()
      `);
      self.postMessage({checks: checks.toJs()});
    } catch (error) {
      self.postMessage({error: error.message});
    }
    return;
  }

  const callback = (msg) => self.postMessage(msg.toJs());

  // Write the files
  const filenames = [];
  for (const [name, buffer] of Object.entries(files)) {
    pyodide.FS.writeFile(name, buffer);
    filenames.push(name);
  }

  self.filenames = filenames;
  self.callback = callback;
  self.loglevels = loglevels;
  self.fulllists = fulllists;
  self.exclude_checks = EXCLUDE_CHECKS;
  try {
    await self.pyodide.runPythonAsync(`
        from fbwebapi import run_fontbakery
        from js import filenames, callback, exclude_checks, profile, loglevels, fulllists

        run_fontbakery(filenames,
          profilename=profile,
          callback=callback,
          loglevels=loglevels,
          full_lists=fulllists,
          exclude_checks=exclude_checks
        )
    `);
    self.postMessage({done: true});
  } catch (error) {
    self.postMessage({error: error.message, id});
  }
};
