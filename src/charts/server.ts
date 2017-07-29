
var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    sys = require('util'),
    exec = require('child_process').exec,
    child;

import winston = require("winston")
import * as myTask from "../task"
var qs = require('querystring');
let myChartServerStartTime: number = 0;
let isChartStarted = false;
// declare module "*!text" {
//     const content: string;
//     export default content;
// }
// import indexFile from "./index.html!text";

// If all goes well when you open the browser, load the index.html file
function handler(req, res) {
    if (req.method === "GET") {
        fs.readFile(__dirname + '/../../index.html', function (err, data) {
            if (err) {
                // If no error, send an error message 500
                console.log(err);
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200);
            res.end(data);
        });
    }
    if (req.method === "POST") {
        if (req.url === "/") {
            var body = '';
            req.on('data', function (data) {
                body += data;

                // Too much POST data, kill the connection!
                // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                if (body.length > 1e6)
                    req.connection.destroy();
            });
            req.on('end', function () {
                var post = qs.parse(body);
                console.log(post)
                // use post['blah'], etc.
                //update (post['InputVal'])
                res.writeHead(200);
                res.end();
            });
        }
    }
}
export function startCharting() {
    // Listen on port 8000
    app.listen(8001);
    if (isChartStarted == true) {
        winston.error("Chart is already started!!!!!!!!")
    }
    isChartStarted = true;
    myChartServerStartTime = Date.now();

    // When we open the browser establish a connection to socket.io.
    // Every 5 seconds to send the graph a new value.

    io.sockets.on('connection', function (socket) {

        setInterval(function () {
            child = exec("cat /sys/class/thermal/thermal_zone0/temp", function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);
                } else {
                    Promise.all([myTask.getMovingAverage()]).then(values => {
                        // You must send time (X axis) and a temperature value (Y axis)
                        // var date = new Date().getTime();
                        var date = Math.floor((new Date().getTime() - myChartServerStartTime) / 1000);
                        var temp = parseFloat(stdout) / 1000;
                        socket.emit('rspAvg', date, {
                            avg5sec: values[0][0],
                            avg: values[0][1],
                            jobDelay: myTask.getDelayBwTask()
                        });
                        socket.emit('jobDelay', date, myTask.getDelayBwTask());
                    })
                }
            });
        }, 3000);

        socket.on("message", function incoming(message) {
            //input throttle rate
            let result = parseInt(message);
            myTask.setDelayBwTask(result)
        });
    });
}