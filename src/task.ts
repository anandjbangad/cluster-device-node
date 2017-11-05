import path = require('path');
import fs = require("fs");
import * as itf from "../../cluster-common/common/interfaces"
import MA = require('moving-average');
import SA = require('simple-average');
import winston = require("winston")
import { startUpdatingLatency } from "./app"



let rspMa = MA(5 * 1000); // 5sec
let latencyMean = SA(); // 10 minutes
export const taskInit = (global) => {
    this.globalCtx = {};
    this.globalCtx = global;
}

let delay_bw_task = 1000;
export function getDelayBwTask(): number {
    return delay_bw_task;
}
export function setDelayBwTask(value: number) {
    winston.info("delay set is ", value)
    delay_bw_task = value;
}
export function stressTask(globalCtx) {
    (function repeat() {
        let edge_req: itf.e_edge_req = {
            task_id: 3,
            type: "devmsg",
            payload: "",
            sentTime: Date.now(),
            ttl: 3
        }
        globalCtx.amqp.ch.sendToQueue('d_task1_req', Buffer.from(JSON.stringify(edge_req)));
        globalCtx.req_count++;

        setTimeout(repeat, delay_bw_task);
    })();
}

export function task2(globalCtx) {
    (function repeat() {
        let edge_req: itf.e_edge_req = {
            task_id: 1,
            type: "devmsg",
            payload: "",
            sentTime: Date.now(),
            ttl: 3
        }
        globalCtx.amqp.ch.sendToQueue('d_task1_req', Buffer.from(JSON.stringify(edge_req)));
        globalCtx.req_count++;

        setTimeout(repeat, delay_bw_task);
    })();
}
let isFirstRspCame: boolean = false;
export const onRsp = (json_message) => {

    //console.log(" [x] Received %s", msg.content.toString());
    let message: itf.e_edge_rsp = JSON.parse(json_message.content);
    // ma.push(Date.now(), Math.random() * 500);
    rspMa.push(Date.now(), Date.now() - message.sentTime);
    latencyMean.add(Date.now() - message.sentTime);
    winston.debug("Diff is:", Date.now() - message.sentTime)
    winston.debug('moving average now is', rspMa.movingAverage(), latencyMean.avg);
    winston.verbose("Device Client:", ++this.globalCtx.rsp_count, "/", this.globalCtx.req_count, message.result);
    if (isFirstRspCame == false) {
        isFirstRspCame = true;
        //call function after first rsp
        startUpdatingLatency();
    }
}
export const getMovingAverage = () => {
    if (typeof rspMa.movingAverage() == "undefined") {
        return [0, latencyMean.avg];
    } else {
        return [rspMa.movingAverage(), latencyMean.avg];
    }
}
export function task1(globalCtx) {
    let genObj = walkSync(path.join(__dirname, '../../dataset'));
    genObj.next();
    (function repeat() {

        let val = genObj.next();
        if (!val.done) {
            console.log(val.value);
            fs.readFile(val.value, function (err, original_data) {
                var base64Image = original_data.toString('base64');
                //getDecodedText(base64Image);
                let json_message: itf.e_edge_req = {
                    type: "devmsg",
                    payload: base64Image,
                    task_id: 2,
                    sentTime: Date.now(),
                    ttl: 3
                };
                globalCtx.amqp.ch.sendToQueue('d_task1_req', Buffer.from(JSON.stringify(json_message)));
                globalCtx.req_count++;
            });
            setTimeout(repeat, delay_bw_task);
        }
    })();

    console.log("Connection Established");
}

export function task1WS(ws) {
    let genObj = walkSync(path.join(__dirname, '../../dataset'));
    genObj.next();
    let interval = setInterval(() => {
        let val = genObj.next();

        if (val.done) {
            clearInterval(interval);
        } else {
            console.log(val.value);
            fs.readFile(val.value, function (err, original_data) {
                var base64Image = original_data.toString('base64');
                //getDecodedText(base64Image);
                let json_message: itf.e_edge_req = {
                    type: "devmsg",
                    payload: base64Image,
                    task_id: 2,
                    sentTime: Date.now(),
                    ttl: 3
                };
                ws.send(JSON.stringify(json_message));
            });
        }
    }, delay_bw_images);
    console.log("Connection Established");
}

var walkSync = function* (dir) {

    if (dir[dir.length - 1] != '/') dir = dir.concat('/')

    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);

    for (let file of files) {
        if (fs.statSync(dir + file).isDirectory()) {
            yield* walkSync(dir + file + '/');
        }
        else {
            yield (dir + file);
        }
    }
};