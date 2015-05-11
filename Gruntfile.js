module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', '*.js'],
            options: {
                ignores: []
            }
        },
        jscs: {
            src: "*.js",
            options: {
                config: ".jscsrc"
            }
        }
    });


    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs'); // js code style
    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('style', ['jscs']);
};
