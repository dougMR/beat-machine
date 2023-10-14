/* This Backup 2023 05 09 uses the nested arrays version of songs, where 
the song is an array of measures,
a measure is an array of beats,
a beat is an array of 'notes'.

Each note has {audioEl,measure,beat,fraction(of beat)}

The newer version of this script just has a song as an array of notes.
Each note has its ms (in the duration of the whole song).

*/


/*

            d8888b. d8888b. db    db .88b  d88.      .88b  d88.  .d8b.   .o88b. db   db d888888b d8b   db d88888b
            88  `8D 88  `8D 88    88 88'YbdP`88      88'YbdP`88 d8' `8b d8P  Y8 88   88   `88'   888o  88 88'
            88   88 88oobY' 88    88 88  88  88      88  88  88 88ooo88 8P      88ooo88    88    88V8o 88 88ooooo
            88   88 88`8b   88    88 88  88  88      88  88  88 88~~~88 8b      88~~~88    88    88 V8o88 88~~~~~
            88  .8D 88 `88. 88b  d88 88  88  88      88  88  88 88   88 Y8b  d8 88   88   .88.   88  V888 88.
            Y8888D' 88   YD ~Y8888P' YP  YP  YP      YP  YP  YP YP   YP  `Y88P' YP   YP Y888888P VP   V8P Y88888P

                        */
// ======================
//   DRUM MACHINE
// ======================

/*

Ideas to add:

 - when you switch sample library, check if samples being removed are used in track.  Then prompt -> Keep on samples used in track?

 - should scrubbing over notes play them? 

 - toggle Record separately from playing/pause. When Record is on, playing a sample adds it at playhead position regardless of whether playhead is moving.
 
 - Create a prompt functionality - so we don't have to use JS browser prompts

 - move all functionality out of .addEventlistener's and into stand-alone functions called by listeners

 - Lock Quantized - save quantized track (write songQuantized to song)

 - Quantize Selected = quantize all notes when none selected, quantize only selected notes when any selected 

 - divide code into sections
   Samples (audios)
   Sample Keys (drum pad)
   Notes
   Beat Icons
   Song
   Track
   Editing


*/

