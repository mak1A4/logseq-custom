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

const startObserving = (obsFn, throttleLimit) => {
    if (throttleLimit) {
        obsFn = throttle(obsFn, throttleLimit);
    }
    const obs = new MutationObserver(obsFn);
    obs.observe(watchTarget, {
        subtree: true,
        attributes: true,
    });
};

const findParentNode = (el, checkFn) => {
    while (el.parentNode) {
        el = el.parentNode;
        if (checkFn(el)) return el;
    }
    return null;
};

const getTimeDiffInHours = (startTime, endTime) => {
    if (!endTime) {
        let s = startTime.split("-");
        startTime = s[0].trim();
        endTime = s[1].trim();
    }
    let ts = (time_str) => {
        var parts = time_str.split(':');
        return parts[0] * 3600 + parts[1] * 60;
    };
    return Math.abs(ts(startTime) - ts(endTime)) / 3600;
}

// ================================== END COMMON

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
        } catch (err) {
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

const getTimelogBlocks = (uuid) => {
    return logseq.api.datascript_query(`
    [:find (pull ?b [*])
        :where
            [?b :block/parent ?h]
            [?h :block/uuid #uuid "${uuid}"]]`
    ).map((b) => b[0]);
};

const getTimeStrFromBlockContent = (content) => {
    return content.match(/\{(.*?)\}/);
};

const addDurationToTimelogEntries = (uuid) => {
    let tlb = getTimelogBlocks(uuid);
    let sum = tlb.map((b) => {
        let tsMatch = getTimeStrFromBlockContent(b.content);
        if (!tsMatch || tsMatch.length == 0) return;

        let durationFloat = parseFloat(getTimeDiffInHours(tsMatch[1]));
        let durationStr = `$(${durationFloat.toFixed(2)}h)`;
        let dmatch = b.content.match(/\$\((.*?)\)/);
        if (dmatch && dmatch.length > 0 && durationStr != dmatch[0]) {
            let newContent = b.content.replace(/\$\((.*?)\)/, durationStr);
            if (newContent.match(/\$\((.*?)\)/g).length == 1) {
                logseq.api.update_block(b.uuid.$uuid$, newContent);
            }
        } else {
            let newContent = b.content + " " + durationStr;
            if (newContent.match(/\$\((.*?)\)/g).length == 1) {
                logseq.api.update_block(b.uuid.$uuid$, newContent);
            }
        }
        return durationFloat;
    }).reduce((result, df) => {
        if (df && !isNaN(df)) result += df;
        return result;
    }, 0);
    
    let sumStr = `$(${sum.toFixed(2)}h)`;
    let sumBlock = logseq.api.get_block(uuid);
    let sumMatch = sumBlock.content.match(/\$\((.*?)\)/);
    if (sumMatch && sumMatch.length > 0 && sumStr != sumMatch[0]) {
        let newContent = sumBlock.content.replace(/\$\((.*?)\)/, sumStr)
        if (newContent.match(/\$\((.*?)\)/g).length == 1) {
            logseq.api.update_block(uuid, newContent);
        }
    } else {
        let newContent = sumBlock.content + " " + sumStr;
        if (newContent.match(/\$\((.*?)\)/g).length == 1) {
            logseq.api.update_block(uuid, newContent);
        }
    }
};

const pushToServiceNow = (uuid) => {
    let env = logseq.api.get_page("env_custom.js");
    if (!env) {
        logseq.api.show_msg("Couldn't find env_custom.js page");
        return;
    }
    let prop = env.properties;
    let instanceUrl = `https://${prop.pushToSnInstance}.service-now.com`;
    let instanceUser = prop.pushToSnUser;
    let instancePass = prop.pushToSnPassword;

    let createTimelog = async (tlblock) => {
        let bodyObj = {};
        let tlsUrl = `${instanceUrl}/api/x_segh4_tilog/timelog_api/create`;
        let authHeader = `Basic ${btoa(instanceUser + ":" + instancePass)}`;

        let tsMatch = getTimeStrFromBlockContent(tlblock.content);
        if (!tsMatch || tsMatch.length == 0) return;

        let durationFloat = parseFloat(getTimeDiffInHours(tsMatch[1]));
        let durationStr = `$(${durationFloat.toFixed(2)}h)`;

        let journalPage = logseq.api.get_page(tlblock.page.id);
        let journalDayStr = journalPage.journalDay.toString();
        let journalYear = journalDayStr.substring(0, 4);
        let journalMonth = journalDayStr.substring(4, 6);
        let journalDay = journalDayStr.substring(6, 8);
        let journalDate = `${journalYear}-${journalMonth}-${journalDay}`;

        bodyObj.date = journalDate;
        bodyObj.description = tlblock.content;
        bodyObj.description = bodyObj.description.replace(tsMatch[0], "");
        bodyObj.description = bodyObj.description.replace(durationStr, "");
        bodyObj.description = bodyObj.description.trim();
        bodyObj.duration = durationFloat;

        let response = await fetch(tlsUrl, {
            "method": "POST",
            "body": JSON.stringify(bodyObj),
            "headers": {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
        return response;
    };

    (async () => {
        let timelogBlocks = await Promise.all(getTimelogBlocks(uuid).map(async (tb) => {
            tb.snResponse = await createTimelog(tb);
            return tb;
        }));
        logseq.api.show_msg(`Created ${timelogBlocks.length} new timelog records`);
    })();
};

const addServiceNowLink = () => {

    document.querySelectorAll(".page-reference").forEach((pr) => {
        if (pr.getAttribute("data-ref").toLowerCase() != "dailytimelog") return;
        let parentBlockNode = findParentNode(pr, (e) => {
            return e.getAttribute("blockid");
        });
        if (!parentBlockNode) {
            logseq.api.show_msg("Couldn't find parent block node");
            return;
        }
        let parentBlockId = parentBlockNode.getAttribute("blockid");
        let parentBlock = logseq.api.get_block(parentBlockId);
        let page = logseq.api.get_page(parentBlock.page.id);
        if (!page || page.name.toLowerCase() == "contents") return;

        addDurationToTimelogEntries(parentBlockId);
        if (!pr.parentNode.querySelector("#push-sn-link")) {
            let pushSnLink = document.createElement("a");
            pushSnLink.id = "push-sn-link";
            pushSnLink.innerHTML = "Push to ServiceNow";
            pushSnLink.href = "#";
            pr.parentNode.append(pushSnLink);
            pushSnLink.onclick = (e) => {
                e.preventDefault();
                pushToServiceNow(parentBlockId);
            };
        }
    });
};

startObserving(addServiceNowLink, 250);

setTimeout(() => {
    let dtlBlocks = logseq.api.datascript_query(`
    [:find (pull ?b [*])
        :where
        [?b :block/page ?p]
        [?p :block/name "jun 8th, 2022"]
        [?b :block/parent ?h]
        [?h :block/content "[[DailyTimelog]]"]]`);
    console.log(dtlBlocks);

}, 1000);