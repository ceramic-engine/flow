

var   mac = require('./icons.mac')
    , web = require('./icons.web')
    , ios = require('./icons.ios')
    , windows = require('./icons.windows')

var internal = {};

exports.run = function run(flow, data, done) {

    var prepared = flow.project.prepared.source;

        //don't care if there is no icon node
    var has_icon = (prepared.project.app && prepared.project.app._icon);
    if(!has_icon) {

        if(done) {
            done();
        }

        return;

    } //has_icon

    var icon = prepared.project.app._icon;

    icon = internal.parse_path(flow, icon);

    icon.source = path.join(prepared.project.app._icon.__path, icon.source);

    prepared.project.app._icon = icon;

    switch(flow.target) {
        case 'mac':
                mac.convert(flow, icon, done);
            break;
        case 'web':
                web.convert(flow, icon, done);
            break;
        case 'ios':
                ios.convert(flow, icon, done);
            break;
        case 'windows':
                windows.convert(flow, icon, done);
            break;
        default:{
                flow.log(3, 'no icon step for', flow.target);
                if(done) {
                    done();
                }
            break;
        }
    } //flow.target

} //run

internal.parse_path = function(flow, icon) {
    var parts = icon.source.split('=>');

    icon.source = parts[0].trim();
    if(parts.length > 1) {
        icon.dest = parts[1].trim();
    }

    return icon;

} //parse_path

exports.verify = function verify(flow, done) {

    flow.project.do_prepare(flow);

    done(null, null);

} //verify

exports.error = function(flow, err) {

} //error
