import { positionBeatIcons, track, drawTrack } from "./module-trackGUI.js";
// Song Module

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

// IS this even who should keep track of isPlaying?
let isPlaying = false;
let isRecording = false;
let isEditing = false;


let bpm = 120;
let msPerBeat = 60000 / bpm;
let msPer8th = msPerBeat * 0.5;
let msPer16th = msPer8th * 0.5;
let measures = 2;


const getIsRecording = () => {
    return isRecording;
}
const setIsRecording = (value) => {
    isRecording = value;
}
const getIsEditing = () => {
    return isEditing;
}
const setIsEditing = (value) => {
    isEditing = value;
}
const getIsPlaying = () => {
    return isPlaying;
}

const getMsPerBeat = () => {
    return msPerBeat;
};
const getMsPer8th = () => {
    return msPer8th;
};
const getMsPer16th = () => {
    return msPer16th;
};

const setTempo = (value) => {
    bpm = value;
    msPerBeat = 60000 / bpm;
    msPer8th = msPerBeat * 0.5;
    msPer16th = msPer8th * 0.5;
    track.duration = msPerBeat * 4 * measures;
    drawTrack();
};

const setMeasures = (value) => {
    const ratio = measures / value;
    recalculateNotesFractions(ratio);
    measures = value;
    track.duration = msPerBeat * 4 * measures;
    drawTrack();
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

const getMeasures = () => {
    return measures;
};

const removeDuplicateNotes = (note) => {
    // console.log('removeDuplicateNotes()');
    // Remove 'duplicates' of this note
    const noteMS = getNoteMS(note);
    // If note of same sample already in song less than minMSdiff away,
    // remove it and add this one.
    const minMSdiff = 10;
    const dupes = findSampleInSong(note.audioEl);
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
        if (note.audioEl === audioEl) {
            return true;
        }
    }
    return false;
};

const findSampleInSong = (audioEl) => {
    // returns array of notes
    const matchingNotes = [];
    for (const note of song) {
        if (note.audioEl === audioEl) {
            matchingNotes.push(note);
        }
    }
    return matchingNotes;
};

const removeNotesFromSong = (notesAr) => {
    console.log("removeNotesFromSong()");
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

/*


     .d88b.  db    db  .d8b.  d8b   db d888888b d888888b d88888D d88888b 
    .8P  Y8. 88    88 d8' `8b 888o  88 `~~88~~'   `88'   YP  d8' 88'     
    88    88 88    88 88ooo88 88V8o 88    88       88       d8'  88ooooo 
    88    88 88    88 88~~~88 88 V8o88    88       88      d8'   88~~~~~ 
    `8P  d8' 88b  d88 88   88 88  V888    88      .88.    d8' db 88.     
     `Y88'Y8 ~Y8888P' YP   YP VP   V8P    YP    Y888888P d88888P Y88888P 
                                                                                                                                 
    */
let quantizePrecision = 4;
let quantizeOn = false;

const setQuantizePrecision = (value) => {
    quantizePrecision = value;
}
const getQuantizePrecision = () => {
    return quantizePrecision;
}

const addNoteToSongQuantized = (note) => {
    songQuantized.push(note);
};

const quantizeNote = (note) => {
    console.log("quantizeNote()");
    console.log('quantizePrecision: ',quantizePrecision);
    // quantizePrecision 4 = quarternote, 8 = 8thnote ect...
    let msFrequency;
    if (quantizePrecision === 4) {
        msFrequency = msPerBeat;
    } else if (quantizePrecision === 8) {
        msFrequency = msPer8th;
    } else if (quantizePrecision === 16) {
        msFrequency = msPer16th;
    }

    // get Note's MS
    const noteMS = getNoteMS(note);

    let beatNum = Math.floor(noteMS / msFrequency);
    const remainder = noteMS - beatNum * msFrequency;
    const closest = Math.round(remainder / msFrequency);
    beatNum += closest;
    const totalBeats = track.duration / msFrequency;
    if (beatNum === totalBeats) {
        beatNum = 0;
    }

    console.log('beatNum: ',beatNum);
    const quantizedNote = {
        audioEl: note.audioEl,
        beatIcon: note.beatIcon,
        ms: beatNum * msFrequency,
        fraction: beatNum * (msFrequency / track.duration),
    };
    note.beatIcon.qNote = quantizedNote;
    return quantizedNote;
};

const quantizeTrack = () => {
    // re-quantize the track
    songQuantized.length = 0;
    for (const note of song) {
        const quantizedNote = quantizeNote(note);
        addNoteToSongQuantized(quantizedNote);
        // note.beatIcon.qNote = quantizedNote;
    }
    if (quantizeOn) repositionBeatIcons();
};

const toggleQuantize = () => {
    console.log("toggleQuantize()");
    console.log('quantizePrecision',quantizePrecision)
    // console.log('before - quantizeOn: ',quantizeOn);
    quantizeOn = !quantizeOn;
    // console.log('after - quantizeOn: ',quantizeOn);
    document.getElementById("quantize-light").classList.toggle("on");
    repositionBeatIcons();
};

const getQuantizeOn = () => {
    return quantizeOn;
};

const repositionBeatIcons = () => {
    console.log("repositionBeatIcons()");
    getSongNotes();
    positionBeatIcons(getSongNotes());
};

const getSongNotes = () => {
    const songAr = quantizeOn ? songQuantized : song;
    return songAr;
};

const quantizeSelectedNotes = () => {
    // Quantize only the selected notes
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

export const SongManager = {
    song,
    getMsPerBeat: () => msPerBeat,
    getMsPer8th: () => msPer8th,
    getMsPer16th: () => msPer16th,
    getBpm: () => bpm,
    getMeasures: () => measures,
    track, // <-- track is coming from module-track now.  Maybe don't export it here?
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
    setTempo,
    setMeasures,
    // selectBeatIcon,
    // deselectBeatIcons,
    repositionBeatIcons,
};
export const QuantizeManager = {
    songQuantized,
    // quantizePrecision,
    getQuantizePrecision,
    setQuantizePrecision,
    getQuantizeOn,
    addNoteToSongQuantized,
    quantizeNote,
    quantizeTrack,
    toggleQuantize,
    quantizeSelectedNotes,
    lockQuantized,
};
export {
    findSampleInSong,
    removeNotesFromSong,
    getMsPerBeat,
    getMsPer8th,
    getMsPer16th,
    getMeasures,
    getSongNotes,
    getIsPlaying,
    getIsRecording,
    setIsRecording,
    getIsEditing,
    setIsEditing
};
