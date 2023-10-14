// Track is the visual display of Song
// It is the GUI you interact with to edit
/*
Put in here:
track
beatIcons
playHead
*/

import { activeSamples, playSound } from "./module-samples.js";
import {
    getMeasures,
    // getMsPer16th,
    // getMsPer8th,
    getMsPerBeat,
    getSongNotes,
    getIsPlaying,
    getIsEditing,
    // setIsEditing,
    getIsRecording,
    // setIsRecording
} from "./module-song.js";

let draggingIcons = false;
let lastIconDragX;

const beatIcons = document.getElementById("beat-icons");
// trackEl is also declared in drum-machine.js (and other modules)
// redundancy bad.  How to fix?
const trackEl = document.getElementById("track");
const track = {};
track.marquis = trackEl.querySelector("#marquis");
track.clipboardNotes = [];

const getLastIconDragX = () => {
    return lastIconDragX;
}

const setLastIconDragX = (value) => {
    lastIconDragX = value;
}

const getDraggingIcons = () => {
    return draggingIcons;
}
const setDraggingIcons = (value) => {
    draggingIcons = value;
}

// =============================================
//   TRACK MANAGEMENT
// =============================================
// -------------------------------
// Initial draw of Track view
// -------------------------------
const buildTrack = () => {
    track.trackWidth = trackEl.offsetWidth;
    track.duration = getMsPerBeat() * 4 * getMeasures();
    drawTrack();
};

const setTrackDuration = (duration) => {
    track.duration = duration;
};
const getTrackDuration = () => {
    return track.duration;
};

const selectBeatIcon = (beatIcon) => {
    console.log("selectBeatIcon()");
    // Show it selected
    if (!beatIcon.classList.contains("selected")) {
        beatIcon.classList.add("selected");
        if (!getIsPlaying()) {
            playSound(beatIcon.note.audioEl);
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
};

// -------------------------------
// Initial draw of Track view
// -------------------------------

const drawTrack = () => {
    const total8ths = getMeasures() * 8;
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
    positionBeatIcons(getSongNotes());
};

const getXinTrack = (pointerevent) => {
    const clientX = pointerevent.clientX;
    const trackX = trackEl.getBoundingClientRect().left;
    return clientX - trackX;
};

// =============================================
//   BEAT ICONS
// =============================================

const positionBeatIcon = (note) => {
    // console.log('positionBeatIcon()');
    // console.log("position beat icon note", note);
    if (!note.beatIcon) return;

    // x position
    const x = track.trackWidth * note.fraction;
    // console.log("x:", x);
    // console.log('trackWIdth',SongManager.track.trackWidth);
    // console.log('note.fraction',note.fraction);
    // y position
    const drumIndex = activeSamples.indexOf(note.audioEl);
    const y =
        (drumIndex + 1) * (trackEl.offsetHeight / (activeSamples.length + 1));

    // if (y === 0) {
    //     console.log("     beatIcon y = 0");
    //     console.log(
    //         "SamplesManager.activeSamples.length",
    //         SamplesManager.activeSamples.length
    //     );
    //     console.log("audio.dataset.sample", note.audioEl.dataset.sample);
    //     console.log("drumIndex", drumIndex);
    //     console.log("trackEl.offsetHeight", trackEl.offsetHeight);
    //     console.log(
    //         "SamplesManager.activeSamples.length",
    //         SamplesManager.activeSamples.length,
    //         "\n\r "
    //     );
    // }

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
        if (getIsEditing() || getIsRecording()) {
            selectBeatIcon(icon);
        }
    });

    beatIcons.appendChild(icon);
    return icon;
};



const positionBeatIcons = (notes) => {
    console.log("positionBeatIcons()");
    for (const note of notes) {
        positionBeatIcon(note);
    }
};

export const TrackManager = {
    positionBeatIcon,
    positionBeatIcons,
    makeBeatIcon,
    buildTrack,
    drawTrack,
    redrawTrack,
    track,
}
export {
    positionBeatIcon,
    positionBeatIcons,
    makeBeatIcon,
    // setTrackDuration,
    // getTrackDuration,
    buildTrack,
    drawTrack,
    redrawTrack,
    track,
    setDraggingIcons,
    getDraggingIcons,
    getXinTrack,
    setLastIconDragX,
    getLastIconDragX
};
