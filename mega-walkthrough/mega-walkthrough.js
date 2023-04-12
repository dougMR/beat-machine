// Thanks to https://bobbyhadz.com/blog/javascript-find-highest-z-index-on-page
function getMaxZIndex() {
    return Math.max(
        ...Array.from(document.querySelectorAll("body *"), (el) =>
            parseFloat(window.getComputedStyle(el).zIndex)
        ).filter((zIndex) => !Number.isNaN(zIndex)),
        0
    );
}
function triggerEvent(el, type) {
    const evt = new Event(type);
    el.dispatchEvent(evt);
    // Do I need to get rid of evt?  Will it be garbage collected?
}

var megaWalkthrough =
    megaWalkthrough ||
    (() => {
        // Doug's walk-through builder
        const megaPlacard = document.createElement("div");
        megaPlacard.classList.add("mega-placard", "hidden");
        document.body.append(megaPlacard);

        // megaSteps are elements labeled as a step (zero-based numbering)
        const megaStepEls = Array.from(
            document.querySelectorAll("[data-mega-step]")
        );
        // sort by step number
        megaStepEls.sort((a, b) => {
            return Number(a.dataset.megaStep) - Number(b.dataset.megaStep);
        });
        let currentStep = 0;
        const megaSteps = [];
        for (let stepNum = 0; stepNum < megaStepEls.length; stepNum++) {
            megaSteps.push({
                element: megaStepEls[stepNum],
            });
        }
        const megaHilightEl = document.createElement("div");
        megaHilightEl.classList.add("mega-hilight", "hidden");
        megaHilightEl.style.zIndex = getMaxZIndex() + 10;
        document.body.appendChild(megaHilightEl);
        megaPlacard.style.zIndex = parseInt(megaHilightEl.style.zIndex) + 10;

        // set copy for megaSteps elements
        const setCopy = (copyAr) => {
            // Length of copyAr needs to match megaSteps
            for (let stepNum = 0; stepNum < megaSteps.length; stepNum++) {
                megaSteps[stepNum].title = copyAr[stepNum][0];
                megaSteps[stepNum].copy = copyAr[stepNum][1];
            }
        };
        const buildPlacard = () => {
            // info panel "placard"

            // close
            // title
            // copy
            // nav-dots (progress)
            // back
            // next
            // done
            // arrow
            let megaPlacardHtml = `<div class="pointer"></div>
        <header>
            <h3 class='title'></h3><a class='close' role='button'>x</a>
        </header>
        <main>
            <p class='copy'></p>
            
        <button style='display:none;' class='press-element'>Select</button>
        </main>     
        <footer>
        <nav style="flex-grow:1"><ul role="tablist">`;
            for (let stepNum = 0; stepNum < megaSteps.length; stepNum++) {
                // const stepNum = step.dataset.megaStep;
                megaPlacardHtml += `<li><a tabindex="${stepNum}" data-step="${stepNum}"></a></li>`;
            }
            megaPlacardHtml += `</ul></nav>   
            <button class='back'>Back</button>
            <button class='next'>Next</button>
        </footer>`;
            megaPlacard.innerHTML = megaPlacardHtml;

            megaPlacard
                .querySelector("main .press-element")
                .addEventListener("pointerdown", (event) => {
                    // Press the element
                    triggerEvent(megaSteps[currentStep].element, "pointerdown");
                    // megaSteps[currentStep].element.style.border = '3px solid red';
                    // megaSteps[currentStep].element.onPointerDown();
                });
            megaPlacard
                .querySelector("header .close")
                .addEventListener("pointerdown", (event) => {
                    // Close the placard
                    hidePlacard();
                });
            megaPlacard
                .querySelector("footer .back")
                .addEventListener("pointerdown", (event) => {
                    // Go to previous mega-step
                    prevPlacard();
                });
            megaPlacard
                .querySelector("footer .next")
                .addEventListener("pointerdown", (event) => {
                    // Go to next mega-step
                    nextPlacard();
                });
        };

        // set the current placard content
        const setPlacard = () => {
            // console.log(`setPlacard(${currentStep})`);
            // set heading
            megaPlacard.querySelector("header .title").innerHTML =
                megaSteps[currentStep]?.title || "";
            // set copy
            megaPlacard.querySelector(".copy").innerHTML =
                megaSteps[currentStep]?.copy || "";
            // set active bullet
            megaPlacard.querySelectorAll("nav li a").forEach((el) => {
                if (Number(el.dataset.step) === currentStep) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            });
            // megaSteps[currentStep].element.style.border = "2px solid red";
            setHilight();
            positionPlacardByElement();
        };

        // set Hilight
        const setHilight = () => {
            const currentEl = megaSteps[currentStep].element;
            currentBB = currentEl.getBoundingClientRect();
            const gap = 5;
            const maxWidth = window.innerWidth - 2 * gap - 4;
            const maxHeight = window.innerHeight - 2 * gap - 4;
            megaHilightEl.style.left = currentBB.left - gap + "px";
            megaHilightEl.style.top = currentBB.top - gap + "px";
            megaHilightEl.style.width =
                Math.min(currentBB.width + 2 * gap, maxWidth) + "px";
            megaHilightEl.style.height =
                Math.min(currentBB.height + 2 * gap, maxHeight) + "px";
        };

        const nextPlacard = () => {
            currentStep = (currentStep + 1) % megaSteps.length;
            setPlacard();
        };

        const prevPlacard = () => {
            currentStep =
                (currentStep - 1 + megaSteps.length) % megaSteps.length;
            // console.log('currentStep: ', currentStep, 'of', megaSteps.length - 1);
            setPlacard();
        };

        const hidePlacard = () => {
            megaPlacard.classList.add("hidden");
            megaHilightEl.classList.add("hidden");
        };

        const showPlacard = () => {
            megaPlacard.classList.remove("hidden");
            megaHilightEl.classList.remove("hidden");
        };

        const positionPlacardByElement = () => {
            // Clear position styles
            megaPlacard.style.left =
                megaPlacard.style.top =
                megaPlacard.style.right =
                megaPlacard.style.bottom =
                    null;

            const pointer = megaPlacard.querySelector(".pointer");
            pointer.className = "pointer";
            const el = megaSteps[currentStep].element;
            // Is whole element within the window?
            // If not, fit as much as possible

            // get el's distance top, right, bottom, left from window edges
            let rect = el.getBoundingClientRect();
            // console.log('rect: ',rect);

            const top = rect.top;
            const right = Math.max(window.innerWidth - rect.right, 10);
            const bottom = window.innerHeight - rect.bottom;
            const left = Math.max(rect.left, 10);

            // 0,1,2,3 = t,l,b,r

            // Determine best fit for placard in window and abutting element

            // Position pointer
            // default right
            let pointerSide = 1;
            let pointerClass = "";
            if (top > right && top > left && top > bottom) {
                // put placard above element
                // pointerside is bottom
                pointerSide = 2;
                // console.log('top')
                pointerClass += "bottom";
            } else if (right > top && right > left && right > bottom) {
                // put placard right of element
                // pointerside is left
                pointerSide = 3;
                // console.log('right')
                pointerClass += "left";
            } else if (bottom > top && bottom > right && bottom > left) {
                // put placard below element
                // pointerside is top
                pointerSide = 0;
                // console.log('bottom')
                pointerClass += "top";
            } else {
                // put placard left of element
                // pointerside is right
                // console.log('left')
                pointerClass += "right";
            }
            pointer.classList.add(pointerClass);
            pointerClass = "-";

            const gap = 10;
            // Position placard
            if (pointerSide === 2) {
                // top
                megaPlacard.style.bottom = bottom + rect.height + gap + "px";
            } else if (pointerSide === 1) {
                // left
                megaPlacard.style.right = right + rect.width + gap + "px";
            } else if (pointerSide === 0) {
                // bottom
                megaPlacard.style.top = rect.bottom + gap + "px";
            } else if (pointerSide === 3) {
                // right
                const hilightRect = megaHilightEl.getBoundingClientRect();
                megaPlacard.style.left =
                    hilightRect.left + hilightRect.width + gap + "px";
                // megaPlacard.style.left = left + rect.width + gap + "px";
            }
            if (pointerSide === 0 || pointerSide === 2) {
                // is above or below
                if (left > right) {
                    megaPlacard.style.right = right + "px";
                    // console.log("right");
                    pointerClass += "right";
                } else {
                    megaPlacard.style.left = left + "px";
                    // console.log("left");
                    pointerClass += "left";
                }
            } else {
                // is left or right
                if (top > bottom) {
                    megaPlacard.style.bottom = bottom + "px";
                    // console.log("top");
                    pointerClass += "bottom";
                } else {
                    megaPlacard.style.top = top + "px";
                    // console.log("bottom");
                    pointerClass += "top";
                }
            }
            pointer.classList.add(pointerClass);
        };

        window.addEventListener("keydown", (event) => {
            if (!megaPlacard.classList.contains("hidden")) {
                if (event.code === "ArrowLeft") {
                    // back arrow
                    prevPlacard();
                } else if (event.code === "ArrowRight") {
                    // forward arrow
                    nextPlacard();
                }
            }
        });

        buildPlacard();
        // console.log("end of mega-walkthrough.js");
        return {
            setCopy: (copy) => {
                setCopy(copy);
            },
            start: () => {
                setPlacard(0);
                showPlacard();
            },
            hide: () => {
                hidePlacard();
            },
            show: () => {
                showPlacard();
            },
            toggle: () => {
                if (megaPlacard.classList.contains("hidden")) {
                    showPlacard();
                } else {
                    hidePlacard();
                }
            },
        };
    })();
