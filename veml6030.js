'use strict';

module.exports = function (RED) {
    const VEML6030 = require('@cabinfo.eu/veml6030');
    const MAX_INIT_ERRORS=50;

    function Veml6030(n) {
        RED.nodes.createNode(this, n);
        var node = this;

        node.bus = parseInt(n.bus);
        node.addr = parseInt(n.address, 16);
        node.topic = n.topic || "";
        node.initialized = false;
        node.init_errors= 0;

        // init the sensor
        node.status({ fill: "grey", shape: "ring", text: "Init..." });
        node.log("Initializing on bus" + node.bus + " addr:" + node.addr);
        node.sensor = new VEML6030({debug: false});
        var fnInit= function() {
            node.sensor.init().then(function (ID) {
                node.initialized = true;
                node.type = "VEML6030";
                node.status({ fill: "green", shape: "dot", text: node.type + " ready" });
                node.log("Sensor " + node.type + " initialized.");
            }).catch(function (err) {
                node.initialized=false;
                node.init_errors++;
                node.status({ fill: "red", shape: "ring", text: "Sensor Init Failed" });
                node.error("Sensor Init failed [" + node.init_errors + "]-> " + err);
                if(node.init_errors > MAX_INIT_ERRORS) {
                    node.error("Init failed more than " + MAX_INIT_ERRORS + " times. The senser will remain in failed stated.");
                }
            });
        };
        // Init
        fnInit();
        // trigger measure
        node.on('input', function (_msg) {
            if (!node.initialized) {
                //try to reinit node until no sensor is found with max retries
                if(node.init_errors <= MAX_INIT_ERRORS) fnInit();
            }
            if (!node.initialized) {
                node.send(_msg); // msg bypass
            } else {
                node.sensor.readSensorData(false).then(function (data) {
                    _msg.payload = data;
                    data.model = node.type;
                    if (node.topic !== undefined && node.topic !== "") _msg.topic = node.topic;
                    node.send(_msg);
                    var sText = node.type + "[Lux:" + Math.round(data.luxValue);
                    node.status({ fill: "green", shape: "dot", text: sText + "]" });
                }).catch(function (err) {
                    node.status({ fill: "red", shape: "ring", text: "Sensor reading failed" });
                    node.error("Failed to read data ->" + err);
                    node.send(_msg); // msg bypass
                });
            }
            return null;
        });

    } // VEML6030

    RED.nodes.registerType("Veml6030", Veml6030);
};