/*
  note = a sound on the timeline (track)
  song = all notes mapped on the track
  measure = 1 measure
  beat = 1/4 measure
  ms = milliseconds into a beat that a 'note' resides
  fraction = % into a beat that a 'note' resides
*/
const megaDrumMachine = (() => {
    const fps = 60;
    const msPerFrame = 1000 / 60;
    let bpm = 120;
    let msPerBeat = 60000 / bpm;
    let startTime = -1;
    let elapsed;
    let measures = 2;
    let isPlaying = false;
    let currentMeasure = 0;
    let currentBeat = 0;
    let currentMS = 0;
    const song = [];
    const songQuantized = [];
    let quantizeOn = false;
    let isRecording = false;
    let scrubbing = false;
    let draggingIcons = false;
    let lastIconDragX;
    let draggingPlayhead = false;
    let isEditing = false;
    let lightFrequency = -1;
    let libraryEl = document.querySelector('section[data-library="1"');
    // -1 = none, 0 = 1/4 and all notes, 4 = 1/4, 8 = 1/8, 16 = 1/16
    const triggerKeys = [
        {
            code: "KeyA",
            name: "A",
        },
        {
            code: "KeyS",
            name: "S",
        },
        {
            code: "KeyD",
            name: "D",
        },
        {
            code: "KeyF",
            name: "F",
        },
        {
            code: "KeyG",
            name: "G",
        },
        {
            code: "KeyH",
            name: "H",
        },
        {
            code: "KeyJ",
            name: "J",
        },
        {
            code: "KeyK",
            name: "K",
        },
        {
            code: "KeyL",
            name: "L",
        },
        {
            code: "Semicolon",
            name: ";",
        },
        {
            code: "Quote",
            name: "'",
        },
    ];
    const keysDown = [];

    const keysEl = document.querySelector("#keys");
    const playheadEl = document.getElementById("playhead");
    const trackEl = document.getElementById("track");
    const track = {};
    track.marquis = trackEl.querySelector("#marquis");
    track.clipboardNotes = [];
    const beatIcons = document.getElementById("beat-icons");
    const tempoSlider = document.getElementById("tempo-slider");
    const measureSlider = document.getElementById("measures-slider");

    const beatLight = document.getElementById("beat-light");
    const clearLight = document.getElementById("clear-light");
    const recLight = document.getElementById("rec-light");
    const sampleCopies = [];

/*


.d8888.  .d8b.  .88b  d88. d8888b. db      d88888b .d8888. 
88'  YP d8' `8b 88'YbdP`88 88  `8D 88      88'     88'  YP 
`8bo.   88ooo88 88  88  88 88oodD' 88      88ooooo `8bo.   
  `Y8b. 88~~~88 88  88  88 88~~~   88      88~~~~~   `Y8b. 
db   8D 88   88 88  88  88 88      88booo. 88.     db   8D 
`8888Y' YP   YP YP  YP  YP 88      Y88888P Y88888P `8888Y' 
                                                           

*/

 // Samples
 const allSamples = Array.from(
    document.querySelectorAll(".sample-library audio")
);

const maxSamples = 11;
const activeSamples = [];



    const dupeSample = (audioEl) => {
        // console.log("dupeSample", audioEl.dataset.sample);
        const id = parseInt(audioEl.dataset.id);
        // console.log("src", audioEl.src);
        const newAudio = new Audio(audioEl.src);
        // console.log("newAudio", newAudio);
        if (!sampleCopies[id]) {
            sampleCopies[id] = [];
        }
        sampleCopies[id].push(newAudio);
        return newAudio;
    };
    const playSampleCopy = (audioEl) => {
        // console.log("playSampleCopy()");
        const id = parseInt(audioEl.dataset.id);
        let triggeredSample = false;
        if (sampleCopies[id]) {
            // If there are already copies of the sample
            for (const audio of sampleCopies[id]) {
                if (audio.currentTime === 0 || audio.ended) {
                    // play it
                    audio.currentTime = 0;
                    audio.play();
                    // flag it played
                    triggeredSample = true;
                    // exit loop
                    break;
                }
            }
        }

        if (!triggeredSample) {
            const newSample = dupeSample(audioEl);
            const tempListener = (e) => {
                e.target.play();
                // console.log("tempListener", tempListener);
                e.target.removeEventListener("canplaythrough", tempListener);
            };
            newSample.addEventListener("canplaythrough", tempListener);
        }
    };

   


/* 

.d8888.  .d88b.  d8b   db  d888b         dD   d888888b d8888b.  .d8b.   .o88b. db   dD 
88'  YP .8P  Y8. 888o  88 88' Y8b       d8'   `~~88~~' 88  `8D d8' `8b d8P  Y8 88 ,8P' 
`8bo.   88    88 88V8o 88 88           d8'       88    88oobY' 88ooo88 8P      88,8P   
  `Y8b. 88    88 88 V8o88 88  ooo     d8'        88    88`8b   88~~~88 8b      88`8b   
db   8D `8b  d8' 88  V888 88. ~8~    d8'         88    88 `88. 88   88 Y8b  d8 88 `88. 
`8888Y'  `Y88P'  VP   V8P  Y888P    C8'          YP    88   YD YP   YP  `Y88P' YP   YD 
                                        
*/

    // -------------------------------
    // Initial draw of Track view
    // -------------------------------
    const buildTrack = () => {
        playheadEl.style.left = 0;
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
    // Initial build of sample-selector view
    // -------------------------------
    const setAudioIds = () => {
        // const audios = document.querySelectorAll(".sample-library audio ");
        let idNum = 0;
        allSamples.forEach((audioEl) => {
            audioEl.setAttribute("data-id", `${idNum}`);
            // console.log(audioEl);
            idNum++;
        });
    };
    const buildSampleSelector = () => {
        const checkBoxes = document.querySelector("#sample-selector-panel ul");
        checkBoxes.innerHTML = "";
        let audioNum = 0;
        let libName = "";
        allSamples.forEach((audio) => {
            // make Library label
            if (audio.parentElement.dataset.lib !== libName) {
                libName = audio.parentNode.dataset.lib;
                const libTitle = document.createElement("div");
                libTitle.classList.add("library-title");
                libTitle.innerHTML = `<b>${libName}</b>`;
                libTitle.dataset.lib = libName;
                libTitle.addEventListener("pointerdown", (event) => {
                    // select this sound library
                    loadSamplesLibrary(event.currentTarget.dataset.lib);
                });
                checkBoxes.append(libTitle);
            }
            // make Sample label
            const sampleId = "sample-" + audioNum;
            const sampleLabel = document.createElement("label");
            sampleLabel.setAttribute("for", sampleId);
            sampleLabel.innerHTML = audio.dataset.sample;

            // make Sample checkbox
            const sampleCheckbox = document.createElement("input");
            sampleCheckbox.setAttribute("type", "checkbox");
            sampleCheckbox.id = sampleId;
            sampleCheckbox.setAttribute("value", audio.dataset.sample);
            sampleCheckbox.setAttribute("name", sampleId);
            sampleCheckbox.setAttribute("data-id", audio.dataset.id);
            sampleCheckbox.innerHTML = audio.dataset.sample;

            // Checkbox Listener
            sampleCheckbox.addEventListener("change", (event) => {
                const checkbox = event.currentTarget;
                // Get checkbox's audio element
                const audioEl = document.querySelector(
                    `audio[data-id="${checkbox.dataset.id}"]`
                );
                if (checkbox.checked) {
                    if (activeSamples.length < maxSamples) {
                        // activate sample
                        activateSample(audioEl);
                    } else {
                        // uncheck
                        checkbox.checked = false;
                    }
                } else {
                    // deactivate?
                    // console.log("\r\n", "deactivate");
                    const notesWithSample = findSampleInSong(audioEl);
                    if (notesWithSample.length > 0) {
                        // This sample is in the song
                        const removeSample = window.confirm(
                            `Do you want to remove all occurences of ${audioEl.dataset.sample} from the track?`
                        );
                        if (removeSample) {
                            // Remove all notesWithSample from song
                            removeNotesFromSong(notesWithSample);
                            deactivateSample(audioEl);
                        } else {
                            // Don't deactivate sample
                            checkbox.checked = true;
                        }
                    } else {
                        // deactivate
                        deactivateSample(audioEl);
                    }
                }
            });

            const sampleLi = document.createElement("li");
            sampleLi.classList.add("sample-checkbox");
            sampleLi.append(sampleCheckbox);
            sampleLi.append(sampleLabel);
            sampleLi.addEventListener("pointerdown", (event) => {
                playSound(audio);
            });
            checkBoxes.append(sampleLi);
            audioNum++;
        });
    };

    // -------------------------------
    // Song Settings
    // -------------------------------

    const setTempo = (value) => {
        bpm = value;
        msPerBeat = 60000 / bpm;
        track.duration = msPerBeat * 4 * measures;
        drawTrack();
        positionBeatIcons();
        positionPlayheadByElapsed();
    };

    const setMeasures = (value) => {
        measures = value;
        track.duration = msPerBeat * 4 * measures;
        drawTrack();
        positionBeatIcons();
        positionPlayheadByElapsed();
    };

    // -------------------------------
    // Playing Song
    // -------------------------------

    const startPlaying = () => {
        isPlaying = true;
        startTime = -1;
        window.requestAnimationFrame(step);
    };

    const stopPlaying = () => {
        isPlaying = false;
        stopRecording();
        playheadEl.classList.remove("on");
        // turn off colored background
        randomBackgroundColor(false);
    };

    const positionPlayheadByElapsed = () => {
        // console.log('positionPlayheadByElapsed()');
        const pctPlayed = elapsed / track.duration;
        // playheadEl.style.left = `${track.trackWidth * pctPlayed}px`;
        // console.log('     elapsed: ',elapsed);
        // console.log('     track.duration:',track.duration);
        // console.log('     track.trackWidth: ',track.trackWidth);
        // console.log('     left: ',track.trackWidth * pctPlayed);

        setPlayheadPosition(track.trackWidth * pctPlayed);
    };

    const getKeyFromSample = (audioEl) => {
        return document.querySelector(`.key[data-id="${audioEl.dataset.id}"]`);
    };

    const checkAndPlayNotes = (measure, beat, f0, f1) => {
        // While track is playing

        // Return true if 'note' is played, false if not
        const notesList = getNoteList(measure, beat);
        let foundNote = false;
        notesList.forEach((note) => {
            if (note.fraction >= f0 && note.fraction < f1) {
                // play it
                playSound(note.audio);
                // light up 'drumpad' .key for sample
                const key = getKeyFromSample(note.audio);

                if (key) {
                    const keyStyle = getComputedStyle(key);
                    if (keyStyle.borderRadius !== "1px") {
                        key.classList.add("playing");
                    }
                }
                // light up beat icon for 'note'
                if (note.beatIcon) {
                    if (!note.beatIcon.classList.contains("selected")) {
                        note.beatIcon.classList.add("on");
                    }
                }
                foundNote = true;
            }
        });
        return foundNote;
    };

    const removeDuplicateNotes = (note) => {
        // If note of same sample already in song less than minMSdiff away,
        // remove it and add this one.
        const minMSdiff = 10;
        const dupes = findSampleInSong(note.audio);
        for (const dupe of dupes) {
            const msDiff = getNotesMSdifference(note, dupe);
            if (getNotesMSdifference(note, dupe) < minMSdiff) {
                // remove dupe
                removeNoteFromSong(dupe);
            }
        }
    };  

    const toggleQuantize = () => {
        quantizeOn = !quantizeOn;
        document.getElementById("quantize-light").classList.toggle("on");
        positionBeatIcons();
    };

    const lockQuantized = () => {
        console.log("lockQuantized()");
        // replace regular note's properties with quantized note's properties
        const notesToQuantize = getAllNotesInSong();
        for (const note of notesToQuantize) {
            console.log("note: ", note);
            Object.assign(note, note.beatIcon.qNote);
        }
        removeDuplicateNotes();
    };

    const quantizeSelectedNotes = () => {
        // Quantize only the selected notes
    };

    const updateCounter = () => {
        document.getElementById(
            "counter"
        ).innerHTML = `measure ${currentMeasure}
                            beat ${currentBeat}
                            ms ${Math.round(currentMS)}`;
    };

    // =======================
    //   RECORDING
    // =======================
    const startRecording = () => {
        recLight.classList.add("on");
        isRecording = true;
        // quantizeTrack();
        startPlaying();
    };
    const stopRecording = () => {
        recLight.classList.remove("on");
        isRecording = false;
        // quantizeTrack();
    };
    const toggleRecording = () => {
        isRecording = !isRecording;
        if (isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    const toggleEdit = () => {
        isEditing = !isEditing;
        document.getElementById("edit-light").classList.toggle("on");
        if (!isEditing) {
            // Deselect all icons
            track.deselectBeatIcons();
        }
    };

    // ==============================
    //
    //    MANAGE NOTES / SONG
    //
    // ==============================

    const programNote = (audio, measure, beat, ms) => {
        // Create a note object and add it to song array
        // Also create quantized note and add it to songQuantized

        let beatIcon = null;
        if (audio.id != "tick") {
            beatIcon = makeBeatIcon();
        }
        if (!song[measure]) song[measure] = [];
        if (!song[measure][beat]) song[measure][beat] = [];
        const note = {
            audio,
            beatIcon,
            measure,
            beat,
            fraction: ms / msPerBeat,
        };

        removeDuplicateNotes(note);

        // Add note to song
        song[measure][beat].push(note);
        const qNote = quantizeNote(note);
        addNoteToSongQuantized(qNote);
        beatIcon.note = note;
        beatIcon.qNote = qNote;

        positionBeatIcon(note);

        return note;
    };

    const getNotesMSdifference = (note1, note2) => {
        const totalMS1 = track.duration + getNoteTotalMS(note1);
        const totalMS2 = track.duration + getNoteTotalMS(note2);
        return Math.abs(totalMS1 - totalMS2);
    };

    const checkSampleInSong = (audioEl) => {
        for (const measure of song) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        for (const note of beat) {
                            if (note.audio === audioEl) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    };

    const findSampleInSong = (audioEl) => {
        // console.log('\r\nfindSampleInSong()',audioEl);
        // returns array of notes
        const matchingNotes = [];
        // console.log('song',song);
        for (const measure of song) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        for (const note of beat) {
                            if (note.audio === audioEl) {
                                matchingNotes.push(note);
                            }
                        }
                    }
                }
            }
        }
        // console.log("matchingNotes", matchingNotes);
        return matchingNotes;
    };

    const removeNotesFromSong = (notesAr) => {
        for (const note of notesAr) {
            removeNoteFromSong(note);
        }
    };

    const removeNoteFromSong = (note) => {
        let icon = note.beatIcon;
        let beat = song[note.measure][note.beat];
        let noteIndex = beat.indexOf(note);

        // remove regular note
        if (noteIndex !== -1) {
            console.log("remove note");
            beat.splice(noteIndex, 1);
        }

        // quantized note
        const qNote = icon.qNote;
        if (qNote) {
            const qBeat = songQuantized[qNote.measure][qNote.beat];
            noteIndex = qBeat.indexOf(qNote);
            qBeat.splice(noteIndex, 1);
        }

        icon.remove();
        checkTurnOnCopyButton();
    };

    const getAllNotesInSong = () => {
        const notes = [];
        for (const measure of song) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        notes.push(...beat);
                    }
                }
            }
        }
        return notes;
    };

    const getNoteList = (measure, beat) => {
        // console.log("getNoteList: ", measure, beat);
        // console.log("song: ", song);
        const songAr = quantizeOn ? songQuantized : song;
        if (!songAr[measure]) return [];
        if (!songAr[measure][beat]) return [];
        // console.log(songAr[measure][beat].length)r
        return songAr[measure][beat];
    };

    const getNextBeat = (measureNum, beatNum) => {
        // console.log("getNextBeat()");
        const newBeat = (measureNum * 4 + beatNum + 1) % (measures * 4);
        const nextMeasure = Math.floor(newBeat / 4);
        const nextBeat = newBeat - nextMeasure * 4;
        // console.log("from", measureNum, beatNum);
        // console.log("to: ", nextMeasure, nextBeat);
        return {
            measure: nextMeasure,
            beat: nextBeat,
        };
    };

    const addNoteToSongQuantized = (note) => {
        if (!songQuantized[note.measure]) songQuantized[note.measure] = [];
        if (!songQuantized[note.measure][note.beat])
            songQuantized[note.measure][note.beat] = [];
        songQuantized[note.measure][note.beat].push(note);
    };

    const quantizeNote = (note) => {
        // console.log("quantize note", note);
        let noteMeasure = note.measure;
        let noteBeat = note.beat;
        let fraction = note.fraction;
        let qFraction;
        // round

        // one8th is half beat
        const one8th = 0.5;
        if (fraction > one8th) {
            // console.log("2nd 8th");
            // 2nd 8th
            qFraction =
                one8th + Math.round((fraction - one8th) / one8th) * one8th;
            if (qFraction === 1) {
                // End of beat, put at start of next beat
                // console.log("start: ", noteMeasure, noteBeat, fraction);
                const nextBeatObj = getNextBeat(noteMeasure, noteBeat);
                noteMeasure = nextBeatObj.measure;
                noteBeat = nextBeatObj.beat;
                qFraction = 0;
                // console.log("end: ", noteMeasure, noteBeat, qFraction);
            }
        } else {
            // first 8th
            // console.log("first 8th");
            qFraction = Math.round(fraction / one8th) * one8th;
        }

        const quantizedNote = {
            audio: note.audio,
            beatIcon: note.beatIcon,
            measure: noteMeasure,
            beat: noteBeat,
            fraction: qFraction,
        };
        // console.log("quantized note: ", quantizedNote);
        return quantizedNote;
    };

    const quantizeTrack = () => {
        // move all 'notes' to closest 8th
        songQuantized.length = 0;
        for (const measure of song) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        for (const note of beat) {
                            const quantizedNote = quantizeNote(note);
                            addNoteToSongQuantized(quantizedNote);
                        }
                    }
                }
            }
        }
    };

    const clearTrack = (clearAll = false) => {
        clearLight.classList.add("on");

        let selectedIcons;
        // clear selected beat icons
        if (clearAll) {
            selectedIcons = selectAllIcons();
        } else {
            selectedIcons = Array.from(
                beatIcons.querySelectorAll(".beat-icon.selected")
            );
            if (selectedIcons.length === 0) {
                const response = confirm("Clear the whole track");
                if (response) {
                    // user pressed the Ok button
                    selectedIcons = selectAllIcons();
                } else {
                    console.log("dont clear track");
                    // user canceled
                    return;
                }
            }
        }

        for (const icon of selectedIcons) {
            // find its note in the song
            removeNoteFromSong(icon.note);
        }
    };

    const buildSongFromSongCode = (songJson) => {
        // console.log("code", code);
        // songJson is an array of notes
        const songCodeObj = JSON.parse(songJson);
        // clear song
        clearTrack(true);
        // set tempo
        setTempo(songCodeObj.bpm);
        document.getElementById("tempo-slider").value = bpm;
        document.querySelector(".info.tempo span.value").innerHTML = bpm;
        // set measures
        setMeasures(songCodeObj.measures);
        document.getElementById("measures-slider").value = measures;
        document.querySelector(".info.measure span.value").innerHTML = measures;

        // Program song notes
        for (const note of songCodeObj.notes) {
            const audio = document.querySelector(
                `audio[src="${note.audioSrc}"]`
            );
            const ms = note.fraction * msPerBeat;
            programNote(audio, note.measure, note.beat, ms);
        }
        // Activate samples in song
        clearSampleKeys();
        for (const audio of allSamples) {
            if (checkSampleInSong(audio)) {
                console.log(audio.dataset.sample, "in song");
                // Activate this sample if not active
                activateSample(audio);
            }
        }
        // Position beat Icons
        positionBeatIcons();
    };

    const copySelectedNotesToClipboard = () => {
        console.log("copySelectedNotesToClipboard()");
        // Copy selected Notes
        const selectedIcons = Array.from(
            beatIcons.querySelectorAll(".beat-icon.selected")
        );
        console.log("selectedIcons.length", selectedIcons.length);
        track.clipboardNotes.length = 0;
        for (const icon of selectedIcons) {
            const note = icon.note; //getNoteFromBeatIcon(icon);
            // console.log("note: ", note);
            track.clipboardNotes.push(note);
        }
        if (track.clipboardNotes.length !== 0) {
            document.getElementById("paste-notes").classList.add("on");
        }
    };

    const getNoteTotalMS = (note) => {
        return (
            note.measure * 4 * msPerBeat +
            note.beat * msPerBeat +
            note.fraction * msPerBeat
        );
    };

    const pasteNotesFromClipboard = () => {
        // Paste notes from clipboard

        // Move these helper functions to program's root level (if they're useful elsewhere)

        const getMeasureBeatMSfromMS = (ms) => {
            const measure = Math.floor(ms / (msPerBeat * 4)) % measures;
            const beat = Math.floor(ms / msPerBeat) % 4;
            ms = ms % msPerBeat;

            return {
                measure,
                beat,
                ms,
            };
        };
        const msToPx = (ms) => {
            const pxPerMS = track.trackWidth / track.duration;
            return pxPerMS * ms;
        };

        // sort left to right
        track.clipboardNotes.sort((A, B) => {
            return getNoteTotalMS(A) - getNoteTotalMS(B);
        });
        // console.log("clipboard: ", track.clipboardNotes);
        const leftmostNote = track.clipboardNotes[0];
        const leftmostTotalMS = getNoteTotalMS(leftmostNote);
        const playheadMS = getElapsedFromPlayheadPosition();

        for (const note of track.clipboardNotes) {
            const relativeMS = getNoteTotalMS(note) - leftmostTotalMS;
            const relativePX = msToPx(relativeMS);
            const noteMS = (playheadMS + relativeMS) % track.duration;
            // console.log('playheadMS',playheadMS);
            // console.log('relativeMS',relativeMS);
            // console.log('track.duration',track.duration);
            const nextMBMS = getMeasureBeatMSfromMS(noteMS);
            // console.log('note: ',note);
            programNote(
                note.audio,
                nextMBMS.measure,
                nextMBMS.beat,
                nextMBMS.ms
            );
        }
        track.deselectBeatIcons();
    };

    // --------------------------------
    //    end MANAGE NOTES / SONG
    // --------------------------------

    const getXinTrack = (pointerevent) => {
        const clientX = pointerevent.clientX;
        const trackX = trackEl.getBoundingClientRect().left;
        return clientX - trackX;
    };

    const toggleHelp = () => {
        document.getElementById("keys-help-panel").classList.toggle("hidden");
        // Hey Doug! There's a universal hidden attribute for HTML elements
        // element.hidden = true / element.hidden = false / element.hidden = !element.hidden...
    };

    // =======================
    //
    //    SAMPLES
    //
    // =======================

    const playSound = (audio) => {
        if (!(audio.currentTime === 0 || audio.ended)) {
            // console.log("overlap");
            playSampleCopy(audio);
        } else {
            audio.currentTime = 0;
            audio.play();
        }
    };

    const checkKeySound = (event) => {
        // console.log("checkKeySound(", event.code, ")");
        // handles instrument key down
        // const audio = document.querySelector(`audio[data-key="${event.code}"]`);
        const key = document.querySelector(
            `#keys .key[data-key="${event.code}"]`
        );
        // console.log("key", key);
        if (!key) return;
        const audio = document.querySelector(
            `audio[data-id="${key.dataset.id}"]`
        );
        // console.log("audio", audio);
        if (audio) {
            // If recording or editing, record note
            if (isRecording || isEditing) {
                programNote(audio, currentMeasure, currentBeat, currentMS);
            }

            // play note

            playSound(audio);
            key.classList.add("playing");
        }
    };

    const clearSampleKeys = () => {
        keysEl.innerHTML = "";
        activeSamples.length = 0;
    };

    const clearSampleKey = (audioEl) => {
        newKey.dataset.id = audioEl.dataset.id;
    };

    const loadSamplesLibrary = (libraryName) => {
        console.log("loadSamplesLibrary", libraryName);

        libraryEl = document.querySelector(
            `section.sample-library[data-lib="${libraryName}"]`
        );

        const samples = libraryEl.querySelectorAll(`audio`);
        activateSamples(samples);
    };

    const activateSamples = (audioEls) => {
        if (!Array.isArray(audioEls)) {
            audioEls = Array.from(audioEls);
        }
        const notesToRemove = [];
        for (const audioEl of activeSamples) {
            if (!audioEls.includes(audioEl)) {
                notesToRemove.push(...findSampleInSong(audioEl));
            }
        }
        if (notesToRemove.length > 0) {
            console.log("notesToRemove", notesToRemove);
            const confirmed = window.confirm(
                "This will deactivate any in-use samples, removing them from the track."
            );
            if (!confirmed) {
                // Abort!
                return;
            } else {
                // delete the notes
                removeNotesFromSong(notesToRemove);
            }
        }
        clearSampleKeys();
        audioEls.forEach((audioEl) => {
            activateSample(audioEl);
        });
        setCheckedSamplesByActiveSamples();
    };

    const arrangeSampleKeys = () => {
        const sampleKeys = Array.from(document.querySelectorAll("#keys .key"));
        // reorder sample Keys
        sampleKeys.sort((A, B) => {
            return A.dataset.id - B.dataset.id;
        });
        sampleKeys.forEach((keyEl) => {
            document.getElementById("keys").appendChild(keyEl);
        });
    };

    const createSampleKey = (audioEl) => {
        // how many keys are there already?
        const triggerIndex = document.querySelectorAll("#keys .key").length;

        // create key
        const newKey = document.createElement("div");
        newKey.classList.add("key");
        newKey.setAttribute("data-key", triggerKeys[triggerIndex].code);
        newKey.dataset.id = audioEl.dataset.id;
        newKey.innerHTML = `<kbd>${triggerKeys[triggerIndex].name}</kbd>
                    <span class="sound">${audioEl.dataset.sample}</span>`;
        audioEl.dataset.key = triggerKeys[triggerIndex].code;
        newKey.addEventListener("transitionend", (event) => {
            if (event.propertyName === "border-top-color") {
                removeTransition(event);
            }
        });
        keysEl.append(newKey);

        // arrangeSampleKeys();
    };

    const activateSample = (audioEl) => {
        if (activeSamples.includes(audioEl)) return;

        activeSamples.push(audioEl);
        // reorder samples
        activeSamples.sort((A, B) => {
            return A.dataset.id - B.dataset.id;
        });
        rebuildKeys();
    };

    const clearKeys = () => {
        // clear Keys
        document.getElementById("keys").innerHTML = "";
    };

    const rebuildKeys = () => {
        clearKeys();
        // reassign keys to activeSamples
        for (const audioEl of activeSamples) {
            createSampleKey(audioEl);
        }
    };

    const deactivateSample = (audioEl) => {
        if (!activeSamples.includes(audioEl)) return;
        // remove from activeSamples
        const sampleIndex = activeSamples.indexOf(audioEl);
        activeSamples.splice(sampleIndex, 1);
        // remove key
        const key = getKeyFromSample(audioEl);
        key.remove();
        rebuildKeys();
    };

    // =============================================
    //   end SAMPLES
    // =============================================

    // =============================================
    //   BEAT ICONS
    // =============================================

    const positionBeatIcon = (note) => {
        // console.log("position beat icon note", note);
        if (!note.beatIcon) return;

        // if (quantizeOn) {
        //     note = note.beatIcon.qNote;
        // }
        // x position
        const totalBeats = note.measure * 4 + note.beat + note.fraction;
        const pxPerBeat = track.trackWidth / (measures * 4);
        // const pixelsPerMS = track.trackWidth / track.duration;
        // const x = totalMS * pixelsPerMS;
        const x = totalBeats * pxPerBeat;
        // y position
        const drumIndex = activeSamples.indexOf(note.audio);
        const y =
            (drumIndex + 1) *
            (trackEl.offsetHeight / (activeSamples.length + 1));

        if (y === 0) {
            console.log("     beatIcon y = 0");
            console.log("activeSamples.length", activeSamples.length);
            console.log("audio.dataset.sample", note.audio.dataset.sample);
            console.log("drumIndex", drumIndex);
            console.log("trackEl.offsetHeight", trackEl.offsetHeight);
            console.log("activeSamples.length", activeSamples.length, "\n\r ");
        }

        note.beatIcon.style.left = x + "px";
        note.beatIcon.style.top = y + "px";
    };

    const makeBeatIcon = () => {
        const icon = document.createElement("div");
        icon.classList.add("beat-icon");

        icon.addEventListener("transitionend", (event) => {
            if (event.target.classList.contains("on")) {
                event.target.classList.remove("on");
            }
        });

        icon.addEventListener("pointerdown", (event) => {
            // Drag all selected icons
            if (icon.classList.contains("selected")) {
                draggingIcons = true;
                lastIconDragX = getXinTrack(event);
            }
            event.stopPropagation();
        });
        icon.addEventListener("pointerup", (event) => {
            if (isEditing || isRecording) {
                track.selectBeatIcon(icon);
            }
        });

        beatIcons.appendChild(icon);
        return icon;
    };

    const positionBeatIcons = () => {
        const songAr = quantizeOn ? songQuantized : song;
        for (const measure of songAr) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        for (const note of beat) {
                            positionBeatIcon(note);
                        }
                    }
                }
            }
        }
    };

    const selectAllIcons = () => {
        return Array.from(beatIcons.querySelectorAll(".beat-icon"));
    };

    const getNoteFromBeatIcon = (beatIcon) => {
        // or we can just set beatIcon.note when we create an icon
        for (const measure of song) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        for (const note of beat) {
                            if (note.beatIcon === beatIcon) {
                                return note;
                            }
                        }
                    }
                }
            }
        }
    };
    const getQuantizedNoteFromBeatIcon = (beatIcon) => {
        // or we can just set beatIcon.note when we create an icon
        for (const measure of songQuantized) {
            if (measure) {
                for (const beat of measure) {
                    if (beat) {
                        for (const note of beat) {
                            if (note.beatIcon === beatIcon) {
                                return note;
                            }
                        }
                    }
                }
            }
        }
    };

    const positionNoteFromIcon = (beatIcon) => {
        // console.log("positionNoteFromIcon()");
        // console.log(beatIcon);
        const note = beatIcon.note;

        const pctPos = beatIcon.offsetLeft / track.trackWidth;
        const elapsed = pctPos * track.duration;
        // console.log("elapsed", elapsed);
        const beats = Math.floor(elapsed / msPerBeat);
        const measure = Math.floor(beats / 4);
        const beat = beats - measure * 4;
        const ms = elapsed - beats * msPerBeat;
        // remove note from current place in song
        removeNoteFromSong(note);
        programNote(note.audio, measure, beat, ms);
    };

    // =============================================
    //   end BEAT ICONS
    // =============================================

    // =============================================
    //   LIGHTS
    // =============================================

    const removeTransition = (event) => {
        // Remove .key transition
        if (event.target.classList.contains("playing")) {
            event.target.classList.remove("playing");
        }
    };

    // Beat Light
    const showBeat = () => {
        if (getComputedStyle(beatLight).height !== "1.5rem") {
            beatLight.classList.add("on");
            if (
                getComputedStyle(playheadEl).width !== "2px" &&
                !playheadEl.classList.contains("on") &&
                !scrubbing
            ) {
                playheadEl.classList.add("on");
            }
        }
    };

    beatLight.addEventListener("transitionend", (event) => {
        if (event.target.classList.contains("on")) {
            event.target.classList.remove("on");
        }
    });
    playheadEl.addEventListener("transitionend", (event) => {
        if (event.target.classList.contains("on")) {
            event.target.classList.remove("on");
        }
    });

    // document.querySelector('.mega-drum-machine main').addEventListener('transitionend',event=>{
    //     // jump to color, then fade out
    //     event.target.classList.remove('colored');
    // })
    const randomBackgroundColor = (colors = true) => {
        const main = document.querySelector(".mega-drum-machine main");
        if (!colors) {
            // console.log("NO COLORS");
            main.style.setProperty("--beforeBG", "transparent");
            main.style.setProperty("--beforeBG-outer", "transparent");
            return;
        }
        // console.log("COLORS");
        // random color thanks to
        // https://css-tricks.com/snippets/javascript/random-hex-color/
        const randomColor =
            "#" + Math.floor(Math.random() * 16777215).toString(16);
        const randomColor2 =
            "#" + Math.floor(Math.random() * 16777215).toString(16);

        main.style.setProperty("--beforeBG", randomColor);
        main.style.setProperty("--beforeBG-outer", randomColor2);
        // main.style.setProperty("--beforeBG-outer", '#000000');
        const hpct = Math.round(Math.random() * 100) + "%";
        const vpct = Math.round(Math.random() * 100) + "%";
        const inner = Math.round(Math.random() * 60);
        const innerPct = inner + "%";
        const outerPct =
            inner + 10 + Math.round(Math.random() * (100 - inner)) + "%";
        main.style.setProperty("--h-pct", hpct);
        main.style.setProperty("--v-pct", vpct);
        main.style.setProperty("--inner-pct", innerPct);
        main.style.setProperty("--outer-pct", outerPct);
    };

    /*


             ad88888ba                                     88
            d8"     "8b  ,d                                88
            Y8,          88                                88
            `Y8aaaaa,  MM88MMM  ,adPPYba,  8b,dPPYba,      88           ,adPPYba,    ,adPPYba,   8b,dPPYba,
              `"""""8b,  88    a8P_____88  88P'    "8a     88          a8"     "8a  a8"     "8a  88P'    "8a
                    `8b  88    8PP"""""""  88       d8     88          8b       d8  8b       d8  88       d8
            Y8a     a8P  88,   "8b,   ,aa  88b,   ,a8"     88          "8a,   ,a8"  "8a,   ,a8"  88b,   ,a8"
             "Y88888P"   "Y888  `"Ybbd8"'  88`YbbdP"'      88888888888  `"YbbdP"'    `"YbbdP"'   88`YbbdP"'
                                           88                                                    88
                                           88                                                    88


    */
    let morethan5MSoffTempo = 0;
    let greatestOff = 0;
    function step(timestamp) {
        // console.log('======= step()');
        if (startTime === -1) {
            lastStamp = startTime = timestamp;
            elapsed = getElapsedFromPlayheadPosition();
            console.log("elapsed:", elapsed);
        }

        const stepTime = timestamp - lastStamp;
        const targetMS = 1000 / 60;
        const frameDiff = Math.abs(stepTime - targetMS);
        if (frameDiff > 20) {
            console.log("\r\ntargetMS", Math.round(1000 / 60));
            console.log("stepTime", Math.round(stepTime));
            console.log("frameDiff: ", frameDiff);
            greatestOff = Math.max(frameDiff, greatestOff);
            console.log("greatestOff", greatestOff);
            morethan5MSoffTempo++;
            console.log("morethan5MSoffTempo: ", morethan5MSoffTempo);
        }

        elapsed += timestamp - lastStamp;
        lastStamp = timestamp;

        const lastMeasure = currentMeasure;
        // Calculate Measure
        currentMeasure = Math.floor(elapsed / (msPerBeat * 4)) % measures;
        const lastBeat = currentBeat;
        // Calculate Beat
        currentBeat = Math.floor(elapsed / msPerBeat) % 4;
        const lastMS = currentMS;
        // Calculate MS
        currentMS = Math.floor(elapsed % msPerBeat);
        // Calculate last and current fraction of the beat
        const f0 = lastMS / msPerBeat;
        const f1 = currentMS / msPerBeat;
        // check for new beat
        let playedNote = false;
        if (currentBeat != lastBeat || elapsed === 0) {
            // On New Beat!
            if (isRecording) {
                playSound(document.getElementById("tick"));
            } else if (lightFrequency > 0) {
                randomBackgroundColor();
            }
            showBeat();
            // have we played through the track and started over?
            if (currentMeasure === 0 && currentBeat === 0) {
                elapsed = currentMS;
                startTime = timestamp - currentMS;
            }

            // end of last beat
            // start of this beat
            const playedNote1 = checkAndPlayNotes(lastMeasure, lastBeat, f0, 1);
            const playedNote2 = checkAndPlayNotes(
                currentMeasure,
                currentBeat,
                0,
                f1
            );
            playedNote = playedNote1 || playedNote2;
        } else {
            // this beat only
            playedNote = checkAndPlayNotes(currentMeasure, currentBeat, f0, f1);
            // check for 8th beat
            const msPer8th = msPerBeat * 0.5;
            if (lastMS < msPer8th && currentMS >= msPer8th) {
                if (lightFrequency === 8 || lightFrequency === 16)
                    randomBackgroundColor();
            } else {
                // check for 16th beat
                if (lightFrequency === 16) {
                    const msPer16th = msPer8th * 0.5;
                    if (
                        (lastMS < msPer16th && currentMS >= msPer16th) ||
                        (lastMS < msPer16th * 3 && currentMS >= msPer16th * 3)
                    ) {
                        if (Math.random() < 0.5) randomBackgroundColor();
                    }
                }
            }
        }
        if (playedNote && !isRecording && lightFrequency === 0) {
            randomBackgroundColor();
        }
        // console.log('currentMBMS:',currentMeasure,currentBeat,currentMS);
        // console.log('elapsed: ',elapsed);
        positionPlayheadByElapsed();
        updateCounter();
        if (isPlaying) {
            window.requestAnimationFrame(step);
        }
    }

    /*

             .o88b.  .d88b.  d8b   db d888888b d8888b.  .d88b.  db      .d8888.
            d8P  Y8 .8P  Y8. 888o  88 `~~88~~' 88  `8D .8P  Y8. 88      88'  YP
            8P      88    88 88V8o 88    88    88oobY' 88    88 88      `8bo.
            8b      88    88 88 V8o88    88    88`8b   88    88 88        `Y8b.
            Y8b  d8 `8b  d8' 88  V888    88    88 `88. `8b  d8' 88booo. db   8D
             `Y88P'  `Y88P'  VP   V8P    YP    88   YD  `Y88P'  Y88888P `8888Y'


    */
    // =======================
    //   CONTROLS
    // =======================

    // !!! Rename these sampleTriggers or something
    // const keys = document.querySelectorAll(".key");
    // keys.forEach((key) => {
    //     // when the css transition is done, remove the class
    //     key.addEventListener("transitionend", (event) => {
    //         // console.log(event.propertyName);
    //         if (event.propertyName === "border-top-color") {
    //             removeTransition(event);
    //         }
    //     });
    // });

    clearLight.addEventListener("transitionend", (event) => {
        if (event.target.classList.contains("on")) {
            event.target.classList.remove("on");
        }
    });

    tempoSlider.addEventListener("input", (event) => {
        // change tempo number display
        const valueDisplay = document.querySelector(".info.tempo .value");
        const oldvalue = bpm;
        const value = Number(event.target.value);
        valueDisplay.innerHTML = value;

        if (Math.abs(value - oldvalue) > 20) {
            setTempo(value);
        }
    });
    tempoSlider.addEventListener("change", (event) => {
        // set tempo
        const value = event.target.value;
        document.querySelector(".info.tempo .value").innerHTML = value;
        setTempo(value);
    });
    tempoSlider.addEventListener("pointerdown", (event) => {
        scrubbing = true;
    });
    tempoSlider.addEventListener("pointerup", (event) => {
        scrubbing = false;
    });
    measureSlider.addEventListener("input", (event) => {
        const value = event.target.value;
        document.querySelector(".info.measure .value").innerHTML = value;
        setMeasures(value);
    });

    window.addEventListener("keydown", (event) => {
        if (keysDown.includes(event.code)) {
            // key is already down
            return;
        } else {
            keysDown.push(event.code);
        }
        if (event.code === "KeyR") {
            // 'R'
            // record
            toggleRecording();
        } else if (event.code === "KeyX" || event.code === "Backspace") {
            // 'X' or Backspace
            // clear note/s
            clearTrack();
        } else if (event.code === "KeyQ") {
            // 'Q'
            // quantize
            toggleQuantize();
        } else if (keysDown.includes("KeyQ")) {
            if (event.code === "KeyL") {
                // 'Q' and 'L'
                // lock quantized
                lockQuantized();
            }
        } else if (event.code === "Space") {
            // Spacebar
            if (!isPlaying) {
                startPlaying();
            } else {
                stopPlaying();
            }
        } else if (event.code === "KeyE") {
            // 'E'
            // edit
            toggleEdit();
            // } else if (event.keyCode === 191) {
            //     // '?'
            //     // help
            //     toggleHelp();
        } else if (event.code === "KeyC") {
            // Copy selected notes
            copySelectedNotesToClipboard();
        } else if (event.code === "KeyV") {
            // Paste notes from clipboard into track
            pasteNotesFromClipboard();
        } else if (event.code === "Digit0" || event.code === "Numpad0") {
            setPlayheadPosition(0);
            setMeasureBeatMSFromPlayheadPosition();
        } else {
            // Maybe an instrument key
            checkKeySound(event);
        }
    });

    window.addEventListener("keyup", (event) => {
        const keyIndex = keysDown.indexOf(event.code);
        if (keyIndex !== -1) {
            keysDown.splice(keyIndex, 1);
        }
    });

    ////////////////////
    // Edit Beats
    ////////////////////

    checkTurnOnCopyButton = () => {
        if (
            document.querySelectorAll("#beat-icons .beat-icon.selected")
                .length === 0
        ) {
            // un-hilite copy-notes button
            document.getElementById("copy-notes").classList.remove("on");
        } else {
            document.getElementById("copy-notes").classList.add("on");
        }
    };

    track.selectBeatIcon = (beatIcon) => {
        // console.log('selectBeatIcon', beatIcon);
        if (!beatIcon.classList.contains("selected")) {
            beatIcon.classList.add("selected");
            playSound(beatIcon.note.audio);
            document.getElementById("copy-notes").classList.add("on");
        }
    };
    track.deselectBeatIcon = (beatIcon) => {
        beatIcon.classList.remove("selected");
    };
    track.deselectBeatIcons = () => {
        // deselect all beat icons
        let beatIcons = Array.from(
            document.querySelectorAll("#beat-icons .beat-icon")
        );
        for (const beatIcon of beatIcons) {
            track.deselectBeatIcon(beatIcon);
        }
    };
    track.toggleSelectBeat = (beatIcon) => {
        if (beatIcon.classList.contains("selected")) {
            track.deselectBeatIcon(beatIcon);
        } else {
            track.selectBeatIcon(beatIcon);
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
                track.selectBeatIcon(beatIcon);
            } else {
                track.deselectBeatIcon(beatIcon);
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

    trackEl.addEventListener("pointerdown", (event) => {
        if (draggingPlayhead || !isEditing) return;
        track.pointerdown = true;
        // Get the bounding rectangle of target (trackEl)
        const rect = event.currentTarget.getBoundingClientRect();

        // Mouse position
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        track.startXY = { x, y };
        track.marquis.classList.add("on");
        track.drawMarquis({ x, y }, { x, y });
        if (trackEl.setPointerCapture) {
            // track mousemove outside of element (and outside of window)
            trackEl.setPointerCapture(event.pointerId);
        }
    });
    document.addEventListener("pointerup", (event) => {
        // console.log("click track");
        if (!track.marquis.classList.contains("on")) return;
        track.pointerdown = false;
        track.marquis.classList.remove("on");

        // Get the bounding rectangle of target
        // const rect = event.currentTarget.getBoundingClientRect();
        const rect = trackEl.getBoundingClientRect();

        // Mouse position
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        track.marquisBeats(track.startXY, { x, y });

        // remove marquis
        if (trackEl.releasePointerCapture) {
            trackEl.releasePointerCapture(event.pointerId);
        }
    });

    trackEl.addEventListener("pointermove", (event) => {
        // console.log(track.pointerdown);
        if (track.pointerdown) {
            // Get the bounding rectangle of target
            const rect = event.currentTarget.getBoundingClientRect();

            // Mouse position
            const x = Math.max(
                0,
                Math.min(event.clientX - rect.left, rect.width)
            );
            const y = Math.max(
                0,
                Math.min(event.clientY - rect.top, rect.height)
            );
            // console.log('x',x);
            // console.log('y',y);

            // draw marquis
            track.drawMarquis(track.startXY, { x, y });
            track.marquisBeats(track.startXY, { x, y });
        }
    });

    const getPlayheadX = () => {
        // console.log('getPlayheadX()');
        // console.log('playheadEl.getBoundingClientRect().left',playheadEl.getBoundingClientRect().left);
        // console.log('playhead.offsetLeft',playhead.offsetLeft);
        // const playheadX = playheadEl.getBoundingClientRect().left;
        const playheadX = playheadEl.offsetLeft;
        // console.log('     playheadX:',playheadX);
        // console.log('     playheadEl.offsetLeft',playheadEl.offsetLeft);
        // console.log('   ^')
        return playheadX;
    };

    const getElapsedFromPlayheadPosition = () => {
        // console.log('getElapsedFromPlayheadPosition()');
        // const pctPos = playheadEl.offsetLeft / track.trackWidth;
        const pctPos = getPlayheadX() / track.trackWidth;
        // console.log('     playheadEl.offsetLeft:',playheadEl.offsetLeft);
        // console.log('     playheadEl.getBoundingClientRect().left:',playheadEl.getBoundingClientRect().left);
        // console.log('     scrollLeft: ',playheadEl.scrollLeft);
        // console.log('     track.trackwidth:',track.trackWidth);
        // console.log('     elapsed:',pctPos * track.duration);
        // console.log('   ^')
        return pctPos * track.duration;
    };

    const setMeasureBeatMSFromPlayheadPosition = () => {
        const elapsed = getElapsedFromPlayheadPosition();
        // console.log("elapsed: ", elapsed);
        const beats = Math.floor(elapsed / msPerBeat);
        currentMeasure = Math.floor(beats / 4);
        currentBeat = beats - currentMeasure * 4;
        currentMS = elapsed - beats * msPerBeat;
        // console.log("currentMBMS: ", currentMeasure, currentBeat, currentMS);
        // console.log("   ^");
        updateCounter();
    };
    // const getPlayheadMS = () => {
    //     const playheadX = playheadEl.offsetLeft;
    //     return (playheadX / track.trackWidth) * track.duration;
    // };

    const setPlayheadPosition = (playheadX) => {
        // console.log('setPlayheadPosition('+playheadX+')');
        playheadEl.style.left = playheadX + "px";
        // console.log('playhead.offsetLeft',playhead.offsetLeft);
    };

    // Drag Playhead
    playheadEl.addEventListener("pointerdown", (event) => {
        // console.log("Mouse Down on Playhead");
        draggingPlayhead = true;
    });
    document
        .getElementById("playhead-gutter")
        .addEventListener("pointerdown", (event) => {
            draggingPlayhead = true;
            const clientX = event.clientX;
            const trackX = trackEl.getBoundingClientRect().left;
            let playheadX = clientX - trackX;
            playheadX = Math.max(Math.min(playheadX, track.trackWidth), 0);

            setPlayheadPosition(playheadX);
            setMeasureBeatMSFromPlayheadPosition();
        });

    document.body.addEventListener("pointermove", (event) => {
        if (draggingPlayhead) {
            // console.log("dragging playhead");
            // get mouse x relative to Track
            const clientX = event.clientX;
            const trackX = trackEl.getBoundingClientRect().left;
            let playheadX = clientX - trackX;
            playheadX = Math.max(Math.min(playheadX, track.trackWidth), 0);

            setPlayheadPosition(playheadX);
            setMeasureBeatMSFromPlayheadPosition();
            // console.log(playheadX + "px");
        } else if (draggingIcons) {
            // Drag Icons
            const newIconDragX = getXinTrack(event);
            const dragDistX = event.movementX; //newIconDragX - lastIconDragX; //
            const selectedIcons = Array.from(
                beatIcons.querySelectorAll(".beat-icon.selected")
            );
            for (icon of selectedIcons) {
                icon.style.left = `${icon.offsetLeft + dragDistX}px`;
            }
            lastIconDragX = newIconDragX;
        }
    });
    document.body.addEventListener("pointerup", (event) => {
        // console.log("Release Playhead");

        draggingPlayhead = false;
        if (draggingIcons) {
            // reset notes of selected icons
            const selectedIcons = Array.from(
                beatIcons.querySelectorAll(".beat-icon.selected")
            );
            // console.log('selectedIcons',selectedIcons)
            for (icon of selectedIcons) {
                icon.classList.remove("selected");
                positionNoteFromIcon(icon);
            }

            draggingIcons = false;
        }
    });

    // COPY / PASTE NOTES
    document
        .getElementById("copy-notes")
        .addEventListener("pointerdown", (event) => {
            copySelectedNotesToClipboard();
        });
    document
        .getElementById("paste-notes")
        .addEventListener("pointerdown", (event) => {
            pasteNotesFromClipboard();
        });

    // HELP
    document
        .getElementById("key-help-icon")
        .addEventListener("pointerdown", (event) => {
            toggleHelp();
        });
    document
        .querySelector("#keys-help-panel .close")
        .addEventListener("pointerdown", (event) => {
            toggleHelp();
        });

    // GET / PASTE TRACK CODE

    document
        .getElementById("get-code-button")
        .addEventListener("pointerdown", (event) => {
            // copy JSON to clipboard
            // create array of notes - measure, beat, fraction, and relative audio src path
            const notes = [];
            for (const measure of song) {
                // console.log("measure", measure);
                if (measure !== undefined) {
                    for (const beat of measure) {
                        // console.log("beat", beat);
                        if (beat !== undefined) {
                            for (const note of beat) {
                                // console.log('note',note);
                                notes.push({
                                    audioSrc: note.audio.getAttribute("src"),
                                    measure: note.measure,
                                    beat: note.beat,
                                    fraction: note.fraction,
                                });
                            }
                        }
                    }
                }
            }
            const songCode = {
                bpm,
                measures,
                notes,
            };
            // console.log("notes", notes);
            const codeJson = JSON.stringify(songCode);
            // console.log(codeJson);
            // Copy the text inside the text field
            navigator.clipboard.writeText(codeJson);
        });
    document
        .getElementById("enter-code-button")
        .addEventListener("pointerdown", (enter) => {
            const jsonCode = document.getElementById("code-input").value;
            buildSongFromSongCode(jsonCode);
        });

    const setSamplesByChecked = () => {
        const checkedSamples = document.querySelectorAll(
            '#track-tools #sample-selector-panel ul li input[type="checkbox"]:checked'
        );

        const audios = [];
        checkedSamples.forEach((checkbox) => {
            const audioEl = document.querySelector(
                `audio[data-id="${checkbox.dataset.id}"]`
            );
            audios.push(audioEl);
        });
        activateSamples(audios);
    };

    const setCheckedSamplesByActiveSamples = () => {
        const checkBoxes = document.querySelectorAll(
            '#track-tools #sample-selector-panel ul li input[type="checkbox"]'
        );
        // Checked or Unchecked
        checkBoxes.forEach((checkbox) => {
            const audioEl = document.querySelector(
                `audio[data-id="${checkbox.dataset.id}"]`
            );
            checkbox.checked = activeSamples.includes(audioEl);
            // console.log(
            //     audioEl.dataset.sample,
            //     "index: ",
            //     activeSamples.indexOf(audioEl)
            // );
        });
    };
    const sampleSelectorPanel = document.getElementById(
        "sample-selector-panel"
    );
    sampleSelectorPanel.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
    });
    const closeSamplesPanel = (event) => {
        //Hide the menus if visible
        sampleSelectorPanel.classList.add("hidden");
        // Set the panel's click outside to close panel
        window.removeEventListener("pointerdown", closeSamplesPanel);
    };

    const toggleSampleSelectorPanel = () => {
        sampleSelectorPanel.classList.toggle("hidden");
        if (sampleSelectorPanel.classList.contains("hidden")) {
            // Just closed panel, reset samples
            setSamplesByChecked();
        } else {
            // Just opened checkbox panel, check active samples
            setCheckedSamplesByActiveSamples();

            setTimeout(() => {
                window.addEventListener("pointerdown", closeSamplesPanel);
            }, 0);
        }
    };

    window.addEventListener("resize", (event) => {
        redrawTrack();
    });

    document
        .getElementById("sample-selector-button")
        .addEventListener("pointerdown", (event) => {
            toggleSampleSelectorPanel();
        });
    document
        .querySelector("#sample-selector-panel .close")
        .addEventListener("pointerdown", closeSamplesPanel);

    //
    // PRESETS
    //
    const presetSongs = {
        "beat-1": `{"bpm":120,"measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0.029143897996357013},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":0,"fraction":0.02185792349726776},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":1,"fraction":0.020036429872495546},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":1,"fraction":0.5154826958105648},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":1,"fraction":0.005464480874316905},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":2,"fraction":0.5282331511839706},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":2,"fraction":0.003642987249544376},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":2,"fraction":0.7686703096539159},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":3,"fraction":0.016393442622950716},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":3,"fraction":0.5118397085610205},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":3,"fraction":0.0018214936247723018},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":3,"fraction":0.009107468123861508},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":0,"fraction":0.007285974499088752},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":0,"fraction":0.9981785063752268},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":0,"fraction":0.038},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":0,"fraction":0.5173041894353373},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":1,"fraction":0.4936247723132965},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":1,"fraction":0.012750455373406112},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":1,"fraction":0.03460837887067373},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":1,"fraction":0.02817622950819623},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":1,"fraction":0.479052823315119},{"audioSrc":"./sounds/kick.wav","measure":1,
        
        "beat":2,"fraction":0.5063752276867026},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":2,"fraction":0.9945355191256822},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":2,"fraction":0.775956284153006},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":2,"fraction":0.03278688524590143},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":2,"fraction":0.072},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":2,"fraction":0.520947176684881},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":3,"fraction":0.4899817850637519},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":3,"fraction":0.016},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":3,"fraction":0.01},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":3,"fraction":0.448},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":3,"fraction":0.5045537340619312},{"audioSrc":"./sounds/tink.wav","measure":2,"beat":0,"fraction":0.014571948998177504},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":0,"fraction":0.021857923497266712},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":0,"fraction":0.9981785063752268},{"audioSrc":"./sounds/clap.wav","measure":2,"beat":1,"fraction":0.012750455373405202},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":1,"fraction":0.5081967213114749},{"audioSrc":"./sounds/tink.wav","measure":2,"beat":1,"fraction":0.9963570127504536},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":2,"fraction":0.5209471766848801},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":2,"fraction":0.7613843351548257},{"audioSrc":"./sounds/tink.wav","measure":2,"beat":2,"fraction":0.9945355191256822},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":3,"fraction":0.0018214936247713922},{"audioSrc":"./sounds/clap.wav","measure":2,"beat":3,"fraction":0.0091074681238606},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":3,"fraction":0.5045537340619303},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":3,"fraction":0.9999999999999982},{"audioSrc":"./sounds/cowbell.wav","measure":3,"beat":0,"fraction":0.030714025500910794},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":0,"fraction":0.9908925318761358},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":0,"fraction":0.5282900728597452},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.005464480874315995},{"audioSrc":"./sounds/cowbell_muted.wav","measure":3,"beat":1,"fraction":0.02089025500910611},{"audioSrc":"./sounds/tink.wav","measure":3,"beat":1,"fraction":0.027322404371583616},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":1,"fraction":0.48633879781420547},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.24815724815724935},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.5102375102375117},{"audioSrc":"./sounds/tink.wav","measure":3,"beat":2,"fraction":0.025500910746810403},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":2,"fraction":0.4990892531876125},{"audioSrc":"./sounds/cowbell_muted.wav","measure":3,"beat":2,"fraction":0.5136612021857909},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":2,"fraction":0.7686703096539168},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":2,"fraction":0.987249544626593},{"audioSrc":"./sounds/cowbell.wav","measure":3,"beat":2,"fraction":0.024817850637524317},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":3,"fraction":0.002714025500910793},{"audioSrc":"./sounds/tink.wav","measure":3,"beat":3,"fraction":0.008714025500910794},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":3,"fraction":0.48269581056466265},{"audioSrc":"./sounds/hihat.wav","measure":3,"beat":3,"fraction":0.009107468123862417},{"audioSrc":"./sounds/openhat.wav","measure":3,"beat":3,"fraction":0.5006830601092898},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":3,"fraction":0.5254439890710383},{"audioSrc":"./sounds/cowbell_muted.wav","measure":3,"beat":3,"fraction":0.506142506142507},{"audioSrc":"./sounds/ride.wav","measure":3,"beat":3,"fraction":0.9868959868959882}]}`,
        "beat-2": `{"bpm":"83","measures":"2","notes":[{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0.018214936247723135},{"audioSrc":"./sounds/boom.wav","measure":0,"beat":0,"fraction":0.02185792349726776},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":0,"fraction":0.5209471766848816},{"audioSrc":"./sounds/openhat.wav","measure":0,"beat":0,"fraction":0.016450364298724953},{"audioSrc":"./sounds/tom.wav","measure":0,"beat":0,"fraction":0.7540983606557377},{"audioSrc":"./sounds/cowbell.wav","measure":0,"beat":0,"fraction":0.02621243169398907},{"audioSrc":"./sounds/ride.wav","measure":0,"beat":0,"fraction":0.02621243169398907},{"audioSrc":"./sounds/openhat.wav","measure":0,"beat":0,"fraction":0.04703333333333334},{"audioSrc":"./sounds/cowbell_muted.wav","measure":0,"beat":0,"fraction":0.014571948998178506},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":1,"fraction":0.7413479052823315},{"audioSrc":"./sounds/cowbell_muted.wav","measure":0,"beat":1,"fraction":0.502504553734062},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":1,"fraction":0},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":1,"fraction":0.020036429872495494},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":1,"fraction":0.02367941712204006},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":2,"fraction":0.4990892531876138},{"audioSrc":"./sounds/boom.wav","measure":0,"beat":2,"fraction":0.5136612021857923},{"audioSrc":"./sounds/cowbell_muted.wav","measure":0,"beat":2,"fraction":0.500028460837887},{"audioSrc":"./sounds/tom.wav","measure":0,"beat":2,"fraction":0.25865209471766865},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":3,"fraction":0.016393442622950716},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":3,"fraction":0.49362477231329693},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":3,"fraction":0.25495218579234963},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":3,"fraction":0.007416666666666667},{"audioSrc":"./sounds/boom.wav","measure":0,"beat":3,"fraction":0.7579121129326044},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":3,"fraction":0.737704918032787},{"audioSrc":"./sounds/cowbell_muted.wav","measure":0,"beat":3,"fraction":0.25657445355191266},{"audioSrc":"./sounds/openhat.wav","measure":1,"beat":0,"fraction":0.014571948998178885},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":0,"fraction":0.016336520947177132},{"audioSrc":"./sounds/boom.wav","measure":1,"beat":0,"fraction":0.01997950819672154},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":0,"fraction":0.032704918032787175},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":0,"fraction":0.5190687613843354},{"audioSrc":"./sounds/tom.wav","measure":1,"beat":0,"fraction":0.7522199453551913},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":0,"fraction":0.9789049180327872},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":0,"fraction":0.9981215846994539},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":1,"fraction":0.018158014571949335},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":1,"fraction":0.021801001821493745},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":1,"fraction":0.5006261384335157},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":1,"fraction":0.7394694899817846},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":1,"fraction":0.9799066484517306},{"audioSrc":"./sounds/tom.wav","measure":1,"beat":2,"fraction":0.2567736794171231},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":2,"fraction":0.4972108378870677},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":2,"fraction":0.49815004553734143},{"audioSrc":"./sounds/boom.wav","measure":1,"beat":2,"fraction":0.5117827868852466},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":2,"fraction":0.9636882513661206},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":3,"fraction":0.005538251366121366},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":3,"fraction":0.01451502732240493},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":3,"fraction":0.25307377049180346},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":3,"fraction":0.2546960382513659},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":3,"fraction":0.49174635701275116},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":3,"fraction":0.7358265027322403},{"audioSrc":"./sounds/boom.wav","measure":1,"beat":3,"fraction":0.7560336976320575}]}`,

        "beat-3": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0.026359143327841845},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":0,"fraction":0.572},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":0,"fraction":0.506},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":0,"fraction":0.04612850082372323},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":1,"fraction":0.542009884678748},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":1,"fraction":0.084},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":1,"fraction":0.54},{"audioSrc":"./sounds/tom.wav","measure":0,"beat":1,"fraction":0.27543245469522254},{"audioSrc":"./sounds/tom.wav","measure":0,"beat":1,"fraction":0.5209277182866556},{"audioSrc":"./sounds/tom.wav","measure":0,"beat":1,"fraction":0.018765444810543614},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":2,"fraction":0.04283360790774304},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":2,"fraction":0.54},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":2,"fraction":0.5172981878088962},{"audioSrc":"./sounds/boom.wav","measure":0,"beat":2,"fraction":0.08},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":3,"fraction":0.5321252059308071},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":3,"fraction":0.06425041186161434},{"audioSrc":"./sounds/tink.wav","measure":0,"beat":3,"fraction":0.574},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":3,"fraction":0.018121911037891094},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":0,"fraction":0.520593080724876},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":0,"fraction":0.019769357495881195},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":0,"fraction":0.032948929159802444},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":0,"fraction":0.9818780889621085},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":0,"fraction":0.015007207578254111},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":0,"fraction":0.5061264415156511},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":1,"fraction":0.034596375617792545},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":1,"fraction":0.5090609555189458},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":1,"fraction":0.5354200988467883},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":1,"fraction":0.007567957166392261},{"audioSrc":"./sounds/tom.wav","measure":1,"beat":1,"fraction":0.2850082372322904},{"audioSrc":"./sounds/tom.wav","measure":1,"beat":1,"fraction":0.5024711696869854},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":2,"fraction":0.016474464579900996},{"audioSrc":"./sounds/tink.wav","measure":1,"beat":2,"fraction":0.504118616144975},{"audioSrc":"./sounds/cowbell.wav","measure":1,"beat":2,"fraction":0.009884678747940598},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":2,"fraction":0.4992535008237237},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":2,"fraction":0.5124588138385497},{"audioSrc":"./sounds/boom.wav","measure":1,"beat":2,"fraction":0.023064250411861394},{"audioSrc":"./sounds/openhat.wav","measure":1,"beat":2,"fraction":0.49093904448105424},{"audioSrc":"./sounds/ride.wav","measure":1,"beat":2,"fraction":0.003294892915980199},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":3,"fraction":0.004942339373970753},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":3,"fraction":0.03130148270181144},{"audioSrc":"./sounds/cowbell_muted.wav","measure":1,"beat":3,"fraction":0.4969110378912683},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":3,"fraction":0.5112747116968694}]}`,

        "beat-4": `{"bpm":"160","measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":1,"fraction":0.5065805888223553},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":1,"fraction":0.0090090090090089},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":2,"fraction":0.010853293413173787},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":2,"fraction":0.5079216566866269},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":2,"fraction":0.5095638867635808},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":3,"fraction":0.5118755118755121},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":0,"fraction":0.5109780439121759},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":1,"fraction":0.005988023952095318},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":1,"fraction":0.0057330057330056096},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":2,"fraction":0.011976047904191546},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":2,"fraction":0.5049900199600798},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":2,"fraction":0.5069860279441119},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":3,"fraction":0.5077881619937689},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":0,"fraction":0.030604437643457275},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":0,"fraction":0.006120887528691431},{"audioSrc":"./sounds/hihat.wav","measure":2,"beat":1,"fraction":0.039613446652466175},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":1,"fraction":0.537185026465813},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":2,"fraction":0.04145773105663088},{"audioSrc":"./sounds/hihat.wav","measure":2,"beat":2,"fraction":0.5385260943300842},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":2,"fraction":0.5156847742922728},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":3,"fraction":0.5424799495189687},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":0,"fraction":0.4743687834736047},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.013006885998470304},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.4904361132364202},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.9923488905891369},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","measure":3,"beat":1,"fraction":0.013006885998470049},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":2,"fraction":0.9961744452945667},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":2,"fraction":0.2739097169089513},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":2,"fraction":0.49426166794184995},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","measure":3,"beat":2,"fraction":0.004590665646520695},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":3,"fraction":0.5225707727620489},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","measure":3,"beat":3,"fraction":0.008416220351949354}]}`,

        "beat-5": `{"bpm":"96","measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0.019656019656019656},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0.5110565110565111},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":1,"fraction":0.9983619983619985},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":1,"fraction":0.009009009009008877},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":1,"fraction":0.009009009009008877},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":1,"fraction":0.2710892710892711},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":1,"fraction":0.5140186915887851},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":2,"fraction":0.7518427518427521},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":2,"fraction":0.008567217387310666},{"audioSrc":"./sounds/hihat.wav","measure":0,"beat":2,"fraction":0.5150424426125355},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":3,"fraction":0.013923013923013969},{"audioSrc":"./sounds/snare.wav","measure":0,"beat":3,"fraction":0.018},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":0,"fraction":0.016380016380016512},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":0,"fraction":0.5068847256347262},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":1,"fraction":0.012285012285012272},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":1,"fraction":0.01883701883701906},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":1,"fraction":0.27436527436527397},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":1,"fraction":0.7601863226863228},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":1,"fraction":0.5022455548156489},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":1,"fraction":0.9967940806141734},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":2,"fraction":0.014742014742014363},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":2,"fraction":0.7485667485667482},{"audioSrc":"./sounds/hihat.wav","measure":1,"beat":2,"fraction":0.5032693058393998},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":3,"fraction":0.01},{"audioSrc":"./sounds/snare.wav","measure":1,"beat":3,"fraction":0.26479750778816236},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":0,"fraction":0.024922118380061874},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":0,"fraction":0.5109034267912764},{"audioSrc":"./sounds/ride.wav","measure":2,"beat":0,"fraction":0.014602803738319198},{"audioSrc":"./sounds/openhat.wav","measure":2,"beat":0,"fraction":0.014602803738319198},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":1,"fraction":0.009345794392522658},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":1,"fraction":0.009345794392522658},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":1,"fraction":0.27102803738317743},{"audioSrc":"./sounds/hihat.wav","measure":2,"beat":1,"fraction":0.5202492211838006},{"audioSrc":"./sounds/cowbell_muted.wav","measure":2,"beat":1,"fraction":0.004964953271027479},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":2,"fraction":0.006230529595015105},{"audioSrc":"./sounds/hihat.wav","measure":2,"beat":2,"fraction":0.01869158878504677},{"audioSrc":"./sounds/hihat.wav","measure":2,"beat":2,"fraction":0.5171339563862916},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":2,"fraction":0.7538940809968845},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":3,"fraction":0.015576323987537763},{"audioSrc":"./sounds/snare.wav","measure":2,"beat":3,"fraction":0.02803738317757088},{"audioSrc":"./sounds/cowbell_muted.wav","measure":2,"beat":3,"fraction":0.005110981308411283},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":0,"fraction":0.024922118380061874},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":0,"fraction":0.5109034267912764},{"audioSrc":"./sounds/ride.wav","measure":3,"beat":0,"fraction":0.0009248442367606913},{"audioSrc":"./sounds/openhat.wav","measure":3,"beat":0,"fraction":0.0009248442367606913},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":1,"fraction":0.021806853582554322},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.021806853582554322},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.28348909657321053},{"audioSrc":"./sounds/hihat.wav","measure":3,"beat":1,"fraction":0.5077881619937689},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":1,"fraction":0.7694704049844237},{"audioSrc":"./sounds/hihat.wav","measure":3,"beat":2,"fraction":0.006230529595015105},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":2,"fraction":0.018691588785045316},{"audioSrc":"./sounds/hihat.wav","measure":3,"beat":2,"fraction":0.5046728971962613},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":2,"fraction":0.7538940809968859},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":3,"fraction":0.015576323987537763},{"audioSrc":"./sounds/snare.wav","measure":3,"beat":3,"fraction":0.26479750778816236}]}`,

        "beat-6": `{"bpm":120,"measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","measure":0,"beat":0,"fraction":0.03943661971830986},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":1,"fraction":0.00845070422535207},{"audioSrc":"./sounds/kick.wav","measure":0,"beat":2,"fraction":0.49577464788732367},{"audioSrc":"./sounds/clap.wav","measure":0,"beat":3,"fraction":0.008450704225352183},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":0,"fraction":0.011267605633802759},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":0,"fraction":0.9802816901408451},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":1,"fraction":0.509859154929577},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":2,"fraction":0.46760563380281656},{"audioSrc":"./sounds/clap.wav","measure":1,"beat":2,"fraction":0.9802816901408451},{"audioSrc":"./sounds/kick.wav","measure":1,"beat":3,"fraction":0.5060144346431434},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":0,"fraction":0.011267605633803215},{"audioSrc":"./sounds/clap.wav","measure":2,"beat":0,"fraction":0.980281690140846},{"audioSrc":"./sounds/kick.wav","measure":2,"beat":2,"fraction":0.46760563380281744},{"audioSrc":"./sounds/clap.wav","measure":2,"beat":2,"fraction":0.980281690140846},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":0,"fraction":0.011267605633802304},{"audioSrc":"./sounds/kick.wav","measure":3,"beat":1,"fraction":0.5236567762630311},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":2,"fraction":0.016901408450705275},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":2,"fraction":0.5126760563380285},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":3,"fraction":0.019718309859154032},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":3,"fraction":0.5042253521126768},{"audioSrc":"./sounds/clap.wav","measure":3,"beat":3,"fraction":0.2788732394366198},{"audioSrc":"./sounds/ride.wav","measure":3,"beat":3,"fraction":0.09}]}`,

        "beat-box-2": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","measure":0,"beat":0,"fraction":0.7589900535577658},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","measure":0,"beat":0,"fraction":0.2754399387911247},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","measure":0,"beat":0,"fraction":0.00612088752869166},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","measure":0,"beat":0,"fraction":0.5141545524100994},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","measure":0,"beat":1,"fraction":0.009946442234123993},{"audioSrc":"./sounds/beatbox/beatbox_BackwardsSnare.wav","measure":0,"beat":1,"fraction":0.4996174445294569},{"audioSrc":"./sounds/beatbox/beatboxKickHic.wav","measure":0,"beat":2,"fraction":0.007651109410864365},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","measure":0,"beat":2,"fraction":0.9992348890589138},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","measure":1,"beat":0,"fraction":0.7681713848508034},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","measure":1,"beat":0,"fraction":0.009181331293037148},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","measure":1,"beat":0,"fraction":0.5172149961744453},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","measure":1,"beat":0,"fraction":0.24789594491201206},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","measure":1,"beat":1,"fraction":0.013006885998470353},{"audioSrc":"./sounds/beatbox/beatbox_BackwardsSnare.wav","measure":1,"beat":1,"fraction":0.5087987758224936},{"audioSrc":"./sounds/beatbox/beatboxKickHic.wav","measure":1,"beat":2,"fraction":0.004590665646518574},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","measure":1,"beat":2,"fraction":0.775822494261668},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","measure":1,"beat":3,"fraction":0.0022953328232597414},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","measure":1,"beat":3,"fraction":0.756},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","measure":1,"beat":3,"fraction":0.510328997704667},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","measure":1,"beat":3,"fraction":0.265493496557001}]}`,
    };
    document
        .getElementById("presets-select")
        .addEventListener("change", (event) => {
            const songPreset = event.currentTarget.value;
            if (songPreset !== "") {
                buildSongFromSongCode(presetSongs[songPreset]);
            }
            // remove focus so not to interfere with key commands
            document.activeElement.blur();
            // elapsed = 0;
            if (isPlaying) startPlaying();
        });

    document.getElementById("lightshow").addEventListener("change", (event) => {
        lightFrequency = parseInt(event.currentTarget.value);
    });

    const buildLibraryPulldown = () => {
        const libSelector = document.getElementById("library-select");
        const libs = document.querySelectorAll("section.sample-library");
        libs.forEach((lib) => {
            // create option in libSelector
            libSelector.options[libSelector.options.length] = new Option(
                lib.dataset.lib,
                lib.dataset.lib
            );
        });
    };

    const buildPresetPulldown = () => {
        const presetSelector = document.getElementById("presets-select");
        const presetKeys = Object.keys(presetSongs);
        for (const key of presetKeys) {
            // create option in libSelector
            presetSelector.options[presetSelector.options.length] = new Option(
                key,
                key
            );
        }
    };

    // Sample Library Pulldown
    document
        .getElementById("library-select")
        .addEventListener("change", (event) => {
            // console.log("library select. change");
            loadSamplesLibrary(event.currentTarget.value);
            document.activeElement.blur();
        });

    buildPresetPulldown();
    buildLibraryPulldown();
    setAudioIds();
    loadSamplesLibrary("standard");
    buildTrack();
    buildSampleSelector();
})();

/*

            888888888888                             88
                 88                           ,d     ""
                 88                           88
                 88   ,adPPYba,  ,adPPYba,  MM88MMM  88  8b,dPPYba,    ,adPPYb,d8
                 88  a8P_____88  I8[    ""    88     88  88P'   `"8a  a8"    `Y88
                 88  8PP"""""""   `"Y8ba,     88     88  88       88  8b       88
                 88  "8b,   ,aa  aa    ]8I    88,    88  88       88  "8a,   ,d88
                 88   `"Ybbd8"'  `"YbbdP"'    "Y888  88  88       88   `"YbbdP"Y8
                                                                       aa,    ,88
                                                                        "Y8bbdP"


            */

