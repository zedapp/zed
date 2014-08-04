function setPreference(name, value) {
    window.opener.setPreference(name, value);
}

$("#enable").change(function() {
    setPreference("enableAnalytics", $("#enable").is(":checked"));
});

$("#menubar").change(function() {
    setPreference("showMenus", $("#menubar").is(":checked"));
});

$(".start-button").click(function() {
    window.close();
});

$("td").click(function(event) {
    var target = $(event.target).parents("td");
    $("td").removeClass("selected");
    $(target).addClass("selected");
    var mode = target.data("mode");
    console.log("Mode selected", mode);
    switch(mode) {
        case "traditional":
            setPreference("showMenus", true);
            setPreference("persistentTree", true);
            break;
        case "chromeless":
            setPreference("showMenus", $("#menubar").is(":checked"));
            setPreference("persistentTree", false);
            break;
        default:
            console.log("Unknown mode", mode)
    }
});

setTimeout(function() {
    setPreference("enableAnalytics", true);
    setPreference("showMenus", false);
    setPreference("persistentTree", false);
}, 1000);
