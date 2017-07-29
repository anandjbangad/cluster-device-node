import { config } from "dotenv";
config({ path: "./.env" });
import path = require('path');
import { task1, task2, stressTask } from "./task";

import Tesseract = require('tesseract.js')

import { Client } from 'node-rest-client';
var client = new Client();
import * as itf from "../../common/interfaces.d"
import jwt = require('jsonwebtoken');
import amqp = require('amqplib');
import { startCharting } from "./charts/server"
import * as myTask from "./task"
import winston = require("winston")
let argv = require('minimist')(process.argv.slice(2));
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    timestamp: true,
    level: process.env.LOGGING_LVL, //{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    colorize: true
});

var globalCtx: any = {};
globalCtx.req_count = 0;
globalCtx.rsp_count = 0;
myTask.taskInit(globalCtx);
if (typeof argv.d != "undefined") {
    myTask.setDelayBwTask(argv.d);
}
// direct way
// set content-type header and data as json in args parameter
var args = jwt.sign({
    data: {
        uri: "hello",
        type: "IOT",
        description: "New device"
    },
    headers: { "Content-Type": "application/json" }
}, 'secret-key');
import WebSocket = require('ws');
import fs = require("fs");
// client.post("http://localhost:9081/devices", args, function (data, response) {
//     // parsed response body as js object
//     //console.log(data);
//     // raw response
//     //console.log(response);
//     console.log("vishu");
//     var token = data.token;


// call rest api to register Device
// upon successfull registration, store secret
// use the secret in websocket communication
//
//console.log("token received is ", data.token);
//imported from core module
//import WebSocket = require('ws');
//amqp.connect('amqp://' + process.env.EDGE_HOST)
amqp.connect('amqp://' + "10.0.10.240")
    .then((conn) => {
        return conn.createChannel();
    })
    .then((ch) => {
        var q = 'd_task1_req';
        q = "";
        globalCtx.amqp = {};
        globalCtx.amqp.ch = ch;
        return ch.assertQueue(q, { durable: false });
    })
    .then(function (q) {
        return globalCtx.amqp.ch.assertQueue('d_task1_rsp', { durable: false });
    })
    .then((q) => {
        // return globalCtx.amqp.ch.consume('d_task1_rsp', (json_message) => {
        //     //console.log(" [x] Received %s", msg.content.toString());
        //     let message: itf.e_edge_rsp = JSON.parse(json_message.content);
        //     console.log("Device Client:", ++globalCtx.rsp_count, "/", globalCtx.req_count, message.result);
        // }, { noAck: true });
        return globalCtx.amqp.ch.consume('d_task1_rsp', myTask.onRsp, { noAck: true });
    })
    .then(() => {
        //start sending requests
        setInterval(() => {
            winston.info("--Req:", globalCtx.req_count, "--Rsp:", globalCtx.rsp_count, "Latency Mean", myTask.getMovingAverage()[1]);
        }, 10000);
        //task1(ws);
        globalCtx.amqp.ch.sendToQueue('d_task1_req', Buffer.from(JSON.stringify({ type: "startChart" })));
        setTimeout(() => {
            if (argv.task == "RT") {
                winston.info("Starting Real Task!")
                task1(globalCtx);
            } else if (argv.task == "ST") {
                //if (argv.task == "ST") {
                winston.info("Starting Stress Task!")
                stressTask(globalCtx);
            } else {
                winston.info("Starting Dummy Task!")
                task2(globalCtx);
            }
        }, 3000)


        //start plotting charts
        startCharting();
    })
    .catch((err) => {
        winston.error(err);
    })
