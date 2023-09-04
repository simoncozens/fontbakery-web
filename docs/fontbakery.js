
const SORT_RESULT = {
  'FAIL': 'aa',
  'WARN': 'bb',
  'INFO': 'cc',
  'ERROR': 'dd',
  'PASS': 'ee',
  'SKIP': 'zz',
};
const fbWorker = new Worker('./fb-webworker.js');

/** Show that we have loaded the Python code, allow baking */
function showLoaded() {
  $('#loading').hide();
  $('#test').show();
}

/** Update the progress bar
 *
 * @param {Map} progress - Progress message
*/
function showProgress(progress) {
  const pct = progress.get('progress');
  $('#progress .progress-bar').css({'width': `${pct}%`});
  if (pct == 100) {
    $('#progress').hide();
  }
  for (const result of Object.keys(SORT_RESULT)) {
    const count = progress.get(result);
    if (count) {
      $(`#${result}-count`).html(count);
    }
  }
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
  const checkid = data.get('key');
  let thispill = $(`#v-pills-tab button[data-checkid="${checkid}"]`);
  // console.log("Adding result for ",checkid)
  if (thispill.length == 0) {
    // Add a new pill
    thispill = $(`
        <button
          class="nav-link bg-${result}"
          id="v-pills-${tabid}-tab"
          data-toggle="pill"
          data-target="#v-pills-${tabid}"
          data-sortorder="${SORT_RESULT[result]}"
          type="button"
          role="tab"
          data-checkid=${data.get('key')}
          aria-controls="v-pills-${tabid}">${data.get('description')}</button>
      `);
    $('#v-pills-tab').append(thispill);
  }
  let thistab = $(`#v-pills-tabContent div[data-checkid="${checkid}"]`);
  if (thistab.length == 0) {
    thistab = $(`
      <div
        class="tab-pane fade"
        data-sortorder="${SORT_RESULT[result]}"
        id="v-pills-${tabid}"
        role="tabpanel"
        aria-labelledby="v-pills-${tabid}-tab"
        data-checkid=${data.get('key')}
      >
        <h4>${data.get('description')}</h4>
        <p class="text-muted">${data.get('key')}</p>
        <div class="rationale">
        ${ CmarkGFM.convert((data.get('rationale')||'').replace(/^ +/gm, '')) }
        </div>
        <ul class="results">
        </ul>
      </div>
      `);
    $('#v-pills-tabContent').append(thistab);
  }
  // Update pill / tab results with worst result
  if (SORT_RESULT[result] < thispill.data('sortorder')) {
    thispill.removeClass(function(index, className) {
      return (className.match(/(^|\s)bg-\S+/g) || []).join(' ');
    });
    thispill.addClass('bg-' + result);
    thispill.data('sortorder', SORT_RESULT[result]);
    thistab.data('sortorder', SORT_RESULT[result]);
  }

  for (log of data.get('logs')) {
    let where = 'ul.results';
    if (data.has('filename')) {
      const filename = data.get('filename');
      where = `ul.results li ul[data-filename='${filename}']`;
      if (thistab.find(where).length == 0) {
        thistab.find('ul.results').append(`<li>
          <b>${filename}</b>
          <ul data-filename="${filename}">
          </ul>
        </li>`);
      }
    }
    thistab.find(where).append($(`
          <li>
            <span
              class="bg-${log.get('status')} font-weight-bold">
              ${log.get('status')}
            </span>:
            <div>${CmarkGFM.convert(log.get('message'))}</div>
          </li>
        `));
  }
  // Sort the tabs based on result
  tinysort('div#v-pills-tab>button', {'data': 'sortorder'});
  tinysort('div#v-pills-tabContent>div', {'data': 'sortorder'});
}

/* Add a profile from the profiles list */
PROFILES = {
  'opentype': 'OpenType (standards compliance)',
  'universal': 'Universal (community best practices)',
  'googlefonts': 'Google Fonts (for submission to Google)',
  'adobefonts': 'Adobe Fonts',
  'fontbureau': 'Font Bureau',
  'fontwerk': 'Fontwerk',
};

function addProfile(profilename, col) {
  const checked = profilename == 'universal' ? 'checked': '';
  const widget = $(`
    <div class="form-check">
        <input class="form-check-input" type="radio" name="flexRadioDefault" id="profile-${profilename}" ${checked}>
        <label class="form-check-label" for="profile-${profilename}">
           ${PROFILES[profilename]}
        </label>
    </div>
  `);
  $(`#profiles .row #col${col}`).append(widget);
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
    showProgress(event.data);
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
  $('[data-toggle="tooltip"]').tooltip();
  Object.keys(PROFILES).forEach( (profilename, ix) => {
    addProfile(profilename, ix % 2);
  });
  $('#startModal').show();
  $('#test').click(function() {
    const profile = $('#profiles .form-check-input:checked')[0].id.replace('profile-', '');
    const fulllists = $("#full-lists").is(':checked');
    const loglevels = $('#loglevels').val();
    $('#test').hide();
    $('#progress').show();
    fbWorker.postMessage({profile, files, loglevels, fulllists});
  });

  fbWorker.postMessage({id: 'justload'});
});
