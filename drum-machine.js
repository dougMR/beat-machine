import { SamplesManager } from "./js/module-samples.js";
import {
    SongManager,
    QuantizeManager,
    getIsRecording,
    setIsRecording,
    getIsEditing,
    setIsEditing,
} from "./js/module-song.js";
import { presetSongs } from "./js/module-preset-songs.js";
import {
    positionBeatIcon,
    makeBeatIcon,
    buildTrack,
    redrawTrack,
    track,
    setDraggingIcons,
    getDraggingIcons,
    getXinTrack,
    // getLastIconDragX,
    setLastIconDragX
} from "./js/module-trackGUI.js";

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

 - dragging playhead doesn't update measure and beat displayed

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
    const targetMSperFrame = 1000 / fps;

    let currentMeasure = 0;
    let currentBeat = 0;
    let current8th = 0;
    let current16th = 0;

    let startTime = -1;
    let elapsed;

    // QuantizeManager.quantizeOn = false;

    let scrubbing = false;
    
    let draggingPlayhead = false;
    let lightFrequency = -1;
    QuantizeManager.setQuantizePrecision(4);

    // -1 = none, 0 = 1/4 and all notes, 4 = 1/4, 8 = 1/8, 16 = 1/16

    const playheadEl = document.getElementById("playhead");
    const trackEl = document.getElementById("track");

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
        SongManager.setTempo(bpm);
        SongManager.repositionBeatIcons();
        positionPlayheadByElapsed();
    };

    const setMeasures = (numMeasures) => {
        // console.log("setMeasures()", numMeasures);
        SongManager.setMeasures(numMeasures);
        document.getElementById("measures-slider").value =
            SongManager.getMeasures();
        document.querySelector(".info.measure span.value").innerHTML =
            SongManager.getMeasures();
        SongManager.repositionBeatIcons();
        positionPlayheadByElapsed();
    };

    // -------------------------------
    // Track Settings
    // -------------------------------

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
                audioSrc: note.audioEl.getAttribute("src"),
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

        // Program song notes
        for (const note of songCodeObj.notes) {
            const audioEl = document.querySelector(
                `audio[src="${note.audioSrc}"]`
            );
            if (!note.fraction && note.ms) {
                note.fraction = note.ms / track.duration;
            } else if (!note.ms && note.fraction) {
                note.ms = track.duration * note.fraction;
            } else {
                // SOL
            }
            programNote(audioEl, note.ms);
        }
        // Activate samples used in song, deactivate others
        SamplesManager.clearSampleKeys();
        for (const audioEl of SamplesManager.allSamples) {
            if (SongManager.checkSampleInSong(audioEl)) {
                // Activate this sample if not active
                SamplesManager.activateSample(audioEl);
            }
        }
        // Position beat Icons
        SongManager.repositionBeatIcons();
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
        const pctPlayed = elapsed / track.duration;
        setPlayheadPosition(track.trackWidth * pctPlayed);
    };

    const checkAndPlayNotes = (f0, f1) => {
        // While track is playing
        // Check for notes between playhead's last position and current position
        // console.log('QuantizeManager.quantizeOn:',QuantizeManager.quantizeOn());
        const songAr = QuantizeManager.getQuantizeOn()
            ? QuantizeManager.songQuantized
            : SongManager.song;
        // Return true if 'note' is played, false if not
        let foundNote = false;
        songAr.forEach((note) => {
            if (note.fraction >= f0 && note.fraction < f1) {
                // play it
                SamplesManager.playSound(note.audioEl);
                // light up 'drumpad' .key for sample
                const key = SamplesManager.getKeyFromSample(note.audioEl);

                if (key) {
                    const keyStyle = getComputedStyle(key);
                    if (keyStyle.borderRadius !== "1px") {
                        key.classList.add("playing");
                    }
                }
                // light up beat icon for 'note'
                if (!getIsRecording() && note.beatIcon) {
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
                            ms ${Math.round(
                                elapsed % SongManager.getMsPerBeat()
                            )
                                .toString()
                                .padStart(4, "0")}
                             &nbsp;fps ${currentFPS}`;
    };

    // =======================
    //   RECORDING
    // =======================
    const startRecording = () => {
        recLight.classList.add("on");
        setIsRecording(true);
        // quantizeTrack();
        startPlaying();
    };
    const stopRecording = () => {
        recLight.classList.remove("on");
        setIsRecording(false);
        // quantizeTrack();
    };
    const toggleRecording = () => {
        setIsRecording(!getIsRecording());
        if (getIsRecording()) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    const toggleEdit = () => {
        setIsEditing(!getIsEditing());
        document.getElementById("edit-light").classList.toggle("on");
        if (!getIsEditing()) {
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

            programNote(note.audioEl, noteMS);
        }
        SongManager.deselectBeatIcons();
    };

    const pasteNotesFromClipboard = () => {
        // Paste notes from clipboard

        // sort left to right
        track.clipboardNotes.sort((A, B) => {
            return A.fraction - B.fraction;
        });

        const leftmostNote = track.clipboardNotes[0];
        const leftmostTotalFraction = leftmostNote.fraction;
        const playheadFraction = getPlayheadX() / track.trackWidth;

        for (const note of track.clipboardNotes) {
            const relativeFraction = note.fraction - leftmostTotalFraction;

            const noteFraction = (playheadFraction + relativeFraction) % 1;
            const noteMS = noteFraction * track.duration;

            programNote(note.audioEl, noteMS);
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
            audioEl,
            beatIcon,
            ms,
            fraction: ms / track.duration,
        };
        beatIcon.note = note;
        SongManager.removeDuplicateNotes(note);

        // Add note to song
        SongManager.song.push(note);
        const qNote = QuantizeManager.quantizeNote(note);
        QuantizeManager.addNoteToSongQuantized(qNote);

        // beatIcon.qNote = qNote;

        positionBeatIcon(note);

        return note;
    };

    // --------------------------------
    //    end MANAGE NOTES / SONG
    // --------------------------------

    

    const toggleHelp = () => {
        document.getElementById("keys-help-panel").classList.toggle("hidden");
        // Hey Doug! There's a universal hidden attribute for HTML elements
        // element.hidden = true / element.hidden = false / element.hidden = !element.hidden...
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
        for (const note of QuantizeManager.songQuantized) {
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
        SongManager.removeNoteFromSong(note);
        programNote(note.audioEl, elapsed);
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
        const lastFraction = lastMS / track.duration;
        elapsed += stepTime;
        const currentFraction = (elapsed / track.duration) % 1;

        // check for new beat
        let playedNote = false;
        const lastBeat = currentBeat;
        currentBeat = Math.floor(elapsed / SongManager.getMsPerBeat());

        // check for 1/4 note
        if (currentBeat != lastBeat || elapsed === 0) {
            // On New Beat!

            if (getIsRecording()) {
                SamplesManager.playSound(document.getElementById("tick"));
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
            const last8th = current8th;
            current8th = Math.floor(elapsed / SongManager.getMsPer8th());
            if (!getIsRecording() && last8th !== current8th) {
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

                if (!getIsRecording() && last16th !== current16th) {
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
        if (playedNote && !getIsRecording() && lightFrequency === 0) {
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
            if (getIsRecording() || getIsEditing()) {
                programNote(audioEl, elapsed);
            }

            // play note
            if (!getIsRecording()) {
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

    const handleMovePointer = (event) => {
        if (draggingPlayhead) {
            // console.log("dragging playhead");
            // get mouse x relative to Track
            const clientX = event.clientX;
            const trackX = trackEl.getBoundingClientRect().left;
            let playheadX = clientX - trackX;
            playheadX = Math.max(Math.min(playheadX, track.trackWidth), 0);

            setPlayheadPosition(playheadX);
            currentBeat = Math.floor(elapsed / SongManager.getMsPerBeat());
            // currentMeasure = Math.floor(currentBeat / 4);
            // currentBeat -= currentMeasure * 4;

            setElapsedFromPlayheadPosition();

            // console.log(playheadX + "px");
        } else if (getDraggingIcons()) {
            // Drag Icons
            const newIconDragX = getXinTrack(event);
            const dragDistX = event.movementX; //newIconDragX - lastIconDragX; //
            const selectedIcons = getSelectedIcons();
            for (const icon of selectedIcons) {
                icon.style.left = `${icon.offsetLeft + dragDistX}px`;
            }
            setLastIconDragX(newIconDragX);
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
        console.log(
            'document.querySelector(".info.measure .value").innerHTML',
            document.querySelector(".info.measure .value").innerHTML
        );
        setMeasures(value);
    });

    window.addEventListener("keydown", (event) => {
        // console.log("key.code", event.code);
        // KeyboardEvent.code assumes QWERTY and ignores variations of alternate layouts
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
            QuantizeManager.toggleQuantize();
        } else if (keysDown.includes("KeyQ")) {
            if (event.code === "KeyL") {
                // 'Q' and 'L'
                // lock quantized
                QuantizeManager.lockQuantized();
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
        if (draggingPlayhead || !getIsEditing()) return;
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

    document.body.addEventListener("pointermove", handleMovePointer);
    document.body.addEventListener("pointerup", (event) => {
        // console.log("Release Playhead");

        draggingPlayhead = false;
        if (getDraggingIcons()) {
            // reset notes of selected icons
            const selectedIcons = getSelectedIcons();
            // console.log('selectedIcons',selectedIcons)
            for (const icon of selectedIcons) {
                icon.classList.remove("selected");
                positionNoteFromIcon(icon);
            }

            setDraggingIcons(false);
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
        redrawTrack();
        positionPlayheadByElapsed();
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
            console.log("quantize frequency")
            // console.log("QuantizeManager.quantizePrecision: ",QuantizeManager.quantizePrecision) 
            QuantizeManager.setQuantizePrecision(parseInt(
                event.currentTarget.value
            ))
            // console.log("QuantizeManager.quantizePrecision: ",QuantizeManager.quantizePrecision)
            QuantizeManager.quantizeTrack();
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
