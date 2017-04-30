
var  cmd = require('../../util/process')
   , path = require('path')
   , native = require('./launch.native')
   , web = require('./launch.web')
   , cmds = require('../')

// > flow launch target -options

var internal = {};

exports.run = function run(flow, data) {

    if(flow.flags['with-files']) {
        flow.execute(flow, cmds['files']);
    }

    internal.launch(flow);

} //run

exports.verify = function verify(flow, done) {

    if(flow.target) {
        flow.project.do_prepare(flow);
        done(null,null);
    } else {
        done(true,null);
    }

} //verify


exports.error = function(flow, err) {

    if(err && err.length > 0) {
        flow.log(1, 'launch / error %s', err);
    }

} //error

internal.launch = function(flow) {

    if(!flow.project.parsed) {
        return;
    }

    if(flow.project.failed) {
        return;
    }

    if( flow.flags.sync ) {
        flow.execute(flow, cmds['sync']);
    }

    flow.log(2, 'launching %s %s for %s\n',
        flow.project.parsed.project.name, flow.project.parsed.project.version, flow.target);

    if(flow.target_cpp) {
        native.launch(flow);
    } else if(flow.target_js) {
        web.launch(flow);
    } else if(flow.target_neko) {
        native.launch(flow);
    } else {        
        flow.log(2, 'launch / nothing to do')
    }

}