$(function() {
    $("#token-form").submit(function(event) {
        event.preventDefault();
        window.opener.setToken("githubToken", $("#token").val());
        window.close();
    });
});
