
const SORT_RESULT = {
  'FAIL': 'aa',
  'WARN': 'bb',
  'INFO': 'cc',
  'ERROR': 'dd',
  'SKIP': 'zz',
};
const fbWorker = new Worker('./fb-webworker.js');

/** Show that we have loaded the Python code, allow baking */
function showLoaded() {
  $("#loading").hide();
  $("#test").show();
}

/** Update the progress bar
 *
 * No longer used, may be used again one day.
 * @param {string} p - Percent of progress
*/
function setProgress(p) {
  console.log("Got progress tick", p)
  $('#progress .progress-bar').css({'width': `${p/4}%`});
}

/** Display an error modal
 *
 * Used to display Python errors.
 * @param {string} msg - HTML error message
*/
function showError(msg) {
  $('#errorModal').show();
  $('#errorText').html(msg);
}

/** Record a result and add it to the output pills
 *
 * Used to display Python errors.
 * @param {Map} data - All the stuff
*/
function showResult(data) {
  $('#startModal').hide();
  const tabid = $('#v-pills-tab').children().length;
  const result = data.get('result');
  const newTab = $(`
        <button
          class="nav-link"
          id="v-pills-${tabid}-tab"
          data-toggle="pill"
          data-target="#v-pills-${tabid}"
          data-sortorder="${SORT_RESULT[result]}"
          type="button"
          role="tab"
          aria-controls="v-pills-${tabid}">${data.get('description')}</button>
      `);

  const newContent = $(`
    <div
      class="tab-pane fade"
      data-sortorder="${SORT_RESULT[result]}"
      id="v-pills-${tabid}"
      role="tabpanel"
      aria-labelledby="v-pills-${tabid}-tab"
    >
      <h4>${data.get('description')}</h4>
      <p class="text-muted">${data.get('key')}</p>
      <div class="rationale">
      ${ CmarkGFM.convert((data.get('rationale')||"").replace(/^ +/gm, '')) }
      </div>
      <ul>
      </ul>
    </div>
    `);
  for (log of data.get('logs')) {
    newContent.find('ul').append($(`
          <li>
            <span
              class="bg-${log.get('status')} font-weight-bold">
              ${log.get('status')}
            </span>:
            <div>${CmarkGFM.convert(log.get('message'))}</div>
          </li>
        `));
  }
  $('#v-pills-tab').append(newTab);
  $('#v-pills-tabContent').append(newContent);
  newTab.addClass('bg-' + result);
  $('#v-pills-tab button:first-child').tab('show');
  // Sort the tabs based on result
  tinysort('div#v-pills-tab>button', {'data': 'sortorder'});
  tinysort('div#v-pills-tabContent>div', {'data': 'sortorder'});
}

/* Add a profile from the profiles list */
PROFILES = {
  "opentype": "OpenType (standards compliance)",
  "universal": "Universal (community best practices)",
  "googlefonts": "Google Fonts (for submission to Google)",
  "adobefonts": "Adobe Fonts",
  "fontbureau": "Font Bureau",
  "fontwerk": "Fontwerk"
}

function addProfile(profilename, col) {
  var checked = profilename == "universal" ? "checked": "";
  var widget = $(`
    <div class="form-check">
        <input class="form-check-input" type="radio" name="flexRadioDefault" id="profile-${profilename}" ${checked}>
        <label class="form-check-label" for="profile-${profilename}">
           ${PROFILES[profilename]}
        </label>
    </div>
  `);
  $(`#profiles .row #col${col}`).append(widget)
}

fbWorker.onmessage = (event) => {
  if ('ready' in event.data) {
    showLoaded();
    return;
  }
  if ('done' in event.data) {
    $('#v-pills-tab button:first-child').tab('show');
    return;
  }
  if ('error' in event.data) {
    showError(event.data.error);
    // otherwise data is a Map
  } else if (event.data.has('progress')) {
    setProgress(event.data.get('progress'));
  } else {
    showResult(event.data);
  }
};

Dropzone.autoDiscover = false;
files = {};

$(function() {
  Dropzone.options.dropzone = {
    url: 'https://127.0.0.1/', // This doesn't matter
    maxFilesize: 10, // Mb
    accept: function(file, done) {
      const reader = new FileReader();
      reader.addEventListener('loadend', function(event) {
        files[file.name] = new Uint8Array(event.target.result);
      });
      reader.readAsArrayBuffer(file);
    },
  };
  Dropzone.discover();
  Object.keys(PROFILES).forEach( (profilename, ix) => {
    addProfile(profilename, ix % 2);
  });
  $('#startModal').show();
  $('#test').click(function() {
    const profile = $('.form-check-input:checked')[0].id.replace('profile-', '');
    $('#test').hide();
    $('#progress').show();
    fbWorker.postMessage({profile, files});
  });

  fbWorker.postMessage({id: "justload"});

});
