
    var   cmds = require('./cmd')
        , flagger = require('./util/flagger')
        , project = require('./project/project')
        , haxelib = require('./util/haxelib')
        , util = require('./util/util')
        , path = require('path')
        , fs = require('graceful-fs')
        , fse = require('fs-extra')


//initial setup

    project.defaults = require('./project.defaults');

var internal = {};
var flow = {
    bin_path : util.normalize(process.argv[0]),
    flow_path : util.normalize(path.dirname(process.argv[1])),
    run_path : util.normalize(process.argv[2]),
    system : util.normalize(process.argv[3]),
    quiet : {},
    log_level : 2,
    project : project,
    version : require('./package.json').version,
    config : require('./config'),
    timing : require('./config').build.timing,
    execute : function(_flow, cmd, done) {
        cmd.verify(_flow, function(err, data) {

            if(!err) {
                cmd.run(_flow, data, done);
            } else {
                cmd.error(_flow, err);
                if(done) {
                    done(err,null);
                }
            }

        }); //verify
    },
    log : function(level) {
        var args = Array.prototype.slice.call(arguments,1);
        if(level <= this.log_level && this.log_level != 0) {
            if(args[0] && args[0].constructor != Object) {
                args[0] = 'flow / ' + args[0];
            }
            console.log.apply(console, args);
        }
    },
    save_user_config : function() {
        internal.save_user_config(this);
    }

};

//main command processing, called after haxelib
//async init to query paths and config
internal.finished = function() {

        //restore
    process.chdir(internal.start_cwd);

        //make sure failures are returned as such
    if(flow.project.failed) {
        process.exit(1);
    }

} //finished

internal.run = function() {

        //for when the build process is complete
    flow.finished = internal.finished;

    //store old path because we will go back
    internal.start_cwd = process.cwd();

        //builds happen in the working path
    flow.log('');
    flow.log(3, 'running in %s', flow.run_path);
    process.chdir(flow.run_path);

            //get the requested command
        var requested = flow.flags._at(0);
        var command = flow.flags._alias(requested);
            //find the command implementation
        var cmd = cmds[command];

            //check if exists
        if(cmd) {
            flow.execute(flow, cmd);
        } else {
            cmds.usage.run(flow, requested ? 'unknown command ' + requested : '');
        }


} //run

internal.user_config_path = function(flow) {

    var home = util.normalize(util.find_home_path(flow), true);
    var config_file = '.flow.config.json';
    var abs_config = util.normalize( path.join(home, config_file) );

    return abs_config;

} //user_config_path

internal.get_user_config = function(flow) {

    var conf;

    if(fs.existsSync(flow.user_config_path)) {
        flow.log(2, 'found custom config at %s', flow.user_config_path);
        var content = fs.readFileSync(flow.user_config_path, 'utf8');
        try {
            conf = JSON.parse(content);
        } catch(e) {
            console.log('error in user config file :');
            throw e;
        }
    }

    return conf;

} //get_user_config

internal.save_user_config = function(flow) {

    var _contents = JSON.stringify(flow.user_config, null,'    ');

    flow.log(2, 'config - saving user config to `%s`', flow.user_config_path);
    flow.log(3, 'config - saving user config as `%s`', _contents);

    fse.ensureFileSync(flow.user_config_path);
    fs.writeFileSync(flow.user_config_path, _contents, 'utf8');

} //save_user_config

//entry point

    var args = [].concat(process.argv);
    args = args.splice(4, args.length-4);

    flow.flags = flagger.parse(args);

    if(flow.flags.log !== undefined) {
        flow.log_level = flow.flags.log;
    }

    //first check critical flags
    if(!args.length || flow.flags._has('usage')) {

        cmds.usage.run(flow, '');

    } else if((flow.flags._has('version') && args.length < 3) || flow.flags.version && args.length < 3) {

        if(!flow.flags.json) {
            console.log(flow.version);
        } else {
                //this may be redundant but might change in future
            console.log(JSON.stringify(flow.version));
        }

    } else if(flow.flags._has('er') && args.length == 1) {

        require('./util/er').er();

    } else {

        if(flow.flags._has('info')) {
            flow.log_level = 0;
        }

            //read any potential user config on top of the
            //existing config values, as these override defaults
        flow.server_path = path.join( flow.flow_path, 'tools/http-server/http-server');
        flow.user_config_path = internal.user_config_path(flow);
        flow.user_config = internal.get_user_config(flow);
        flow.config = util.merge_combine( flow.user_config, flow.config );

            //start with initing the project state values
        if(!flow.project.init(flow)) {
            return;
        }

            //useful immediate information
        flow.log(2, '%s (node.js %s)', flow.version, process.version);
        flow.log(3, 'current platform is %s', flow.system);
        flow.log(2, 'target is %s', flow.target, flow.target != 'web' ? '( arch '+flow.target_arch+' )' : '' );

        var state = [];

        if(flow.flags._has('build')) {
            state.push('build only');
        } else if(flow.flags._has('compile')) {
            state.push('compile only');
        }

        if(flow.flags.debug) {
            state.push('debug = true');
        }

        if( flow.target == 'ios' &&
           (flow.target_arch == 'sim' || flow.target_arch == 'sim64')) {
            state.push('simulator = true');
        }

        if(state.length) {
            flow.log(2, state.join(', '));
        }

            //init haxelib cache,
            //and when it's complete,
            //run the main path
        haxelib.init(flow, internal.run);

    } //non critical flags

