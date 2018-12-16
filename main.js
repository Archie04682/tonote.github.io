var CLIENT_ID = '778261473062-tr2ciii73p0pcgv5af7qre1cuhgmbhnm.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCCshlpHHBSNtrrnUd0BqZs6FmjKJ9YM5k';

var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
var SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

var authorizeButton = document.getElementById('authorize_button');
var signoutButton = document.getElementById('signout_button');

function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    }, function(error) {
        showMessage(JSON.stringify(error, null, 2));
    });
}

function updateSigninStatus(isSignedIn) {
    var pre = document.getElementById('content');

    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';

        pre.innerHTML = "";
        listNotes();
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';

        pre.innerHTML = `<p class="message">To load notes from Google Drive, you need to <a onclick="gapi.auth2.getAuthInstance().signIn()" class="link">authorize</a>.</p>`;
    }
}

function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

function showMessage(message) {
    var pre = document.getElementById('content');
    pre.innerHTML = `<p class="message">` + message + `</p>`;
}

function toColor(num) {
    num >>>= 0;
    var b = num & 0xFF,
        g = (num & 0xFF00) >>> 8,
        r = (num & 0xFF0000) >>> 16,
        a = ( (num & 0xFF000000) >>> 24 ) / 255 ;
    return "rgba(" + [r, g, b, a].join(",") + ")";
}

function expandNote(noteId) {
    var note = notes[noteId];
    var card = document.getElementById(noteId);

    var html = [`<div class="text">`];
    
    if (note.title.length > 0) {
        html.push(`<div class="title">` + note.title + "</div>");
    }
    
    var lines = note.content.split('\n');
    lines.forEach(function(line) {
        html.push("<p>" + line + "</p>");
    })
    
    html.push("</div>");

    var date = new Date(note.edited);
    html.push(`<p class="footer">` + date.toLocaleDateString() + " " + date.getHours() + ":" + date.getMinutes() + `<text class="theme">` + note.color.theme + "</text></p>");

    card.innerHTML = html.join("");
    
}

function appendNote(note) {
    var pre = document.getElementById('content');
    var card = document.createElement('div');
    card.className = "box";
    card.style.backgroundColor = toColor(note.color.value);
    card.id = note.id;

    var html = [`<div class="text">`];
    
    if (note.title.length > 0) {
        html.push(`<div class="title">` + note.title + "</div>");
    }
    
    var lines = note.content.split('\n');
    if(lines.length <= 10) {
        lines.forEach(function(line) {
            html.push("<p>" + line + "</p>");
        })
    } else {
        for (var i = 0; i < 10; i++) {
            html.push("<p>" + lines[i] + "</p>");
        }

        html.push(`<p style="color: black; font-size: 28px; cursor: pointer;" onclick="expandNote('${note.id}')">...</p>`);
    }
    
    html.push("</div>");

    var date = new Date(note.edited);
    html.push(`<p class="footer">` + date.toLocaleDateString() + " " + date.getHours() + ":" + date.getMinutes() + `<text class="theme">` + note.color.theme + "</text></p>");

    card.innerHTML = html.join("");
    pre.appendChild(card);
}

loadedFile = null;

function loadFile(file) {
    gapi.client.drive.files.get({
        'fileId': file.id,
        'alt': 'media'
    })
    .then(function(response) {
        loadedFile = JSON.parse(response.body);
        notes = new Object();

        loadedFile.notes.sort(function(a, b) {
            return b.edited - a.edited;
        });

        loadedFile.notes.forEach(function(entry) {
            if (!entry.hasOwnProperty('iv')) {
                notes[entry.id] = entry;
                appendNote(entry);
            }
        });

    }, function(error) {
        showMessage('Error during download. Try to reload.');
        console.log("Error during download", error);
    });
}

/**
 * Print notes.
 */
function listNotes() {
    gapi.client.drive.files.list({
        'q': "name = 'notes_backup.json' and trashed = false",
        'pageSize': 10,
        'fields': "files(id, name)"
    }).then(function(response) {
        var files = response.result.files;
        if(files.length == 0) {
            showMessage('There are no notes. Maybe you need to make backup from the android application.');
        } else {
            var file = files[0];
            loadFile(file)
        }
    });
}