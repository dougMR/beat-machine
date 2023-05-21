import { SamplesManager } from "./module-samples.js";
// Song Module

// const helloFromSongModule = () => {
//     console.log("hello from song module");
// };

// const song = {
//     hello: helloFromSongModule,
// };

let someVar = 0;
const setSomeVar = (value) => {
    console.log('setSomeVar()',value);
	someVar = value;
    console.log("SM.someVar",someVar);
}
// export { someVar, setSomeVar, song };

// export { song };

// const sayHello = () => {
//     console.log("hello from module-song.js");
// }
// const song = {
//     sayHello
// }

// export {song};

/* 

.d8888.  .d88b.  d8b   db  d888b         dD   d888888b d8888b.  .d8b.   .o88b. db   dD 
88'  YP .8P  Y8. 888o  88 88' Y8b       d8'   `~~88~~' 88  `8D d8' `8b d8P  Y8 88 ,8P' 
`8bo.   88    88 88V8o 88 88           d8'       88    88oobY' 88ooo88 8P      88,8P   
  `Y8b. 88    88 88 V8o88 88  ooo     d8'        88    88`8b   88~~~88 8b      88`8b   
db   8D `8b  d8' 88  V888 88. ~8~    d8'         88    88 `88. 88   88 Y8b  d8 88 `88. 
`8888Y'  `Y88P'  VP   V8P  Y888P    C8'          YP    88   YD YP   YP  `Y88P' YP   YD 
                                        
*/

const song = [];
const songQuantized = [];

let isPlaying = false;

let bpm = 120;
let msPerBeat = 60000 / bpm;
let msPer8th = msPerBeat * 0.5;
let msPer16th = msPer8th * 0.5;
let measures = 2;

// trackEl is also declared in drum-machine.js
// redundancy bad.  How to fix?
const trackEl = document.getElementById("track");
const track = {};
track.marquis = trackEl.querySelector("#marquis");
track.clipboardNotes = [];


const selectBeatIcon = (beatIcon) => {
    // console.log('selectBeatIcon', beatIcon);
    if (!beatIcon.classList.contains("selected")) {
        beatIcon.classList.add("selected");
        if (!isPlaying) {
            SamplesManager.playSound(beatIcon.note.audio);
        }

        document.getElementById("copy-notes").classList.add("on");
    }
};
const deselectBeatIcon = (beatIcon) => {
    beatIcon.classList.remove("selected");
};
const deselectBeatIcons = () => {
    // deselect all beat icons
    let beatIcons = Array.from(
        document.querySelectorAll("#beat-icons .beat-icon")
    );
    for (const beatIcon of beatIcons) {
        deselectBeatIcon(beatIcon);
    }
};
track.toggleSelectBeat = (beatIcon) => {
    if (beatIcon.classList.contains("selected")) {
        deselectBeatIcon(beatIcon);
    } else {
        selectBeatIcon(beatIcon);
    }
};
track.marquisBeats = (start, end) => {
    const minX = Math.min(start.x, end.x),
        maxX = Math.max(start.x, end.x),
        minY = Math.min(start.y, end.y),
        maxY = Math.max(start.y, end.y);

    let beatIcons = Array.from(
        document.querySelectorAll("#beat-icons .beat-icon")
    );

    for (const beatIcon of beatIcons) {
        // inside marquis?
        const trackRect = trackEl.getBoundingClientRect(),
            iconRect = beatIcon.getBoundingClientRect(),
            x = iconRect.left - trackRect.left,
            y = iconRect.top - trackRect.top;
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            // Beat is inside marquis
            selectBeatIcon(beatIcon);
        } else {
            deselectBeatIcon(beatIcon);
        }
        // console.log("note", beatIcon.note);
    }
};
track.drawMarquis = (start, end) => {
    const minX = Math.min(start.x, end.x),
        maxX = Math.max(start.x, end.x),
        minY = Math.min(start.y, end.y),
        maxY = Math.max(start.y, end.y);

    track.marquis.style.left = minX + "px";
    track.marquis.style.top = minY + "px";
    track.marquis.style.width = maxX - minX + "px";
    track.marquis.style.height = maxY - minY + "px";
    // console.log(maxX, ",", maxY);
};

const setTempo = (value) => {
    bpm = value;
    msPerBeat = 60000 / bpm;
    msPer8th = msPerBeat * 0.5;
    msPer16th = msPer8th * 0.5;
    track.duration = msPerBeat * 4 * measures;
    drawTrack();
    // positionBeatIcons();
    // positionPlayheadByElapsed();
};

const setMeasures = (value) => {
    console.log('song.setMeasures()',value);
    console.log('measures:',measures);
    console.log(typeof value);
    const ratio = measures / value;
    console.log('ratio',ratio);
    recalculateNotesFractions(ratio);
    measures = value;
    console.log('measures: ',measures);
    track.duration = msPerBeat * 4 * measures;
    console.log('measures: ',measures);
    drawTrack();
    console.log('measures: ',measures);
    // positionBeatIcons();
    // positionPlayheadByElapsed();
};

// -------------------------------
// Initial draw of Track view
// -------------------------------
const buildTrack = () => {
    // playheadEl.style.left = 0;
    track.trackWidth = trackEl.offsetWidth;
    track.duration = msPerBeat * 4 * measures;
    drawTrack();
};

