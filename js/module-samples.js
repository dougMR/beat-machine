import {
    findSampleInSong,
    removeNotesFromSong,
} from "./module-song.js";
/*


.d8888.  .d8b.  .88b  d88. d8888b. db      d88888b .d8888. 
88'  YP d8' `8b 88'YbdP`88 88  `8D 88      88'     88'  YP 
`8bo.   88ooo88 88  88  88 88oodD' 88      88ooooo `8bo.   
  `Y8b. 88~~~88 88  88  88 88~~~   88      88~~~~~   `Y8b. 
db   8D 88   88 88  88  88 88      88booo. 88.     db   8D 
`8888Y' YP   YP YP  YP  YP 88      Y88888P Y88888P `8888Y' 
                                                           

*/

// 'Samples' refer to audio elements

// init variables

// *** Should a module directly query the DOM?
const allSamples = Array.from(
    document.querySelectorAll(".sample-library audio")
);
let libraryEl = document.querySelector('section[data-library="1"');
const keysEl = document.querySelector("#keys");
const maxSamples = 11;
const activeSamples = [];
const sampleCopies = [];

// The middle keyboard row is for playing samples
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

const dupeSample = (audioEl) => {
    // duplicate the audio element
    const id = parseInt(audioEl.dataset.id);
    const newAudio = new Audio(audioEl.src);
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
        // console.log("playSampleCopy()");
        const newSample = dupeSample(audioEl);
        const tempListener = (e) => {
            e.target.play();
            e.target.removeEventListener("canplaythrough", tempListener);
        };
        newSample.addEventListener("canplaythrough", tempListener);
    }
};

// -------------------------------
// Initial build of sample-selector view
// -------------------------------
const setAudioElementsIds = () => {
    // const audios = document.querySelectorAll(".sample-library audio ");
    let idNum = 0;
    allSamples.forEach((audioEl) => {
        audioEl.setAttribute("data-id", `${idNum}`);
        // console.log(audioEl);
        idNum++;
    });
};

const getKeyFromSample = (audioEl) => {
    return document.querySelector(`.key[data-id="${audioEl.dataset.id}"]`);
};

// =======================
//
//    SAMPLES
//
// =======================

const playSound = (audioEl) => {
    // if (!(audioEl.currentTime === 0 || audioEl.ended)) {
    //     // console.log("overlap");
    //     sample is already playing, play a copy
    //     playSampleCopy(audioEl);
    // } else {
    audioEl.currentTime = 0;
    audioEl.play();
    // }
};

const clearSampleKeys = () => {
    keysEl.innerHTML = "";
    activeSamples.length = 0;
};

const clearSampleKey = (audioEl) => {
    // *** is there a newKey in parent scope?
    newKey.dataset.id = audioEl.dataset.id;
};

const loadSamplesLibrary = (libraryName) => {
    libraryEl = document.querySelector(
        `section.sample-library[data-lib="${libraryName}"]`
    );
    // TODO: handle no libraryEl
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
            // *** findSampleInSong() isn't in this module.  Should it be?
            notesToRemove.push(...findSampleInSong(audioEl));
        }
    }
    if (notesToRemove.length > 0) {
        const confirmed = window.confirm(
            "This will deactivate any in-use samples, and remove them from the track."
        );
        if (!confirmed) {
            // Abort!
            return;
        } else {
            // delete the notes
            // *** removeNotesFromSong() isn't in this module.  Should it be?
            removeNotesFromSong(notesToRemove);
        }
    }
    clearSampleKeys();
    audioEls.forEach((audioEl) => {
        activateSample(audioEl);
    });
    // *** setCheckedSamplesByActiveSamples() isn't in this module.  Should it be?
    setCheckedSamplesByActiveSamples();
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

const removeTransition = (event) => {
    // Remove .key transition
    if (event.target.classList.contains("playing")) {
        event.target.classList.remove("playing");
    }
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
    const keyEl = getKeyFromSample(audioEl);
    keyEl.remove();
    rebuildKeys();
};

// =============================================
//   end SAMPLES
// =============================================

const SamplesManager = {
    allSamples,
    activeSamples,
    maxSamples,
    deactivateSample,
    // rebuildKeys,
    // clearKeys,
    activateSample,
    createSampleKey,
    arrangeSampleKeys,
    activateSamples,
    loadSamplesLibrary,
    // clearSampleKey,
    clearSampleKeys,
    playSound,
    getKeyFromSample,
    setAudioElementsIds,
    // playSampleCopy,
    // dupeSample
    setCheckedSamplesByActiveSamples,
};

export { SamplesManager, activeSamples, playSound };
