
const SORT_RESULT = {
  'FAIL': 'aa',
  'WARN': 'bb',
  'INFO': 'cc',
  'ERROR': 'dd',
  'SKIP': 'zz',
};
const fbWorker = new Worker('./fb-webworker.js');

/** Update the progress bar
 *
 * No longer used, may be used again one day.
 * @param {string} p - Percent of progress
*/
function setProgress(p) {
  const pInt = parseInt(p, 10);
  $('.progress-bar').html(`${pInt}%`);
  $('.progress-bar').css({'width': `${p}%`});
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
      ${ CmarkGFM.convert(data.get('rationale').replace(/^ +/gm, '')) }
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

fbWorker.onmessage = (event) => {
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
const asyncRun = (() => {
  return new Promise((onSuccess) => {
    fbWorker.postMessage({files});
  });
});

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
  $('#startModal').show();
  $('#test').click(function() {
    const profile = $('.form-check-input:checked')[0].id.replace('profile-', '');
    $('#test').hide();
    $('#progress').show();
    fbWorker.postMessage({profile, files});
  });
});