const drawTrack = () => {
    const total8ths = measures * 8;
    const pxPer8th = track.trackWidth / total8ths;
    const beatsHolder = document.querySelector("#track #beats");
    beatsHolder.innerHTML = "";
    for (let eighthIndex = 0; eighthIndex < total8ths + 1; eighthIndex++) {
        // make a new eighth-note line
        const eighthLine = document.createElement("div");
        eighthLine.classList.add("beat-line");
        // if it's an up-beat, make it lighter
        if (eighthIndex % 2 == 1) {
            eighthLine.classList.add("up-beat");
        }
        // if it's a measure, make it even brighter
        if (eighthIndex !== 0 && eighthIndex % 8 === 0) {
            eighthLine.classList.add("measure");
        }
        // position line
        eighthLine.style.left = `${pxPer8th * eighthIndex}px`;
        beatsHolder.appendChild(eighthLine);
    }
};

const redrawTrack = () => {
    track.trackWidth = trackEl.offsetWidth;
    drawTrack();
    positionBeatIcons();
    positionPlayheadByElapsed();
};

// -------------------------------
// Edit song
// -------------------------------

// ==============================
//
//    MANAGE NOTES / SONG
//
// ==============================

const recalculateNotesFractions = (factor) => {
    for (const note of song) {
        note.fraction *= factor;
    }
    for (const note of songQuantized) {
        note.fraction *= factor;
    }
};

const getNoteMS = (note) => {
    if (note.fraction) {
        return note.fraction * track.duration;
    } else if (note.ms) {
        return note.ms;
    }
};

const removeDuplicateNotes = (note) => {
    // console.log('removeDuplicateNotes()');
    // Remove 'duplicates' of this note
    const noteMS = getNoteMS(note);
    // If note of same sample already in song less than minMSdiff away,
    // remove it and add this one.
    const minMSdiff = 10;
    const dupes = findSampleInSong(note.audio);
    // console.log('dupes.length',dupes.length);
    for (const dupe of dupes) {
        if (dupe !== note) {
            const msDiff = Math.abs(noteMS - getNoteMS(dupe));
            if (msDiff < minMSdiff) {
                // remove dupe
                removeNoteFromSong(dupe);
            }
        }
    }
};

const removeAllDuplicateNotes = () => {
    // Remove any duplicates from the song
    for (const note of song) {
        console.log("song.length", song.length);
        removeDuplicateNotes(note);
    }
};



const getNotesMSdifference = (note1, note2) => {
    const totalMS1 = track.duration + getNoteMS(note1);
    const totalMS2 = track.duration + getNoteMS(note2);
    return Math.abs(totalMS1 - totalMS2);
};

const checkSampleInSong = (audioEl) => {
    // Is this sample used in the track?
    for (const note of song) {
        if (note.audio === audioEl) {
            return true;
        }
    }
    return false;
};

const findSampleInSong = (audioEl) => {
    // returns array of notes
    const matchingNotes = [];
    for (const note of song) {
        if (note.audio === audioEl) {
            matchingNotes.push(note);
        }
    }
    return matchingNotes;
};

const removeNotesFromSong = (notesAr) => {
    for (const note of notesAr) {
        removeNoteFromSong(note);
    }
};

const removeNoteFromSong = (note) => {
    let icon = note.beatIcon;
    let noteIndex = song.indexOf(note);

    // remove regular note
    if (noteIndex !== -1) {
        song.splice(noteIndex, 1);
    }

    // quantized note
    const qNote = icon.qNote;
    if (qNote) {
        noteIndex = songQuantized.indexOf(qNote);
        songQuantized.splice(noteIndex, 1);
    }

    icon.remove();
    // did we deselect the only selected note?
    // checkTurnOnCopyButton();
};

const getAllNotesInSong = () => {
    // console.log("getAllNotesInSong()");
    // console.log("song", song);
    // console.log("song.length", song.length);
    return [...song];

    // const notes = [];
    // const song = quantized ? songQuantized : song;
    // for (const group of song) {
    //     if (group) {
    //         for (const note of group) {
    //             notes.push(note);
    //         }
    //     }
    // }
    // return notes;
};

const lockQuantized = () => {
    // replace regular note's properties with quantized note's properties
    const notesToQuantize = getAllNotesInSong();
    for (const note of notesToQuantize) {
        // console.log("note: ", note);
        Object.assign(note, note.beatIcon.qNote);
    }
    removeAllDuplicateNotes();
};

const SongManager = {
    song,
    songQuantized,
    msPerBeat,
    msPer8th,
    msPer16th,
    bpm,
    measures,
    track,
    // getAllNotesInSong,
    removeNoteFromSong,
    removeNotesFromSong,
    findSampleInSong,
    checkSampleInSong,
    // getNotesMSdifference,
    // removeAllDuplicateNotes,
    removeDuplicateNotes,
    getNoteMS,
    // recalculateNotesFractions,
    lockQuantized,
    buildTrack,
    redrawTrack,
    setTempo,
    setMeasures,
    selectBeatIcon,
    deselectBeatIcons,
    someVar,
    setSomeVar
};

export {SongManager}