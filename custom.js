// common =================================================================
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
const watchTarget = document.getElementById("app-container");
// throttle MutationObserver 
// from https://stackoverflow.com/a/52868150
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = setTimeout(() => (inThrottle = false), limit);
        }
    };
};
// ================================== END COMMON
// property styler =============================================
const updateProperties = function () {
    //update page-properties
    (() => {
        let ppn = document.getElementsByClassName("block-properties")[0];
        if (!ppn) return;
        let ppb = (() => {
            try { return ppn.parentNode.parentNode.parentNode.parentNode.parentNode.children[0].children[1] }
            catch(err) { }
        })();
        if (!ppb) return;
        ppb.style.display = "none";
    })();
    (() => {
        let ppan = document.getElementsByClassName("block-properties")[0];
        if (!ppan) return;
        let ppab = (() => {
            try { return ppan.parentNode.parentNode.parentNode.parentNode.parentNode }
            catch(err) { }
        })();
        if (!ppab) return;
        ppab.style.fontFamily = "Courier New";
        ppab.style.fontSize = "10pt";
    })();
};
const updatePropertiesThrottled = throttle(updateProperties, 1000);
const obsProperties = new MutationObserver(updatePropertiesThrottled);
obsProperties.observe(watchTarget, {
    subtree: true,
    childList: true,
});
//===================================== end of property styler

function updateExcalidraw() {
    document.querySelectorAll(".excalidraw-container").forEach((ex) => {
        let blockId = (() => {
            if (!ex.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode) return;
            return ex.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.getAttribute("blockid");
        })();
        if (!blockId) return;
        document.querySelectorAll(".draw").forEach((d) => {
            d.parentNode.style.display = "none";
        });

        let graphPath = logseq.api.get_user_configs().currentGraph.replaceAll("logseq_local_", "");
        let blockContent = logseq.api.get_block(blockId).content;
        let drawPath = blockContent.match(/\[(.*?)\]/)[1].replaceAll("[", "");
        let fullPath = "vscode://file" + graphPath + "/" + drawPath;
        let drawName = blockContent.match(/\(([^)]+)\)/);
        if (drawName) drawName = drawName[1];

        let excaliLink = document.createElement("a");
        excaliLink.href = fullPath;
        if (drawName) excaliLink.text = drawName;
        else excaliLink.text = drawPath;
        excaliLink.target = "_blank";
        excaliLink.classList.add("external-link");

        try {
            let foundExtLink = ex.parentNode.parentNode.parentNode.parentNode.parentNode.children[1];
            //let foundExtLink = xxx.classList.contains("external-link");
            if (!foundExtLink) {
                ex.parentNode.parentNode.parentNode.parentNode.parentNode.appendChild(excaliLink);
            }
        } catch(err) {
        }
    });
}
const updateExcalidrawThrottled = throttle(updateExcalidraw, 1000);
const obsExcalidraw = new MutationObserver(updateExcalidraw);
obsExcalidraw.observe(watchTarget, {
    subtree: true,
    attributes: true,
});

// namespace prefixes collapser =============================================
function hideNamespace() {
    console.info("====== LS HIDE NAMESPACE v20220314 =====");
    let nmsp = document.querySelectorAll(
        'a.page-ref[data-ref*="/"]:not(.hidden-namespace)'
    );
    for (var i = 0; i < nmsp.length; i++) {
        if (nmsp[i].innerText.indexOf("/") !== -1) {
            nmsp[i].innerHTML =
                "<span style='color:rgb(133, 211, 81)'>..</span>" +
                nmsp[i].innerText.substring(nmsp[i].innerText.lastIndexOf("/"));
            nmsp[i].classList.add("hidden-namespace");
            //console.info(" namespace off ==> " + nmsp[i].innerText);
        }
    }
}

/*const updateHideNamespace = throttle(hideNamespace, 1000);
const obsNamespace = new MutationObserver(updateHideNamespace);
obsNamespace.observe(watchTarget, {
    subtree: true,
    attributes: true,
});*/
//===================================== end of namespace prefixes collapser