// var ws = new WebSocket('ws://' + process.env.EDGE_HOST + ':' + process.env.EDGE_PORT + '/client', {
//     sid: 'https://websocket.org'
// });
// this.ws = ws;
//import fs = require("fs");
// List all files in a directory in Node.js recursively in a synchronous fashion
// var counter = 15;
// var delay_bw_images = 3000;
// ws.on('open', () => {
//     setInterval(() => {
//         console.error("--Req:", globalCtx.req_count, "--Rsp:", globalCtx.rsp_count);
//     }, 10000);
//     //task1(ws);
//     task2(ws, globalCtx);
//     // //ws.send({});
//     // // var filelist = walkSync(path.join(__dirname, '../dataset'), filelist, ws);
//     // let genObj = walkSync(path.join(__dirname, '../../dataset'), ws);
//     // genObj.next();
//     // let interval = setInterval(() => {
//     //     let val = genObj.next();

//     //     if (val.done) {
//     //         clearInterval(interval);
//     //     } else {
//     //         console.log(val.value);
//     //         fs.readFile(val.value, function (err, original_data) {
//     //             var base64Image = original_data.toString('base64');
//     //             //getDecodedText(base64Image);
//     //             let json_message: itf.e_edge_req = {
//     //                 type: "devmsg",
//     //                 payload: base64Image,
//     //                 task_id: 1
//     //             };
//     //             ws.send(JSON.stringify(json_message));
//     //         });
//     //     }
//     // }, delay_bw_images);
//     // console.log("Connection Established");
// });
// function getDecodedText(decodedImage) {
//     Tesseract.recognize(Buffer.from(decodedImage, 'base64'))
//         .then(txtdata => {
//             console.log('Recognized Text: ', txtdata.text);
//         })
//         .catch(err => {
//             console.log('catch: ', err);
//         })
//         .finally(e => {
//             //console.log('finally\n');
//             //process.exit();
//         });
// }
// ws.on('message', function (json_message, flags) {
//     // flags.binary will be set if a binary data is received.
//     // flags.masked will be set if the data was masked.
//     //globalCtx.rsp_count++;
//     let message: itf.e_edge_rsp = JSON.parse(json_message);
//     console.log("Device Client:", ++globalCtx.rsp_count, "/", globalCtx.req_count, message.result);
// });



// var walkSync = function* (dir, ws) {

//     if (dir[dir.length - 1] != '/') dir = dir.concat('/')

//     var fs = fs || require('fs'),
//         files = fs.readdirSync(dir);

//     for (let file of files) {
//         if (fs.statSync(dir + file).isDirectory()) {
//             yield* walkSync(dir + file + '/', ws);
//         }
//         else {
//             yield (dir + file);
//         }
//     }
// };


//});
let amqpLatency: any = {}
amqp.connect('amqp://' + process.env.PYTHON_HOST)
    .then((conn) => {
        return conn.createChannel();
    })
    .then((ch) => {
        amqpLatency.ch = ch;
        let q = 'latency_upd';
        return ch.assertQueue(q, { durable: false });
        // })
        // .then((q) => {
        //     setInterval(() => {
        //         let json_message_out = {
        //             latency: myTask.getMovingAverage()[1] || 0
        //         }
        //         winston.debug("Sending to latency_upd");
        //         amqpLatency.ch.sendToQueue('latency_upd', Buffer.from(JSON.stringify(json_message_out)));
        //     }, 20000)
    })
export function startUpdatingLatency() {
    winston.info("Now starting seding latency update to python server");
    (function repeat() {
        let movingAvg = myTask.getMovingAverage();

        let json_message_out = {
            latency: movingAvg[1]
        }
        winston.info("Sending to latency_upd @", (movingAvg[0] == 0) ? 1350 : movingAvg[0]);
        amqpLatency.ch.sendToQueue('latency_upd', Buffer.from(JSON.stringify(json_message_out)));

        setTimeout(repeat, (movingAvg[0] == 0) ? 1350 : movingAvg[0]);
    })();

    //  setInterval(() => {
    //     let json_message_out = {
    //         latency: myTask.getMovingAverage()[1]
    //     }
    //     winston.debug("Sending to latency_upd");
    //     amqpLatency.ch.sendToQueue('latency_upd', Buffer.from(JSON.stringify(json_message_out)));
    // }, 1350)
}