// TESTING V

const light = document.getElementById("beat-light");
window.addEventListener("keydown", (event) => {
    if (event.code === "KeyT") {
        // 'T' (testing)
        if (!keysDown.includes(84)) {
            keysDown.push(84);
            light.classList.add("on");
        }
    }
});
window.addEventListener("keyup", (event) => {
    if (event.code === "KeyT" && keysDown.includes("KeyT")) {
        // 'T'
        keysDown.splice(keysDown.indexOf("KeyT"), 1);
    }
});
light.addEventListener("transitionend", (event) => {
    if (event.propertyName === "box-shadow") {
        // console.log(
        //     "light transitionend - ison: ",
        //     event.target.classList.contains("on")
        // );
        if (
            event.target.classList.contains("on") &&
            event.elapsedTime >= 0.02
        ) {
            console.log("!!!!! - ", event.elapsedTime);
            console.log(event);
        }
        // console.log(event);
    }
});
light.addEventListener("transitionstart", (event) => {
    if (event.propertyName === "box-shadow") {
        if (event.elapsedTime >= 0.02) {
            console.log(
                "light transitionstart - ison: ",
                event.target.classList.contains("on")
            );

            console.log("!!!!! - ", event.elapsedTime);
        }
        // console.log(event);
    }
});

// window.addEventListener("keyup", (event) => {
//     if (event.keyCode === 84) {
//         // 'T'
//         const light = document.getElementById("beat-light");
//         light.setAttribute("data-on", "false");
//     }
// });
// const Tkey = document.getElementById("beat-light");
// // document.querySelector(`.key[data-key="${74}"]`);
// Tkey.addEventListener("transitionend", (event) => {
//     console.log("transition end", event.target);
// });
// Tkey.addEventListener("transitionstart", (event) => {
//     console.log("transition start", event.target);
//     console.log('prop: ',event.propertyName);
// });
// const light = document.getElementById("quantize-light");
// light.classList.add("on");
// light.classList.add("on");
// light.classList.add("on");
