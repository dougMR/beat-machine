import { SamplesManager } from "./module-samples.js";
import { SongManager } from "./module-song.js";

track.clipboardNotes = [];
// import {song} from "./module-song.js";
// song.sayHello();
// import { someVar, setSomeVar } from "./module-song.js";

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

 - create volume setter

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
    const targetMSperFrame = 1000 / fps;

    let currentMeasure = 0;
    let currentBeat = 0;
    let current8th = 0;
    let current16th = 0;

    let startTime = -1;
    let elapsed;

    // let currentMS = 0;

    let quantizeOn = false;
    let isRecording = false;
    let scrubbing = false;
    let draggingIcons = false;
    let lastIconDragX;
    let draggingPlayhead = false;
    let isEditing = false;
    let lightFrequency = -1;
    let quantizePrecision = 4;

    // -1 = none, 0 = 1/4 and all notes, 4 = 1/4, 8 = 1/8, 16 = 1/16

    const playheadEl = document.getElementById("playhead");
    const trackEl = document.getElementById("track");

    // track.marquis = trackEl.querySelector("#marquis");
    // track.clipboardNotes = [];
    const beatIcons = document.getElementById("beat-icons");
    const tempoSlider = document.getElementById("tempo-slider");
    const measureSlider = document.getElementById("measures-slider");

    const beatLight = document.getElementById("beat-light");
    const clearLight = document.getElementById("clear-light");
    const recLight = document.getElementById("rec-light");

    const keysDown = [];

    // -------------------------------
    //
    //  STEPPING STONE FUNCITONS
    //
    // -------------------------------
    const setTempo = (bpm) => {
        console.log("setTempo()", bpm);
        // console.log('SM.getBpm():',SongManager.getBpm());
        SongManager.setTempo(bpm);
        // console.log('SM.getBpm():',SongManager.getBpm());
        positionBeatIcons();
        positionPlayheadByElapsed();
    };

    const setMeasures = (numMeasures) => {
        // console.log("setMeasures()", numMeasures);
        SongManager.setMeasures(numMeasures);

        // console.log("SongManager.getMeasures()", SongManager.getMeasures());
        // console.log('songmanager.bpm',SongManager.getBpm());

        document.getElementById("measures-slider").value = SongManager.getMeasures();
        document.querySelector(".info.measure span.value").innerHTML =
            SongManager.getMeasures();
        positionBeatIcons();
        positionPlayheadByElapsed();
    };

    // -------------------------------
    // Track Settings
    // -------------------------------

    /*


     .d88b.  db    db  .d8b.  d8b   db d888888b d888888b d88888D d88888b 
    .8P  Y8. 88    88 d8' `8b 888o  88 `~~88~~'   `88'   YP  d8' 88'     
    88    88 88    88 88ooo88 88V8o 88    88       88       d8'  88ooooo 
    88    88 88    88 88~~~88 88 V8o88    88       88      d8'   88~~~~~ 
    `8P  d8' 88b  d88 88   88 88  V888    88      .88.    d8' db 88.     
     `Y88'Y8 ~Y8888P' YP   YP VP   V8P    YP    Y888888P d88888P Y88888P 
                                                                                                                                 
    */

    const addNoteToSongQuantized = (note) => {
        SongManager.songQuantized.push(note);
    };

    const quantizeNote = (note) => {
        // quantizePrecision 4 = quarternote, 8 = 8thnote ect...
        let msFrequency;
        if (quantizePrecision === 4) {
            msFrequency = SongManager.getMsPerBeat();
        } else if (quantizePrecision === 8) {
            msFrequency = SongManager.getMsPer8th();
        } else if (quantizePrecision === 16) {
            msFrequency = SongManager.getMsPer16th();
        }

        // get Note's MS
        const noteMS = SongManager.getNoteMS(note);

        let beatNum = Math.floor(noteMS / msFrequency);
        const remainder = noteMS - beatNum * msFrequency;
        const closest = Math.round(remainder / msFrequency);
        beatNum += closest;
        const totalBeats = SongManager.track.duration / msFrequency;
        if (beatNum === totalBeats) {
            beatNum = 0;
        }
        const quantizedNote = {
            audio: note.audio,
            beatIcon: note.beatIcon,
            ms: beatNum * msFrequency,
            fraction: beatNum * (msFrequency / SongManager.track.duration),
        };
        note.beatIcon.qNote = quantizedNote;
        return quantizedNote;
    };

    const quantizeTrack = () => {
        // re-quantize the track
        SongManager.songQuantized.length = 0;
        for (const note of SongManager.song) {
            const quantizedNote = quantizeNote(note);
            addNoteToSongQuantized(quantizedNote);
            // note.beatIcon.qNote = quantizedNote;
        }
        if (quantizeOn) positionBeatIcons();
    };

    const toggleQuantize = () => {
        console.log('toggleQuantize()');
        quantizeOn = !quantizeOn;
        document.getElementById("quantize-light").classList.toggle("on");
        positionBeatIcons();
    };

    const quantizeSelectedNotes = () => {
        // Quantize only the selected notes
    };

    /*

    d88888b d8888b. d888888b d888888b d888888b d8b   db  d888b  
    88'     88  `8D   `88'   `~~88~~'   `88'   888o  88 88' Y8b 
    88ooooo 88   88    88       88       88    88V8o 88 88      
    88~~~~~ 88   88    88       88       88    88 V8o88 88  ooo 
    88.     88  .8D   .88.      88      .88.   88  V888 88. ~8~ 
    Y88888P Y8888D' Y888888P    YP    Y888888P VP   V8P  Y888P  
                                                            
                                                            

    */

    const writeSongCodeToClipboard = () => {
        // copy JSON to clipboard
        // create array of notes - measure, beat, fraction, and relative audio src path
        const notes = [];
        for (const note of SongManager.song) {
            notes.push({
                audioSrc: note.audio.getAttribute("src"),
                fraction: note.fraction,
            });
        }
        const songCode = {
            bpm: SongManager.getBpm(),
            measures: SongManager.getMeasures(),
            notes,
        };
        // console.log("notes", notes);
        const codeJson = JSON.stringify(songCode);
        // console.log(codeJson);
        // Copy the text inside the text field
        navigator.clipboard.writeText(codeJson);
    };

    const clearTrack = (clearAll = false) => {
        console.log("clearTrack");
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
            SongManager.removeNoteFromSong(icon.note);
        }
        checkTurnOnCopyButton();
    };

    const buildSongFromSongCode = (songJson) => {
        // songJson is an array of notes, plus tempo and measures
        const songCodeObj = JSON.parse(songJson);
        // clear song
        clearTrack(true);
        // set tempo
        setTempo(songCodeObj.bpm);
        document.getElementById("tempo-slider").value = SongManager.getBpm();
        document.querySelector(".info.tempo span.value").innerHTML =
            SongManager.getBpm();
        // set measures
        setMeasures(Number(songCodeObj.measures));
        // document.getElementById("measures-slider").value =
        //     SongManager.getMeasures();
        // document.querySelector(".info.measure span.value").innerHTML =
        //     SongManager.getMeasures();

        // Program song notes
        for (const note of songCodeObj.notes) {
            const audioEl = document.querySelector(
                `audio[src="${note.audioSrc}"]`
            );
            if (!note.fraction && note.ms) {
                note.fraction = note.ms / SongManager.track.duration;
                // console.log('track.duration',SongManager.track.duration);
            } else if (!note.ms && note.fraction) {
                note.ms = SongManager.track.duration * note.fraction;
            } else {
                // SOL
            }
            // console.log('songcodee note',note);
            // const fraction = note.fraction;
            programNote(audioEl, note.ms);
        }
        // Activate samples used in song, deactivate others
        SamplesManager.clearSampleKeys();
        for (const audioEl of SamplesManager.allSamples) {
            if (SongManager.checkSampleInSong(audioEl)) {
                // console.log(audioEl.dataset.sample, "is in song");
                // Activate this sample if not active
                SamplesManager.activateSample(audioEl);
            }
        }
        // Position beat Icons
        positionBeatIcons();
        // Play from beginning
        setPlayheadPosition(0);
        setElapsedFromPlayheadPosition();
    };

    // -------------------------------
    // Playing Song
    // -------------------------------

    const startPlaying = () => {
        if (SongManager.isPlaying) return;
        SongManager.isPlaying = true;
        startTime = -1;
        window.requestAnimationFrame(step);
    };

    const stopPlaying = () => {
        SongManager.isPlaying = false;
        stopRecording();
        playheadEl.classList.remove("on");
        // turn off colored background
        randomBackgroundColor(false);
    };

    const positionPlayheadByElapsed = () => {
        const pctPlayed = elapsed / SongManager.track.duration;
        setPlayheadPosition(SongManager.track.trackWidth * pctPlayed);
    };

    const checkAndPlayNotes = (f0, f1) => {
        // While track is playing
        // Check for notes between playhead's last position and current position
        const songAr = quantizeOn
            ? SongManager.songQuantized
            : SongManager.song;
        // Return true if 'note' is played, false if not
        let foundNote = false;
        songAr.forEach((note) => {
            if (note.fraction >= f0 && note.fraction < f1) {
                // play it
                SamplesManager.playSound(note.audio);
                // light up 'drumpad' .key for sample
                const key = SamplesManager.getKeyFromSample(note.audio);

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

    const updateCounter = () => {
        const measure = Math.floor(currentBeat / 4);
        document.getElementById("counter").innerHTML = `measure ${measure}
                            beat ${currentBeat % 4}
                            ms ${Math.round(elapsed % SongManager.getMsPerBeat())
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
            SongManager.deselectBeatIcons();
        }
    };

    const copySelectedNotesToClipboard = () => {
        // console.log("copySelectedNotesToClipboard()");
        // Copy selected Notes
        let selectedIcons = getSelectedIcons();
        console.log("selectedIcons.length", selectedIcons.length);
        if (selectedIcons.length === 0) {
            // None selected, copy them all
            selectedIcons = getAllIcons();
        }
        SongManager.track.clipboardNotes.length = 0;
        for (const icon of selectedIcons) {
            const note = icon.note; //getNoteFromBeatIcon(icon);
            // console.log("note: ", note);
            SongManager.track.clipboardNotes.push(note);
        }
        if (SongManager.track.clipboardNotes.length !== 0) {
            document.getElementById("paste-notes").classList.add("on");
        }
    };

    const MSINSTEADOFFRACTIONpasteNotesFromClipboard = () => {
        // Paste notes from clipboard

        // sort left to right
        SongManager.track.clipboardNotes.sort((A, B) => {
            return A.ms - B.ms;
        });

        const leftmostNote = SongManager.track.clipboardNotes[0];
        const leftmostTotalMS = leftmostNote.ms;
        const playheadMS = getElapsedFromPlayheadPosition();

        for (const note of SongManager.track.clipboardNotes) {
            const relativeMS = note.ms - leftmostTotalMS;

            const noteMS =
                (playheadMS + relativeMS) % SongManager.track.duration;

            programNote(note.audio, noteMS);
        }
        SongManager.deselectBeatIcons();
    };

    const pasteNotesFromClipboard = () => {
        // Paste notes from clipboard

        // sort left to right
        SongManager.track.clipboardNotes.sort((A, B) => {
            return A.fraction - B.fraction;
        });

        const leftmostNote = SongManager.track.clipboardNotes[0];
        const leftmostTotalFraction = leftmostNote.fraction;
        const playheadFraction = getPlayheadX() / SongManager.track.trackWidth;

        for (const note of SongManager.track.clipboardNotes) {
            const relativeFraction = note.fraction - leftmostTotalFraction;

            const noteFraction = (playheadFraction + relativeFraction) % 1;
            const noteMS = noteFraction * SongManager.track.duration;

            programNote(note.audio, noteMS);
        }
        SongManager.deselectBeatIcons();
    };

    const programNote = (audioEl, ms) => {
        // Create a note object and add it to song array
        // Also create quantized note and add it to songQuantized

        let beatIcon = null;
        if (audioEl.id != "tick") {
            beatIcon = makeBeatIcon();
        }
        // if (!song[measure]) song[measure] = [];
        // if (!song[measure][beat]) song[measure][beat] = [];
        const note = {
            audio:audioEl,
            beatIcon,
            ms,
            fraction: ms / SongManager.track.duration,
        };
        beatIcon.note = note;
        SongManager.removeDuplicateNotes(note);

        // Add note to song
        SongManager.song.push(note);
        const qNote = quantizeNote(note);
        addNoteToSongQuantized(qNote);

        // beatIcon.qNote = qNote;

        positionBeatIcon(note);

        return note;
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

    // =============================================
    //   BEAT ICONS
    // =============================================

    const positionBeatIcon = (note) => {
        // console.log("position beat icon note", note);
        if (!note.beatIcon) return;

        // x position
        const x = SongManager.track.trackWidth * note.fraction;
        // console.log('trackWIdth',SongManager.track.trackWidth);
        // console.log('note.fraction',note.fraction);
        // y position
        const drumIndex = SamplesManager.activeSamples.indexOf(note.audio);
        const y =
            (drumIndex + 1) *
            (trackEl.offsetHeight / (SamplesManager.activeSamples.length + 1));

        if (y === 0) {
            console.log("     beatIcon y = 0");
            console.log(
                "SamplesManager.activeSamples.length",
                SamplesManager.activeSamples.length
            );
            console.log("audio.dataset.sample", note.audio.dataset.sample);
            console.log("drumIndex", drumIndex);
            console.log("trackEl.offsetHeight", trackEl.offsetHeight);
            console.log(
                "SamplesManager.activeSamples.length",
                SamplesManager.activeSamples.length,
                "\n\r "
            );
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
                SongManager.selectBeatIcon(icon);
            }
        });

        beatIcons.appendChild(icon);
        return icon;
    };

    const positionBeatIcons = () => {
        const songAr = quantizeOn
            ? SongManager.songQuantized
            : SongManager.song;
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
        for (const note of SongManager.song) {
            if (note.beatIcon === beatIcon) {
                return note;
            }
        }
    };
    const getQuantizedNoteFromBeatIcon = (beatIcon) => {
        // or we can just set beatIcon.note when we create an icon
        for (const note of SongManager.songQuantized) {
            if (note.beatIcon === beatIcon) {
                return note;
            }
        }
    };

    const positionNoteFromIcon = (beatIcon) => {
        // console.log("positionNoteFromIcon()");
        // console.log(beatIcon);
        const note = beatIcon.note;

        const pctPos = beatIcon.offsetLeft / SongManager.track.trackWidth;
        const elapsed = pctPos * SongManager.track.duration;

        // remove note from current place in song
        SongManager.removeNoteFromSong(note);
        programNote(note.audio, elapsed);
    };

    // =============================================
    //   end BEAT ICONS
    // =============================================

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
    let lastStamp = 0;
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
        const lastFraction = lastMS / SongManager.track.duration;
        elapsed += stepTime;
        const currentFraction = (elapsed / SongManager.track.duration) % 1;

        // check for new beat
        let playedNote = false;
        const lastBeat = currentBeat;
        currentBeat = Math.floor(elapsed / SongManager.getMsPerBeat());

        // check for 1/4 note
        if (currentBeat != lastBeat || elapsed === 0) {
            // On New Beat!

            if (isRecording) {
                SamplesManager.playSound(document.getElementById("tick"));
            } else if (lightFrequency > 0) {
                randomBackgroundColor();
            }
            showBeat();

            // have we played through the track and started over?
            if (elapsed > SongManager.track.duration) {
                // looping to beginning of track
                restartingTrack = true;
                elapsed -= SongManager.track.duration;
                // console.log('\nrestarting track, elapsed:',elapsed,'\n')
                // startTime = timestamp - elapsed;
                currentBeat = 0;
            }
        } else {
            // in same 1/4 note as last time
            // check for 8th note
            const last8th = current8th;
            current8th = Math.floor(elapsed / SongManager.getMsPer8th());
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
                const last16th = current16th;
                current16th = Math.floor(elapsed / SongManager.getMsPer16th());

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
            // console.log("SongManager.track.duration", SongManager.track.duration);
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
        if (SongManager.isPlaying) {
            window.requestAnimationFrame(step);
        }
    }

    /*


.d8888.  .d8b.  .88b  d88. d8888b. db      d88888b .d8888. 
88'  YP d8' `8b 88'YbdP`88 88  `8D 88      88'     88'  YP 
`8bo.   88ooo88 88  88  88 88oodD' 88      88ooooo `8bo.   
  `Y8b. 88~~~88 88  88  88 88~~~   88      88~~~~~   `Y8b. 
db   8D 88   88 88  88  88 88      88booo. 88.     db   8D 
`8888Y' YP   YP YP  YP  YP 88      Y88888P Y88888P `8888Y' 
                                                           
                                                           


    */

    const checkKeySound = (event) => {
        // handles instrument key down
        const keyEl = document.querySelector(
            `#keys .key[data-key="${event.code}"]`
        );
        if (!keyEl) return;
        const audioEl = document.querySelector(
            `audio[data-id="${keyEl.dataset.id}"]`
        );
        if (audioEl) {
            // If recording or editing, record note
            if (isRecording || isEditing) {
                programNote(audioEl, elapsed);
            }

            // play note
            if (!isRecording) {
                // if recording, the note will get played by playhead movement
                SamplesManager.playSound(audioEl);
                keyEl.classList.add("playing");
            }
        }
    };

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

    const handleMovePointer = (event) => {
        if (draggingPlayhead) {
            // console.log("dragging playhead");
            // get mouse x relative to Track
            const clientX = event.clientX;
            const trackX = trackEl.getBoundingClientRect().left;
            let playheadX = clientX - trackX;
            playheadX = Math.max(
                Math.min(playheadX, SongManager.track.trackWidth),
                0
            );

            setPlayheadPosition(playheadX);
            setElapsedFromPlayheadPosition();
            // console.log(playheadX + "px");
        } else if (draggingIcons) {
            // Drag Icons
            const newIconDragX = getXinTrack(event);
            const dragDistX = event.movementX; //newIconDragX - lastIconDragX; //
            const selectedIcons = getSelectedIcons();
            for (const icon of selectedIcons) {
                icon.style.left = `${icon.offsetLeft + dragDistX}px`;
            }
            lastIconDragX = newIconDragX;
        }
    };

    const buildSampleSelector = () => {
        const checkBoxes = document.querySelector("#sample-selector-panel ul");
        checkBoxes.innerHTML = "";
        let audioNum = 0;
        let libName = "";
        SamplesManager.allSamples.forEach((audioEl) => {
            // make Library label
            if (audioEl.parentElement.dataset.lib !== libName) {
                libName = audioEl.parentNode.dataset.lib;
                const libTitle = document.createElement("div");
                libTitle.classList.add("library-title");
                libTitle.innerHTML = `<b>${libName}</b>`;
                libTitle.dataset.lib = libName;
                libTitle.addEventListener("pointerdown", (event) => {
                    // select this sound library
                    SamplesManager.loadSamplesLibrary(
                        event.currentTarget.dataset.lib
                    );
                });
                checkBoxes.append(libTitle);
            }
            // make Sample label
            const sampleId = "sample-" + audioNum;
            const sampleLabel = document.createElement("label");
            sampleLabel.setAttribute("for", sampleId);
            sampleLabel.innerHTML = audioEl.dataset.sample;

            // make Sample checkbox
            const sampleCheckbox = document.createElement("input");
            sampleCheckbox.setAttribute("type", "checkbox");
            sampleCheckbox.id = sampleId;
            sampleCheckbox.setAttribute("value", audioEl.dataset.sample);
            sampleCheckbox.setAttribute("name", sampleId);
            sampleCheckbox.setAttribute("data-id", audioEl.dataset.id);
            sampleCheckbox.innerHTML = audioEl.dataset.sample;

            // Checkbox Listener
            sampleCheckbox.addEventListener("change", (event) => {
                const checkbox = event.currentTarget;
                // Get checkbox's audio element
                const audioEl = document.querySelector(
                    `audio[data-id="${checkbox.dataset.id}"]`
                );
                if (checkbox.checked) {
                    if (
                        SamplesManager.activeSamples.length <
                        SamplesManager.maxSamples
                    ) {
                        // activate sample
                        SamplesManager.activateSample(audioEl);
                    } else {
                        // uncheck
                        checkbox.checked = false;
                    }
                } else {
                    // deactivate?
                    const notesWithSample =
                        SongManager.removeNoteFromSong(audioEl);
                    if (notesWithSample.length > 0) {
                        // This sample is in the song
                        const removeSample = window.confirm(
                            `Do you want to remove all occurences of ${audioEl.dataset.sample} from the track?`
                        );
                        if (removeSample) {
                            // Remove all notesWithSample from song
                            SongManager.removeNoteFromSong(notesWithSample);
                            SamplesManager.deactivateSample(audioEl);
                        } else {
                            // Don't deactivate sample
                            checkbox.checked = true;
                        }
                    } else {
                        // deactivate
                        SamplesManager.deactivateSample(audioEl);
                    }
                    checkTurnOnCopyButton();
                }
            });

            const sampleLi = document.createElement("li");
            sampleLi.classList.add("sample-checkbox");
            sampleLi.append(sampleCheckbox);
            sampleLi.append(sampleLabel);
            sampleLi.addEventListener("pointerdown", (event) => {
                SamplesManager.playSound(audioEl);
            });
            checkBoxes.append(sampleLi);
            audioNum++;
        });
    };

    // =============================================
    //   LIGHTS
    // =============================================

    // Beat Light
    const showBeat = () => {
        // console.log("showBeat()");
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
    // clear notes "X" light
    clearLight.addEventListener("transitionend", (event) => {
        if (event.target.classList.contains("on")) {
            event.target.classList.remove("on");
        }
    });

    tempoSlider.addEventListener("input", (event) => {
        // change tempo number display
        const valueDisplay = document.querySelector(".info.tempo .value");
        const oldvalue = SongManager.getBpm();
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
        console.log('document.querySelector(".info.measure .value").innerHTML',document.querySelector(".info.measure .value").innerHTML);
        setMeasures(value);
    });

    window.addEventListener("keydown", (event) => {
        console.log("key.code", event.code);
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
                SongManager.lockQuantized();
            }
        } else if (event.code === "Space") {
            // Spacebar
            if (!SongManager.isPlaying) {
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
            if (
                keysDown.includes("MetaRight") ||
                keysDown.includes("MetaLeft")
            ) {
                return;
            }
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

    const checkTurnOnCopyButton = () => {
        if (getSelectedIcons().length === 0) {
            // un-hilite copy-notes button
            document.getElementById("copy-notes").classList.remove("on");
        } else {
            document.getElementById("copy-notes").classList.add("on");
        }
    };

    trackEl.addEventListener("pointerdown", (event) => {
        if (draggingPlayhead || !isEditing) return;
        SongManager.track.pointerdown = true;
        // Get the bounding rectangle of target (trackEl)
        const rect = event.currentTarget.getBoundingClientRect();

        // Mouse position
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        SongManager.track.startXY = { x, y };
        SongManager.track.marquis.classList.add("on");
        SongManager.track.drawMarquis({ x, y }, { x, y });
        if (trackEl.setPointerCapture) {
            // track mousemove outside of element (and outside of window)
            trackEl.setPointerCapture(event.pointerId);
        }
    });
    document.addEventListener("pointerup", (event) => {
        // console.log("click track");
        if (!SongManager.track.marquis.classList.contains("on")) return;
        SongManager.track.pointerdown = false;
        SongManager.track.marquis.classList.remove("on");

        // Get the bounding rectangle of target
        // const rect = event.currentTarget.getBoundingClientRect();
        const rect = trackEl.getBoundingClientRect();

        // Mouse position
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        SongManager.track.marquisBeats(SongManager.track.startXY, { x, y });

        // remove marquis
        if (trackEl.releasePointerCapture) {
            trackEl.releasePointerCapture(event.pointerId);
        }
    });

    trackEl.addEventListener("pointermove", (event) => {
        // console.log(SongManager.track.pointerdown);
        if (SongManager.track.pointerdown) {
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
            SongManager.track.drawMarquis(SongManager.track.startXY, { x, y });
            SongManager.track.marquisBeats(SongManager.track.startXY, { x, y });
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
        const pctPos = getPlayheadX() / SongManager.track.trackWidth;
        return pctPos * SongManager.track.duration;
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
            playheadX = Math.max(
                Math.min(playheadX, SongManager.track.trackWidth),
                0
            );

            setPlayheadPosition(playheadX);
            setElapsedFromPlayheadPosition();
        });

    document.body.addEventListener("pointermove", handleMovePointer);
    document.body.addEventListener("pointerup", (event) => {
        // console.log("Release Playhead");

        draggingPlayhead = false;
        if (draggingIcons) {
            // reset notes of selected icons
            const selectedIcons = getSelectedIcons();
            // console.log('selectedIcons',selectedIcons)
            for (const icon of selectedIcons) {
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

    const sampleSelectorPanel = document.getElementById(
        "sample-selector-panel"
    );
    sampleSelectorPanel.addEventListener("pointerdown", (event) => {
        // Don't send clicks in samples panel to window, track or anyone else
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
            SamplesManager.setCheckedSamplesByActiveSamples();

            setTimeout(() => {
                window.addEventListener("pointerdown", closeSamplesPanel);
            }, 0);
        }
    };

    window.addEventListener("resize", (event) => {
        SongManager.redrawTrack();
    });

    document
        .getElementById("sample-selector-button")
        .addEventListener("pointerdown", toggleSampleSelectorPanel);
    document
        .querySelector("#sample-selector-panel .close")
        .addEventListener("pointerdown", closeSamplesPanel);

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
            // if (SongManager.isPlaying) startPlaying();
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
            SamplesManager.loadSamplesLibrary(event.currentTarget.value);
            document.activeElement.blur();
        });

    //
    // PRESETS
    //
    /*

    d8888b. d8888b. d88888b .d8888. d88888b d888888b   d888888b d8888b.  .d8b.   .o88b. db   dD .d8888. 
    88  `8D 88  `8D 88'     88'  YP 88'     `~~88~~'   `~~88~~' 88  `8D d8' `8b d8P  Y8 88 ,8P' 88'  YP 
    88oodD' 88oobY' 88ooooo `8bo.   88ooooo    88         88    88oobY' 88ooo88 8P      88,8P   `8bo.   
    88~~~   88`8b   88~~~~~   `Y8b. 88~~~~~    88         88    88`8b   88~~~88 8b      88`8b     `Y8b. 
    88      88 `88. 88.     db   8D 88.        88         88    88 `88. 88   88 Y8b  d8 88 `88. db   8D 
    88      88   YD Y88888P `8888Y' Y88888P    YP         YP    88   YD YP   YP  `Y88P' YP   YD `8888Y' 
                                                                                                        
                                                                                                        

    */
    const presetSongs = {
        "beat-1": `{"bpm":120,"measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","ms":14.571948998178506},{"audioSrc":"./sounds/tink.wav","ms":10.92896174863388},{"audioSrc":"./sounds/clap.wav","ms":510.0182149362478},{"audioSrc":"./sounds/kick.wav","ms":757.7413479052824},{"audioSrc":"./sounds/snare.wav","ms":502.73224043715845},{"audioSrc":"./sounds/kick.wav","ms":1264.1165755919853},{"audioSrc":"./sounds/tink.wav","ms":1001.8214936247722},{"audioSrc":"./sounds/snare.wav","ms":1384.335154826958},{"audioSrc":"./sounds/clap.wav","ms":1508.1967213114754},{"audioSrc":"./sounds/kick.wav","ms":1755.9198542805102},{"audioSrc":"./sounds/tink.wav","ms":1500.9107468123862},{"audioSrc":"./sounds/snare.wav","ms":1504.5537340619308},{"audioSrc":"./sounds/kick.wav","ms":2003.6429872495444},{"audioSrc":"./sounds/clap.wav","ms":2499.0892531876134},{"audioSrc":"./sounds/cowbell.wav","ms":2019},{"audioSrc":"./sounds/hihat.wav","ms":2258.6520947176687},{"audioSrc":"./sounds/kick.wav","ms":2746.8123861566482},{"audioSrc":"./sounds/snare.wav","ms":2506.375227686703},{"audioSrc":"./sounds/tink.wav","ms":2517.304189435337},{"audioSrc":"./sounds/cowbell_muted.wav","ms":2514.088114754098},{"audioSrc":"./sounds/hihat.wav","ms":2739.5264116575595},{"audioSrc":"./sounds/kick.wav","ms":3253.1876138433513},{"audioSrc":"./sounds/clap.wav","ms":3497.267759562841},{"audioSrc":"./sounds/snare.wav","ms":3387.978142076503},{"audioSrc":"./sounds/tink.wav","ms":3016.3934426229507},{"audioSrc":"./sounds/cowbell.wav","ms":3036},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3260.4735883424405},{"audioSrc":"./sounds/kick.wav","ms":3744.990892531876},{"audioSrc":"./sounds/tink.wav","ms":3508},{"audioSrc":"./sounds/snare.wav","ms":3505},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3724},{"audioSrc":"./sounds/hihat.wav","ms":3752.2768670309656},{"audioSrc":"./sounds/tink.wav","ms":4007.2859744990888},{"audioSrc":"./sounds/kick.wav","ms":4010.9289617486334},{"audioSrc":"./sounds/snare.wav","ms":4499.089253187613},{"audioSrc":"./sounds/clap.wav","ms":4506.375227686703},{"audioSrc":"./sounds/kick.wav","ms":4754.098360655737},{"audioSrc":"./sounds/tink.wav","ms":4998.178506375227},{"audioSrc":"./sounds/kick.wav","ms":5260.47358834244},{"audioSrc":"./sounds/snare.wav","ms":5380.692167577413},{"audioSrc":"./sounds/tink.wav","ms":5497.267759562841},{"audioSrc":"./sounds/snare.wav","ms":5500.910746812386},{"audioSrc":"./sounds/clap.wav","ms":5504.55373406193},{"audioSrc":"./sounds/kick.wav","ms":5752.276867030965},{"audioSrc":"./sounds/kick.wav","ms":5999.999999999999},{"audioSrc":"./sounds/cowbell.wav","ms":6015.357012750455},{"audioSrc":"./sounds/clap.wav","ms":6495.446265938068},{"audioSrc":"./sounds/snare.wav","ms":6264.145036429873},{"audioSrc":"./sounds/snare.wav","ms":6502.732240437158},{"audioSrc":"./sounds/cowbell_muted.wav","ms":6510.445127504553},{"audioSrc":"./sounds/tink.wav","ms":6513.661202185792},{"audioSrc":"./sounds/kick.wav","ms":6743.169398907103},{"audioSrc":"./sounds/snare.wav","ms":6624.078624078625},{"audioSrc":"./sounds/snare.wav","ms":6755.118755118756},{"audioSrc":"./sounds/tink.wav","ms":7012.750455373405},{"audioSrc":"./sounds/kick.wav","ms":7249.544626593806},{"audioSrc":"./sounds/cowbell_muted.wav","ms":7256.830601092895},{"audioSrc":"./sounds/snare.wav","ms":7384.335154826958},{"audioSrc":"./sounds/clap.wav","ms":7493.6247723132965},{"audioSrc":"./sounds/cowbell.wav","ms":7012.408925318762},{"audioSrc":"./sounds/snare.wav","ms":7501.357012750455},{"audioSrc":"./sounds/tink.wav","ms":7504.357012750455},{"audioSrc":"./sounds/kick.wav","ms":7741.347905282331},{"audioSrc":"./sounds/hihat.wav","ms":7504.553734061931},{"audioSrc":"./sounds/openhat.wav","ms":7750.341530054645},{"audioSrc":"./sounds/snare.wav","ms":7762.721994535519},{"audioSrc":"./sounds/cowbell_muted.wav","ms":7753.0712530712535},{"audioSrc":"./sounds/ride.wav","ms":7993.447993447994}]}`,

        "beat-2": `{"bpm":"83","measures":"2","notes":[{"audioSrc":"./sounds/kick.wav","ms":13.167423793534795},{"audioSrc":"./sounds/boom.wav","ms":15.800908552241753},{"audioSrc":"./sounds/tink.wav","ms":376.58832049509505},{"audioSrc":"./sounds/openhat.wav","ms":11.89182961353611},{"audioSrc":"./sounds/tom.wav","ms":545.1313450523404},{"audioSrc":"./sounds/cowbell.wav","ms":18.948745802883664},{"audioSrc":"./sounds/ride.wav","ms":18.948745802883664},{"audioSrc":"./sounds/openhat.wav","ms":34},{"audioSrc":"./sounds/cowbell_muted.wav","ms":10.533939034827835},{"audioSrc":"./sounds/kick.wav","ms":1258.8057146619262},{"audioSrc":"./sounds/cowbell_muted.wav","ms":1086.1478701692013},{"audioSrc":"./sounds/clap.wav","ms":722.8915662650602},{"audioSrc":"./sounds/snare.wav","ms":737.3757324379485},{"audioSrc":"./sounds/tink.wav","ms":740.0092171966554},{"audioSrc":"./sounds/kick.wav","ms":1806.5705444729738},{"audioSrc":"./sounds/boom.wav","ms":1817.1044835078014},{"audioSrc":"./sounds/cowbell_muted.wav","ms":1807.2494897623278},{"audioSrc":"./sounds/tom.wav","ms":1632.7605503983145},{"audioSrc":"./sounds/snare.wav","ms":2180.5253802093616},{"audioSrc":"./sounds/kick.wav","ms":2525.5118835999733},{"audioSrc":"./sounds/hihat.wav","ms":2352.977483705313},{"audioSrc":"./sounds/clap.wav","ms":2174.0361445783133},{"audioSrc":"./sounds/boom.wav","ms":2716.562973204292},{"audioSrc":"./sounds/hihat.wav","ms":2701.95536243334},{"audioSrc":"./sounds/cowbell_muted.wav","ms":2354.1502073869246},{"audioSrc":"./sounds/openhat.wav","ms":2902.100204095069},{"audioSrc":"./sounds/kick.wav","ms":2903.3757982750676},{"audioSrc":"./sounds/boom.wav","ms":2906.0092830337744},{"audioSrc":"./sounds/cowbell.wav","ms":2915.2083744815327},{"audioSrc":"./sounds/tink.wav","ms":3266.796694976628},{"audioSrc":"./sounds/tom.wav","ms":3435.339719533873},{"audioSrc":"./sounds/cowbell.wav","ms":3599.2083744815327},{"audioSrc":"./sounds/clap.wav","ms":3613.099940746593},{"audioSrc":"./sounds/snare.wav","ms":3627.584106919481},{"audioSrc":"./sounds/tink.wav","ms":3630.217591678188},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3976.356244650734},{"audioSrc":"./sounds/kick.wav","ms":4149.0140891434585},{"audioSrc":"./sounds/cowbell.wav","ms":4322.824083218118},{"audioSrc":"./sounds/tom.wav","ms":4522.968924879848},{"audioSrc":"./sounds/kick.wav","ms":4696.7789189545065},{"audioSrc":"./sounds/cowbell_muted.wav","ms":4697.457864243861},{"audioSrc":"./sounds/boom.wav","ms":4707.312857989335},{"audioSrc":"./sounds/cowbell.wav","ms":5033.991507011653},{"audioSrc":"./sounds/clap.wav","ms":5064.244519059846},{"audioSrc":"./sounds/snare.wav","ms":5070.733754690895},{"audioSrc":"./sounds/hihat.wav","ms":5243.1858581868455},{"audioSrc":"./sounds/cowbell_muted.wav","ms":5244.358581868458},{"audioSrc":"./sounds/kick.wav","ms":5415.7202580815065},{"audioSrc":"./sounds/hihat.wav","ms":5592.163736914872},{"audioSrc":"./sounds/boom.wav","ms":5606.771347685824}]}`,

        "beat-3": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/kick.wav","ms":13.179571663920923},{"audioSrc":"./sounds/tink.wav","ms":286},{"audioSrc":"./sounds/hihat.wav","ms":253},{"audioSrc":"./sounds/hihat.wav","ms":23.064250411861615},{"audioSrc":"./sounds/kick.wav","ms":771.004942339374},{"audioSrc":"./sounds/snare.wav","ms":542},{"audioSrc":"./sounds/tink.wav","ms":770},{"audioSrc":"./sounds/tom.wav","ms":637.7162273476113},{"audioSrc":"./sounds/tom.wav","ms":760.4638591433278},{"audioSrc":"./sounds/tom.wav","ms":509.3827224052718},{"audioSrc":"./sounds/clap.wav","ms":1021.4168039538715},{"audioSrc":"./sounds/tink.wav","ms":1270},{"audioSrc":"./sounds/hihat.wav","ms":1258.6490939044481},{"audioSrc":"./sounds/boom.wav","ms":1040},{"audioSrc":"./sounds/kick.wav","ms":1766.0626029654036},{"audioSrc":"./sounds/snare.wav","ms":1532.1252059308072},{"audioSrc":"./sounds/tink.wav","ms":1787},{"audioSrc":"./sounds/hihat.wav","ms":1509.0609555189455},{"audioSrc":"./sounds/kick.wav","ms":2260.296540362438},{"audioSrc":"./sounds/tink.wav","ms":2009.8846787479406},{"audioSrc":"./sounds/cowbell.wav","ms":2016.4744645799012},{"audioSrc":"./sounds/cowbell.wav","ms":2490.939044481054},{"audioSrc":"./sounds/hihat.wav","ms":2007.503603789127},{"audioSrc":"./sounds/hihat.wav","ms":2253.0632207578255},{"audioSrc":"./sounds/kick.wav","ms":2517.2981878088963},{"audioSrc":"./sounds/snare.wav","ms":2754.530477759473},{"audioSrc":"./sounds/tink.wav","ms":2767.710049423394},{"audioSrc":"./sounds/tink.wav","ms":2503.783978583196},{"audioSrc":"./sounds/tom.wav","ms":2642.504118616145},{"audioSrc":"./sounds/tom.wav","ms":2751.2355848434927},{"audioSrc":"./sounds/clap.wav","ms":3008.2372322899505},{"audioSrc":"./sounds/tink.wav","ms":3252.0593080724875},{"audioSrc":"./sounds/cowbell.wav","ms":3004.9423393739703},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3249.626750411862},{"audioSrc":"./sounds/hihat.wav","ms":3256.229406919275},{"audioSrc":"./sounds/boom.wav","ms":3011.5321252059307},{"audioSrc":"./sounds/openhat.wav","ms":3245.469522240527},{"audioSrc":"./sounds/ride.wav","ms":3001.64744645799},{"audioSrc":"./sounds/kick.wav","ms":3502.4711696869854},{"audioSrc":"./sounds/snare.wav","ms":3515.6507413509057},{"audioSrc":"./sounds/cowbell_muted.wav","ms":3748.455518945634},{"audioSrc":"./sounds/hihat.wav","ms":3755.6373558484347}]}`,

        "beat-6": `{"bpm":120,"measures":"4","notes":[{"audioSrc":"./sounds/kick.wav","ms":19.71830985915493},{"audioSrc":"./sounds/clap.wav","ms":504.22535211267603},{"audioSrc":"./sounds/kick.wav","ms":1247.8873239436618},{"audioSrc":"./sounds/clap.wav","ms":1504.225352112676},{"audioSrc":"./sounds/kick.wav","ms":2005.6338028169014},{"audioSrc":"./sounds/clap.wav","ms":2490.1408450704225},{"audioSrc":"./sounds/kick.wav","ms":2754.9295774647885},{"audioSrc":"./sounds/kick.wav","ms":3233.8028169014083},{"audioSrc":"./sounds/clap.wav","ms":3490.1408450704225},{"audioSrc":"./sounds/kick.wav","ms":3753.0072173215717},{"audioSrc":"./sounds/kick.wav","ms":4005.6338028169016},{"audioSrc":"./sounds/clap.wav","ms":4490.140845070423},{"audioSrc":"./sounds/kick.wav","ms":5233.802816901409},{"audioSrc":"./sounds/clap.wav","ms":5490.140845070423},{"audioSrc":"./sounds/kick.wav","ms":6005.633802816901},{"audioSrc":"./sounds/kick.wav","ms":6761.828388131516},{"audioSrc":"./sounds/clap.wav","ms":7008.450704225353},{"audioSrc":"./sounds/clap.wav","ms":7256.338028169014},{"audioSrc":"./sounds/clap.wav","ms":7509.859154929577},{"audioSrc":"./sounds/clap.wav","ms":7752.112676056338},{"audioSrc":"./sounds/clap.wav","ms":7639.43661971831},{"audioSrc":"./sounds/ride.wav","ms":7545}]}`,

        "beat-box-2": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":379.4950267788829},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","ms":137.71996939556234},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":3.06044376434583},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":257.0772762050497},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":504.973221117062},{"audioSrc":"./sounds/beatbox/beatbox_BackwardsSnare.wav","ms":749.8087222647284},{"audioSrc":"./sounds/beatbox/beatboxKickHic.wav","ms":1003.8255547054322},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":1499.6174445294569},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":2384.0856924254017},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":2004.5906656465186},{"audioSrc":"./sounds/beatbox/beatbox_KickExplosive.wav","ms":2258.6074980872227},{"audioSrc":"./sounds/beatbox/beatboxKick.wav","ms":2123.947972456006},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":2506.503442999235},{"audioSrc":"./sounds/beatbox/beatbox_BackwardsSnare.wav","ms":2754.399387911247},{"audioSrc":"./sounds/beatbox/beatboxKickHic.wav","ms":3002.2953328232593},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3387.911247130834},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","ms":3501.14766641163},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3878},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3755.1644988523335},{"audioSrc":"./sounds/beatbox/beatbox_Tick.wav","ms":3632.7467482785005}]}`,

        "beat-7": `{"bpm":120,"measures":2,"notes":[{"audioSrc":"./sounds/snare.wav","fraction":0.6255000000000002},{"audioSrc":"./sounds/kick.wav","fraction":0.31355000000000005},{"audioSrc":"./sounds/kick.wav","fraction":0.4386500000000002},{"audioSrc":"./sounds/snare.wav","fraction":0.874251497005988},{"audioSrc":"./sounds/snare.wav","fraction":0.12724550898203593},{"audioSrc":"./sounds/kick.wav","fraction":0.2522455089820359},{"audioSrc":"./sounds/kick.wav","fraction":0.0029940119760479044},{"audioSrc":"./sounds/kick.wav","fraction":0.562874251497006},{"audioSrc":"./sounds/kick.wav","fraction":0.688622754491018},{"audioSrc":"./sounds/kick.wav","fraction":0.7514970059880239},{"audioSrc":"./sounds/snare.wav","fraction":0.37649700598802394},{"audioSrc":"./sounds/clap.wav","fraction":0.37425149700598803},{"audioSrc":"./sounds/clap.wav","fraction":0.875748502994012},{"audioSrc":"./sounds/cowbell.wav","fraction":0.18862275449101795},{"audioSrc":"./sounds/cowbell.wav","fraction":0.31362275449101795},{"audioSrc":"./sounds/cowbell.wav","fraction":0.687874251497006},{"audioSrc":"./sounds/cowbell.wav","fraction":0.8143712574850299},{"audioSrc":"./sounds/cowbell_muted.wav","fraction":0.12649700598802396},{"audioSrc":"./sounds/boom.wav","fraction":0.43862275449101795},{"audioSrc":"./sounds/cowbell_muted.wav","fraction":0.625748502994012},{"audioSrc":"./sounds/beatbox/beatboxRim.wav","fraction":0.938622754491018},{"audioSrc":"./sounds/snare.wav","fraction":0.9079341317365269}]}`,

    };

    /*

        d8888b.  .d88b.  d888888b d8b   db d888888b    .d88b.  d88888b   d88888b d8b   db d888888b d8888b. db    db 
        88  `8D .8P  Y8.   `88'   888o  88 `~~88~~'   .8P  Y8. 88'       88'     888o  88 `~~88~~' 88  `8D `8b  d8' 
        88oodD' 88    88    88    88V8o 88    88      88    88 88ooo     88ooooo 88V8o 88    88    88oobY'  `8bd8'  
        88~~~   88    88    88    88 V8o88    88      88    88 88~~~     88~~~~~ 88 V8o88    88    88`8b      88    
        88      `8b  d8'   .88.   88  V888    88      `8b  d8' 88        88.     88  V888    88    88 `88.    88    
        88       `Y88P'  Y888888P VP   V8P    YP       `Y88P'  YP        Y88888P VP   V8P    YP    88   YD    YP    
                                                                                                                    
                                                                                                                    

    */

    buildPresetPulldown();
    buildLibraryPulldown();
    SamplesManager.setAudioElementsIds();
    SamplesManager.loadSamplesLibrary("standard");
    SongManager.buildTrack();
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
