$("#enable").change(function() {
    window.opener.setEnableAnalytics($("#enable").is(":checked"));
});

$("button").click(function() {
    window.close();
});
