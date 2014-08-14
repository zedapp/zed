$(function() {
    var githubToken = /token=(.*)$/.exec(location)[1];

    $("#token").val(githubToken);

    function verifyToken(token) {
        $.ajax({
            type: "GET",
            url: "https://api.github.com/user?access_token=" + token,
            dataType: "json",
            processData: false,
            success: function(resp) {
                window.opener.setToken("githubToken", $("#token").val());
                window.close();
            },
            error: function() {
                $("#hint").text("Invalid token");
            }
        });
    }

    $("#token-form").submit(function(event) {
        event.preventDefault();
        verifyToken($("#token").val());
    });
});
