// import {song} from "./module-song.js";
// song.hello();

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

 - add volume control

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

d888888b d8b   db d888888b d888888b   db    db  .d8b.  d8888b. d888888b  .d8b.  d8888b. db      d88888b .d8888. 
  `88'   888o  88   `88'   `~~88~~'   88    88 d8' `8b 88  `8D   `88'   d8' `8b 88  `8D 88      88'     88'  YP 
   88    88V8o 88    88       88      Y8    8P 88ooo88 88oobY'    88    88ooo88 88oooY' 88      88ooooo `8bo.   
   88    88 V8o88    88       88      `8b  d8' 88~~~88 88`8b      88    88~~~88 88~~~b. 88      88~~~~~   `Y8b. 
  .88.   88  V888   .88.      88       `8bd8'  88   88 88 `88.   .88.   88   88 88   8D 88booo. 88.     db   8D 
Y888888P VP   V8P Y888888P    YP         YP    YP   YP 88   YD Y888888P YP   YP Y8888P' Y88888P Y88888P `8888Y' 
                                                                                                                
                                                                                                                

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
    // const msPerFrame = 1000 / 60;
    const targetMSperFrame = 1000 / 60;
    let bpm = 120;
    let msPerBeat = 60000 / bpm;
    let msPer8th = msPerBeat * 0.5;
    let msPer16th = msPer8th * 0.5;
    let startTime = -1;
    let elapsed;
    let measures = 2;
    let isPlaying = false;
    let currentMeasure = 0;
    let currentBeat = 0;
    let current8th = 0;
    let current16th = 0;
    // let currentMS = 0;

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
    let quantizePrecision = 4;
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
            console.log("playSampleCopy()");
            const newSample = dupeSample(audioEl);
            const tempListener = (e) => {
                e.target.play();
                // console.log("tempListener", tempListener);
                e.target.removeEventListener("canplaythrough", tempListener);
            };
            newSample.addEventListener("canplaythrough", tempListener);
        }
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

    const getKeyFromSample = (audioEl) => {
        return document.querySelector(`.key[data-id="${audioEl.dataset.id}"]`);
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
        return note.fraction * track.duration;
    };

    const removeDuplicateNotes = (note) => {
        const noteMS = getNoteMS(note);
        // If note of same sample already in song less than minMSdiff away,
        // remove it and add this one.
        const minMSdiff = 10;
        const dupes = findSampleInSong(note.audio);
        for (const dupe of dupes) {
            const msDiff = Math.abs(noteMS - getNoteMS(dupe));

            if (msDiff < minMSdiff) {
                // remove dupe
                removeNoteFromSong(dupe);
            }
        }
    };

    const programNote = (audio, ms) => {
        // Create a note object and add it to song array
        // Also create quantized note and add it to songQuantized

        let beatIcon = null;
        if (audio.id != "tick") {
            beatIcon = makeBeatIcon();
        }
        // if (!song[measure]) song[measure] = [];
        // if (!song[measure][beat]) song[measure][beat] = [];
        const note = {
            audio,
            beatIcon,
            ms,
            fraction: ms / track.duration,
        };
        beatIcon.note = note;
        removeDuplicateNotes(note);

        // Add note to song
        song.push(note);
        const qNote = quantizeNote(note);
        addNoteToSongQuantized(qNote);

        // beatIcon.qNote = qNote;

        positionBeatIcon(note);

        return note;
    };

    const getNotesMSdifference = (note1, note2) => {
        const totalMS1 = track.duration + getNoteMS(note1);
        const totalMS2 = track.duration + getNoteMS(note2);
        return Math.abs(totalMS1 - totalMS2);
    };

    const checkSampleInSong = (audioEl) => {
        for (const note of song) {
            if (note.audio === audioEl) {
                return true;
            }
        }

        return false;
    };

    const findSampleInSong = (audioEl) => {
        // console.log('\r\nfindSampleInSong()',audioEl);
        // returns array of notes
        const matchingNotes = [];
        // console.log('song',song);
        for (const note of song) {
            if (note.audio === audioEl) {
                matchingNotes.push(note);
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
        let noteIndex = song.indexOf(note);

        // remove regular note
        if (noteIndex !== -1) {
            console.log("remove note");
            song.splice(noteIndex, 1);
        }

        // quantized note
        const qNote = icon.qNote;
        if (qNote) {
            noteIndex = songQuantized.indexOf(qNote);
            songQuantized.splice(noteIndex, 1);
        }

        icon.remove();
        checkTurnOnCopyButton();
    };

    const getAllNotesInSong = () => {
        return [...song];

        const notes = [];
        const song = quantized ? songQuantized : song;
        for (const group of song) {
            if (group) {
                for (const note of group) {
                    notes.push(note);
                }
            }
        }
        return notes;
    };

    // const getNoteList = (measure, beat) => {
    //     // console.log("getNoteList: ", measure, beat);
    //     // console.log("song: ", song);
    //     const songAr = quantizeOn ? songQuantized : song;
    //     if (!songAr[measure]) return [];
    //     if (!songAr[measure][beat]) return [];
    //     // console.log(songAr[measure][beat].length)r
    //     return songAr[measure][beat];
    // };

    // const getNextBeat = (measureNum, beatNum) => {
    //     // console.log("getNextBeat()");
    //     const newBeat = (measureNum * 4 + beatNum + 1) % (measures * 4);
    //     const nextMeasure = Math.floor(newBeat / 4);
    //     const nextBeat = newBeat - nextMeasure * 4;
    //     // console.log("from", measureNum, beatNum);
    //     // console.log("to: ", nextMeasure, nextBeat);
    //     return {
    //         measure: nextMeasure,
    //         beat: nextBeat,
    //     };
    // };

    const addNoteToSongQuantized = (note) => {
        songQuantized.push(note);
    };

    const quantizeNote = (note) => {
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
        const quantizedNote = {
            audio: note.audio,
            beatIcon: note.beatIcon,
            ms: beatNum * msFrequency,
            fraction: beatNum * (msFrequency / track.duration),
        };
        note.beatIcon.qNote = quantizedNote;
        // console.log("quantized note: ", quantizedNote);
        return quantizedNote;
    };

    const quantizeTrack = () => {
        console.log("quantizeTrack()");
        console.log("quantizePrecision", quantizePrecision);
        // re-quantize the track
        songQuantized.length = 0;
        for (const note of song) {
            const quantizedNote = quantizeNote(note);
            addNoteToSongQuantized(quantizedNote);
            // note.beatIcon.qNote = quantizedNote;
        }
        if (quantizeOn) positionBeatIcons();
    };

    const clearTrack = (clearAll = false) => {
        clearLight.classList.add("on");

        let selectedIcons;
        // clear selected beat icons
        if (clearAll) {
            selectedIcons = selectAllIcons();
        } else {
            selectedIcons = getSelectedIcons();
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
        copySelectedNotesToClipboard();
        for (const icon of selectedIcons) {
            // find its note in the song
            removeNoteFromSong(icon.note);
        }
    };

    const buildSongFromSongCode = (songJson) => {
        console.log("songJson", songJson);
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
            // console.log(note);
            const audio = document.querySelector(
                `audio[src="${note.audioSrc}"]`
            );
            // assumes we have one or the other
            if (!note.fraction && note.ms) {
                note.fraction = note.ms / track.duration;
            } 
            if (!note.ms && note.fraction){
                note.ms = note.fraction * track.duration;
            }
            console.log("note.fraction", note.fraction);
            const fraction = note.fraction;
            console.log("note.ms", note.ms);
            programNote(audio, note.ms);
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

    // -------------------------------
    // Track Settings
    // -------------------------------

    const setTempo = (value) => {
        bpm = value;
        msPerBeat = 60000 / bpm;
        msPer8th = msPerBeat * 0.5;
        msPer16th = msPer8th * 0.5;
        track.duration = msPerBeat * 4 * measures;
        drawTrack();
        positionBeatIcons();
        positionPlayheadByElapsed();
    };

    const setMeasures = (value) => {
        const ratio = measures / value;
        recalculateNotesFractions(ratio);
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
        if (isPlaying) return;
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

    const checkAndPlayNotes = (f0, f1) => {
        // While track is playing
        const songAr = quantizeOn ? songQuantized : song;
        // Return true if 'note' is played, false if not
        let foundNote = false;
        songAr.forEach((note) => {
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
                if (!isRecording && note.beatIcon) {
                    if (!note.beatIcon.classList.contains("selected")) {
                        note.beatIcon.classList.add("on");
                    }
                }
                foundNote = true;
            }
        });
        return foundNote;
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
        const measure = Math.floor(currentBeat / 4);
        document.getElementById("counter").innerHTML = `measure ${measure}
                            beat ${currentBeat % 4}
                            ms ${Math.round(elapsed % msPerBeat)
                                .toString()
                                .padStart(4, "0")}
                             &nbsp;fps ${currentFPS}`;
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

    const copySelectedNotesToClipboard = () => {
        console.log("copySelectedNotesToClipboard()");
        // Copy selected Notes
        let selectedIcons = getSelectedIcons();
        console.log("selectedIcons.length", selectedIcons.length);
        if (selectedIcons.length === 0) {
            // None selected, copy them all
            selectedIcons = getAllIcons();
        }
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

    const MSINSTEADOFFRACTIONpasteNotesFromClipboard = () => {
        // Paste notes from clipboard

        // sort left to right
        track.clipboardNotes.sort((A, B) => {
            return A.ms - B.ms;
        });

        const leftmostNote = track.clipboardNotes[0];
        const leftmostTotalMS = leftmostNote.ms;
        const playheadMS = getElapsedFromPlayheadPosition();

        for (const note of track.clipboardNotes) {
            const relativeMS = note.ms - leftmostTotalMS;

            const noteMS = (playheadMS + relativeMS) % track.duration;

            programNote(note.audio, noteMS);
        }
        track.deselectBeatIcons();
    };

    const pasteNotesFromClipboard = () => {
        // Paste notes from clipboard

        // sort left to right
        track.clipboardNotes.sort((A, B) => {
            return A.fraction - B.fraction;
        });
// console.log(track.clipboardNotes)
        const leftmostNote = track.clipboardNotes[0];
        const leftmostTotalFraction = leftmostNote.fraction;
        const playheadFraction = getPlayheadX() / track.trackWidth;

        for (const note of track.clipboardNotes) {
            const relativeFraction = note.fraction - leftmostTotalFraction;

            const noteFraction = (playheadFraction + relativeFraction) % 1;
            const noteMS = noteFraction * track.duration;

            programNote(note.audio, noteMS);
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
        // if (!(audio.currentTime === 0 || audio.ended)) {
        //     // console.log("overlap");
        //     playSampleCopy(audio);
        // } else {
            audio.currentTime = 0;
            audio.play();
        // }
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
                programNote(audio, elapsed);
            }

            // play note
            if (!isRecording) {
                // if recording, the note will get played by playhead movement
                playSound(audio);
                key.classList.add("playing");
            }
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

        // x position
        const x = track.trackWidth * note.fraction;
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
        for (const note of songAr) {
            positionBeatIcon(note);
        }
    };

    const selectAllIcons = () => {
        return Array.from(beatIcons.querySelectorAll(".beat-icon"));
    };

    const getSelectedIcons = () => {
        return Array.from(beatIcons.querySelectorAll(".beat-icon.selected"));
    };

    const getAllIcons = () => {
        return Array.from(beatIcons.querySelectorAll(".beat-icon"));
    };

    const getNoteFromBeatIcon = (beatIcon) => {
        // or we can just set beatIcon.note when we create an icon
        for (const note of song) {
            if (note.beatIcon === beatIcon) {
                return note;
            }
        }
    };
    const getQuantizedNoteFromBeatIcon = (beatIcon) => {
        // or we can just set beatIcon.note when we create an icon
        for (const note of songQuantized) {
            if (note.beatIcon === beatIcon) {
                return note;
            }
        }
    };

    const positionNoteFromIcon = (beatIcon) => {
        // console.log("positionNoteFromIcon()");
        // console.log(beatIcon);
        const note = beatIcon.note;

        const pctPos = beatIcon.offsetLeft / track.trackWidth;
        const elapsed = pctPos * track.duration;

        // remove note from current place in song
        removeNoteFromSong(note);
        programNote(note.audio, elapsed);
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
    let frameCount = 0;
    let msCount = 0;
    let lastNow = Date.now();
    let shortestStepTime = 1000;
    let currentFPS = 60;
    let tempoLag = 0;
    let greatestOff = 0;
    let lastBeatMS = 0;
    function step(timestamp) {
        if (startTime === -1) {
            lastStamp = startTime = timestamp;
            setElapsedFromPlayheadPosition();
            //
            frameCount = 0;
            msCount = 0;
            lastNow = Date.now();
            shortestStepTime = 1000;
            console.log("\nSTARTING\n");
        }
        let stepTime = timestamp - lastStamp;
        lastStamp = timestamp;
        // if (frameCount === 0) {
        //     stepTime = targetMSperFrame;
        // }
        // if (stepTime < 10) {
        //     console.log("stepTime", Math.round(stepTime));
        //     console.log("frameCount", frameCount);
        //     console.log("timestamp", timestamp);
        // }
        // shortestStepTime = Math.min(shortestStepTime, stepTime);
        msCount += stepTime;
        frameCount++;
        if (msCount >= 1000) {
            // console.log("\nFPS", frameCount);
            // console.log("stepTime", Math.round(stepTime));
            // console.log("avg stepTime", Math.round(msCount / frameCount));
            currentFPS = frameCount;
            frameCount = msCount = 0;
            // const now = Date.now();
            // console.log("since last now", now - lastNow);
            // lastNow = now;
            // console.log("shortest step", Math.round(shortestStepTime));
            // shortestStepTime = 1000;
            // console.log(timestamp);
        }
        // const frameDiff = Math.abs(stepTime - targetMSperFrame);
        // if (frameDiff > 17) {
        //     // greatestOff = Math.max(frameDiff, greatestOff);
        //     // console.log("\n\rgreatestOff", greatestOff);
        //     // console.log("targetMSperFrame", Math.round(targetMSperFrame));
        //     console.log("\nstepTime", Math.round(stepTime));
        //     // console.log("frameDiff", Math.round(frameDiff));
        //     tempoLag++;
        //     console.log("tempoLag: ", tempoLag, "times");
        // }
        let restartingTrack = false;
        const lastMS = elapsed;
        const lastFraction = lastMS / track.duration;
        elapsed += stepTime;
        const currentFraction = (elapsed / track.duration) % 1;

        // check for new beat
        let playedNote = false;
        lastBeat = currentBeat;
        currentBeat = Math.floor(elapsed / msPerBeat);

        // check for 1/4 note
        if (currentBeat != lastBeat || elapsed === 0) {
            // On New Beat!

            if (isRecording) {
                playSound(document.getElementById("tick"));
            } else if (lightFrequency > 0) {
                randomBackgroundColor();
            }
            showBeat();

            // have we played through the track and started over?
            if (elapsed > track.duration) {
                // looping to beginning of track
                restartingTrack = true;
                elapsed -= track.duration;
                // console.log('\nrestarting track, elapsed:',elapsed,'\n')
                // startTime = timestamp - elapsed;
                currentBeat = 0;
            }
        } else {
            // in same 1/4 note as last time
            // check for 8th note
            last8th = current8th;
            current8th = Math.floor(elapsed / msPer8th);
            if (!isRecording && last8th !== current8th) {
                if (lightFrequency === 8 || lightFrequency === 16) {
                    randomBackgroundColor();
                }

                // if (elapsed > lastBeatMS) {
                //     const beatDuration = elapsed - lastBeatMS;
                //     console.log("beatMS: ", Math.round(beatDuration), "MS");
                // }
                // lastBeatMS = elapsed;
            } else {
                // check for 16th note
                last16th = current16th;
                current16th = Math.floor(elapsed / msPer16th);

                if (!isRecording && last16th !== current16th) {
                    if (lightFrequency === 16) {
                        randomBackgroundColor();
                    }
                }
            }
        }
        if (restartingTrack) {
            // console.log("RNRESTARTING TRACK");
            // // end of last loop
            // // start of this loop
            // console.log("lastMS", lastMS);
            // console.log("track.duration", track.duration);
            // console.log("elapsed", elapsed);
            const playedNote1 = checkAndPlayNotes(lastFraction, 1);
            const playedNote2 = checkAndPlayNotes(0, currentFraction);
            playedNote = playedNote1 || playedNote2;
        } else {
            // haven't played through track
            playedNote = checkAndPlayNotes(lastFraction, currentFraction);
        }
        if (playedNote && !isRecording && lightFrequency === 0) {
            randomBackgroundColor();
        }

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

    document.getElementById('edit-light').addEventListener('pointerdown', event => {
        // toggle edit
        toggleEdit();
    })
    document.getElementById('quantize-light').addEventListener('pointerdown', event => {
        // toggle quantize
        toggleQuantize();
    })
    document.getElementById('rec-light').addEventListener('pointerdown', event => {
        // toggle recording
        toggleRecording();
    })
    document.getElementById('clear-light').addEventListener('pointerdown', event => {
        // clear notes
        clearTrack();
    })

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
        console.log(event.code);
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
        } else if (event.code === "KeyC" && !event.metaKey) {
            // Copy selected notes
            copySelectedNotesToClipboard();
        } else if (event.code === "KeyV" && !event.metaKey) {
            // Paste notes from clipboard into track
            pasteNotesFromClipboard();
        } else if (event.code === "Digit0" || event.code === "Numpad0") {
            setPlayheadPosition(0);
            setElapsedFromPlayheadPosition();
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
        if (getSelectedIcons().length === 0) {
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
        const pctPos = getPlayheadX() / track.trackWidth;
        return pctPos * track.duration;
    };

    const setElapsedFromPlayheadPosition = () => {
        elapsed = getElapsedFromPlayheadPosition();
        updateCounter();
    };

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
            setElapsedFromPlayheadPosition();
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
            setElapsedFromPlayheadPosition();
            // console.log(playheadX + "px");
        } else if (draggingIcons) {
            // Drag Icons
            const newIconDragX = getXinTrack(event);
            const dragDistX = event.movementX; //newIconDragX - lastIconDragX; //
            const selectedIcons = getSelectedIcons();
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
            const selectedIcons = getSelectedIcons();
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

    const writeSongCodeToClipboard = () => {
        // copy JSON to clipboard
        // create array of notes - measure, beat, fraction, and relative audio src path
        const notes = [];
        for (const note of song) {
            notes.push({
                audioSrc: note.audio.getAttribute("src"),
                fraction: note.fraction,
            });
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
    };

    document
        .getElementById("get-code-button")
        .addEventListener("pointerdown", (event) => {
            writeSongCodeToClipboard();
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
        "beat-1": `{"bpm":120,"measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","ms":14.571948998178506},{"audioSrc":"./sounds/tink.wav","ms":10.92896174863388},{"audioSrc":"./sounds/clap.wav","ms":510.0182149362478},{"audioSrc":"./sounds/kick.wav","ms":757.7413479052824},{"audioSrc":"./sounds/snare.wav","ms":502.73224043715845},{"audioSrc":"./sounds/kick.wav","ms":1264.1165755919853},{"audioSrc":"./sounds/tink.wav","ms":1001.8214936247722},{"audioSrc":"./sounds/snare.wav","ms":1384.335154826958},{"audioSrc":"./sounds/clap.wav","ms":1508.1967213114754},{"audioSrc":"./sounds/kick.wav","ms":1755.9198542805102},{"audioSrc":"./sounds/tink.wav","ms":1500.9107468123862},{"audioSrc":"./sounds/snare.wav","ms":1504.5537340619308},{"audioSrc":"./sounds/kick.wav","ms":2003.6429872495444},{"audioSrc":"./sounds/clap.wav","ms":2499.0892531876134},{"audioSrc":"./sounds/cowbell.wav","ms":2019},{"audioSrc":"./sounds/hihat.wav","ms":2258.6520947176687},{"audioSrc":"./sounds/kick.wav","ms":2746.8123861566482},{"audioSrc":"./sounds/snare.wav","ms":2506.375227686703},{"audioSrc":"./sounds/tink.wav","ms":2517.304189435337},{"audioSrc":"./sounds/cowbell_muted.wav","ms":2514.088114754098},{"audioSrc":"./sounds/hihat.wav","ms":2739.5264116575595},{"audioSrc":"./sounds/kick.wav","ms":3253.1876138433513},{"audioSrc":"./sounds/clap.wav","ms":3497.267759562841},{"audioSrc":"./sounds/snare.wav","ms":3387.978142076503},{"audioSrc":"./sounds/tink.wav","ms":3016.3934426229507},{"audioSrc":"./sounds/cowbell.wav","ms":3036},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3260.4735883424405},{"audioSrc":"./sounds/kick.wav","ms":3744.990892531876},{"audioSrc":"./sounds/tink.wav","ms":3508},{"audioSrc":"./sounds/snare.wav","ms":3505},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3724},{"audioSrc":"./sounds/hihat.wav","ms":3752.2768670309656},{"audioSrc":"./sounds/tink.wav","ms":4007.2859744990888},{"audioSrc":"./sounds/kick.wav","ms":4010.9289617486334},{"audioSrc":"./sounds/snare.wav","ms":4499.089253187613},{"audioSrc":"./sounds/clap.wav","ms":4506.375227686703},{"audioSrc":"./sounds/kick.wav","ms":4754.098360655737},{"audioSrc":"./sounds/tink.wav","ms":4998.178506375227},{"audioSrc":"./sounds/kick.wav","ms":5260.47358834244},{"audioSrc":"./sounds/snare.wav","ms":5380.692167577413},{"audioSrc":"./sounds/tink.wav","ms":5497.267759562841},{"audioSrc":"./sounds/snare.wav","ms":5500.910746812386},{"audioSrc":"./sounds/clap.wav","ms":5504.55373406193},{"audioSrc":"./sounds/kick.wav","ms":5752.276867030965},{"audioSrc":"./sounds/kick.wav","ms":5999.999999999999},{"audioSrc":"./sounds/cowbell.wav","ms":6015.357012750455},{"audioSrc":"./sounds/clap.wav","ms":6495.446265938068},{"audioSrc":"./sounds/snare.wav","ms":6264.145036429873},{"audioSrc":"./sounds/snare.wav","ms":6502.732240437158},{"audioSrc":"./sounds/cowbell_muted.wav","ms":6510.445127504553},{"audioSrc":"./sounds/tink.wav","ms":6513.661202185792},{"audioSrc":"./sounds/kick.wav","ms":6743.169398907103},{"audioSrc":"./sounds/snare.wav","ms":6624.078624078625},{"audioSrc":"./sounds/snare.wav","ms":6755.118755118756},{"audioSrc":"./sounds/tink.wav","ms":7012.750455373405},{"audioSrc":"./sounds/kick.wav","ms":7249.544626593806},{"audioSrc":"./sounds/cowbell_muted.wav","ms":7256.830601092895},{"audioSrc":"./sounds/snare.wav","ms":7384.335154826958},{"audioSrc":"./sounds/clap.wav","ms":7493.6247723132965},{"audioSrc":"./sounds/cowbell.wav","ms":7012.408925318762},{"audioSrc":"./sounds/snare.wav","ms":7501.357012750455},{"audioSrc":"./sounds/tink.wav","ms":7504.357012750455},{"audioSrc":"./sounds/kick.wav","ms":7741.347905282331},{"audioSrc":"./sounds/hihat.wav","ms":7504.553734061931},{"audioSrc":"./sounds/openhat.wav","ms":7750.341530054645},{"audioSrc":"./sounds/snare.wav","ms":7762.721994535519},{"audioSrc":"./sounds/cowbell_muted.wav","ms":7753.0712530712535},{"audioSrc":"./sounds/ride.wav","ms":7993.447993447994}]}`,

        "beat-2": `{"bpm":"83","measures":"2","notes":[{"audioSrc":"./sounds/kick.wav","ms":13.167423793534795},{"audioSrc":"./sounds/boom.wav","ms":15.800908552241753},{"audioSrc":"./sounds/tink.wav","ms":376.58832049509505},{"audioSrc":"./sounds/openhat.wav","ms":11.89182961353611},{"audioSrc":"./sounds/tom.wav","ms":545.1313450523404},{"audioSrc":"./sounds/cowbell.wav","ms":18.948745802883664},{"audioSrc":"./sounds/ride.wav","ms":18.948745802883664},{"audioSrc":"./sounds/openhat.wav","ms":34},{"audioSrc":"./sounds/cowbell_muted.wav","ms":10.533939034827835},{"audioSrc":"./sounds/kick.wav","ms":1258.8057146619262},{"audioSrc":"./sounds/cowbell_muted.wav","ms":1086.1478701692013},{"audioSrc":"./sounds/clap.wav","ms":722.8915662650602},{"audioSrc":"./sounds/snare.wav","ms":737.3757324379485},{"audioSrc":"./sounds/tink.wav","ms":740.0092171966554},{"audioSrc":"./sounds/kick.wav","ms":1806.5705444729738},{"audioSrc":"./sounds/boom.wav","ms":1817.1044835078014},{"audioSrc":"./sounds/cowbell_muted.wav","ms":1807.2494897623278},{"audioSrc":"./sounds/tom.wav","ms":1632.7605503983145},{"audioSrc":"./sounds/snare.wav","ms":2180.5253802093616},{"audioSrc":"./sounds/kick.wav","ms":2525.5118835999733},{"audioSrc":"./sounds/hihat.wav","ms":2352.977483705313},{"audioSrc":"./sounds/clap.wav","ms":2174.0361445783133},{"audioSrc":"./sounds/boom.wav","ms":2716.562973204292},{"audioSrc":"./sounds/hihat.wav","ms":2701.95536243334},{"audioSrc":"./sounds/cowbell_muted.wav","ms":2354.1502073869246},{"audioSrc":"./sounds/openhat.wav","ms":2902.100204095069},{"audioSrc":"./sounds/kick.wav","ms":2903.3757982750676},{"audioSrc":"./sounds/boom.wav","ms":2906.0092830337744},{"audioSrc":"./sounds/cowbell.wav","ms":2915.2083744815327},{"audioSrc":"./sounds/tink.wav","ms":3266.796694976628},{"audioSrc":"./sounds/tom.wav","ms":3435.339719533873},{"audioSrc":"./sounds/cowbell.wav","ms":3599.2083744815327},{"audioSrc":"./sounds/clap.wav","ms":3613.099940746593},{"audioSrc":"./sounds/snare.wav","ms":3627.584106919481},{"audioSrc":"./sounds/tink.wav","ms":3630.217591678188},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3976.356244650734},{"audioSrc":"./sounds/kick.wav","ms":4149.0140891434585},{"audioSrc":"./sounds/cowbell.wav","ms":4322.824083218118},{"audioSrc":"./sounds/tom.wav","ms":4522.968924879848},{"audioSrc":"./sounds/kick.wav","ms":4696.7789189545065},{"audioSrc":"./sounds/cowbell_muted.wav","ms":4697.457864243861},{"audioSrc":"./sounds/boom.wav","ms":4707.312857989335},{"audioSrc":"./sounds/cowbell.wav","ms":5033.991507011653},{"audioSrc":"./sounds/clap.wav","ms":5064.244519059846},{"audioSrc":"./sounds/snare.wav","ms":5070.733754690895},{"audioSrc":"./sounds/hihat.wav","ms":5243.1858581868455},{"audioSrc":"./sounds/cowbell_muted.wav","ms":5244.358581868458},{"audioSrc":"./sounds/kick.wav","ms":5415.7202580815065},{"audioSrc":"./sounds/hihat.wav","ms":5592.163736914872},{"audioSrc":"./sounds/boom.wav","ms":5606.771347685824}]}`,

        "beat-3": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/kick.wav","ms":13.179571663920923},{"audioSrc":"./sounds/tink.wav","ms":286},{"audioSrc":"./sounds/hihat.wav","ms":253},{"audioSrc":"./sounds/hihat.wav","ms":23.064250411861615},{"audioSrc":"./sounds/kick.wav","ms":771.004942339374},{"audioSrc":"./sounds/snare.wav","ms":542},{"audioSrc":"./sounds/tink.wav","ms":770},{"audioSrc":"./sounds/tom.wav","ms":637.7162273476113},{"audioSrc":"./sounds/tom.wav","ms":760.4638591433278},{"audioSrc":"./sounds/tom.wav","ms":509.3827224052718},{"audioSrc":"./sounds/clap.wav","ms":1021.4168039538715},{"audioSrc":"./sounds/tink.wav","ms":1270},{"audioSrc":"./sounds/hihat.wav","ms":1258.6490939044481},{"audioSrc":"./sounds/boom.wav","ms":1040},{"audioSrc":"./sounds/kick.wav","ms":1766.0626029654036},{"audioSrc":"./sounds/snare.wav","ms":1532.1252059308072},{"audioSrc":"./sounds/tink.wav","ms":1787},{"audioSrc":"./sounds/hihat.wav","ms":1509.0609555189455},{"audioSrc":"./sounds/kick.wav","ms":2260.296540362438},{"audioSrc":"./sounds/tink.wav","ms":2009.8846787479406},{"audioSrc":"./sounds/cowbell.wav","ms":2016.4744645799012},{"audioSrc":"./sounds/cowbell.wav","ms":2490.939044481054},{"audioSrc":"./sounds/hihat.wav","ms":2007.503603789127},{"audioSrc":"./sounds/hihat.wav","ms":2253.0632207578255},{"audioSrc":"./sounds/kick.wav","ms":2517.2981878088963},{"audioSrc":"./sounds/snare.wav","ms":2754.530477759473},{"audioSrc":"./sounds/tink.wav","ms":2767.710049423394},{"audioSrc":"./sounds/tink.wav","ms":2503.783978583196},{"audioSrc":"./sounds/tom.wav","ms":2642.504118616145},{"audioSrc":"./sounds/tom.wav","ms":2751.2355848434927},{"audioSrc":"./sounds/clap.wav","ms":3008.2372322899505},{"audioSrc":"./sounds/tink.wav","ms":3252.0593080724875},{"audioSrc":"./sounds/cowbell.wav","ms":3004.9423393739703},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3249.626750411862},{"audioSrc":"./sounds/hihat.wav","ms":3256.229406919275},{"audioSrc":"./sounds/boom.wav","ms":3011.5321252059307},{"audioSrc":"./sounds/openhat.wav","ms":3245.469522240527},{"audioSrc":"./sounds/ride.wav","ms":3001.64744645799},{"audioSrc":"./sounds/kick.wav","ms":3502.4711696869854},{"audioSrc":"./sounds/snare.wav","ms":3515.6507413509057},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3748.455518945634},{"audioSrc":"./sounds/hihat.wav","ms":3755.6373558484347}]}`,

        "beat-6": `{"bpm":120,"measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","ms":19.71830985915493},{"audioSrc":"./sounds/clap.wav","ms":504.22535211267603},{"audioSrc":"./sounds/kick.wav","ms":1247.8873239436618},{"audioSrc":"./sounds/clap.wav","ms":1504.225352112676},{"audioSrc":"./sounds/kick.wav","ms":2005.6338028169014},{"audioSrc":"./sounds/clap.wav","ms":2490.1408450704225},{"audioSrc":"./sounds/kick.wav","ms":2754.9295774647885},{"audioSrc":"./sounds/kick.wav","ms":3233.8028169014083},{"audioSrc":"./sounds/clap.wav","ms":3490.1408450704225},{"audioSrc":"./sounds/kick.wav","ms":3753.0072173215717},{"audioSrc":"./sounds/kick.wav","ms":4005.6338028169016},{"audioSrc":"./sounds/clap.wav","ms":4490.140845070423},{"audioSrc":"./sounds/kick.wav","ms":5233.802816901409},{"audioSrc":"./sounds/clap.wav","ms":5490.140845070423},{"audioSrc":"./sounds/kick.wav","ms":6005.633802816901},{"audioSrc":"./sounds/kick.wav","ms":6761.828388131516},{"audioSrc":"./sounds/clap.wav","ms":7008.450704225353},{"audioSrc":"./sounds/clap.wav","ms":7256.338028169014},{"audioSrc":"./sounds/clap.wav","ms":7509.859154929577},{"audioSrc":"./sounds/clap.wav","ms":7752.112676056338},{"audioSrc":"./sounds/clap.wav","ms":7639.43661971831},{"audioSrc":"./sounds/ride.wav","ms":7545}]}`,

        "beat-box-2": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":379.4950267788829},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","ms":137.71996939556234},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":3.06044376434583},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":257.0772762050497},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":504.973221117062},{"audioSrc":"./sounds/beatbox/beatbox_BackwardsSnare.wav","ms":749.8087222647284},{"audioSrc":"./sounds/beatbox/beatboxKickHic.wav","ms":1003.8255547054322},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":1499.6174445294569},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":2384.0856924254017},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":2004.5906656465186},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":2258.6074980872227},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","ms":2123.947972456006},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":2506.503442999235},{"audioSrc":"./sounds/beatbox/beatbox_BackwardsSnare.wav","ms":2754.399387911247},{"audioSrc":"./sounds/beatbox/beatboxKickHic.wav","ms":3002.2953328232593},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3387.911247130834},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":3501.14766641163},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3878},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3755.1644988523335},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3632.7467482785005}]}`,
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

    document
        .getElementById("quantize-frequency")
        .addEventListener("change", (event) => {
            quantizePrecision = parseInt(event.currentTarget.value);
            quantizeTrack();
            document.activeElement.blur();
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
const keysDown = [];

const light = document.getElementById("beat-light");
window.addEventListener("keydown", (event) => {
    if (event.code === "KeyT") {
        // 'T' (testing)
        if (!keysDown.includes("KeyT")) {
            keysDown.push("KeyT");
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
