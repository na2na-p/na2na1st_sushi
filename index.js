"use strict";
const config = require('./config');
const request = require('request-promise');
const { get } = require('request');
require('date-utils');
const dayjs = require('dayjs');
const fs = require('fs');
const WebSocketClient = require('websocket').client;
//.envから設定を読み込む
const dotenv = require('dotenv');
dotenv.config();
//.envのTOKENを変数に入れる
const TOKEN = process.env.TOKEN;
const uuid = require('node-uuid');
var received_message;
var received_from;
var reply_message;
var reply_id;
let client;
function ws_connect() {
    client = new WebSocketClient();
    client.connect(config.wss_url + `?i=${TOKEN}`);
    client.on('connectFailed', function (error) {
        console.log('Connect Error: ' + error.toString());
    });
    client.on('connect', function (connection) {
        connection.sendUTF(JSON.stringify({
            "type": "connect",
            "body": {
                channel: 'main',
                id: `${uuid.v4()}`,
                params: {
                    mention: true
                }
            }
        }));
        console.log('WebSocket Client Connected');
        connection.on('error', function (error) {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', function () {
            console.log('echo-protocol Connection Closed');
            ws_connect();
        });
        connection.on('message', function (raw_message) {
            if (raw_message.type === 'utf8') {
                let message = JSON.parse(raw_message.utf8Data);
                if (message.body.type == "mention") {
                    if (message.body.body.text != null) { //この辺ヤケクソで絞ってから放置してる
                        if (message.body.body.text != undefined && message.body.body.text != received_message) {
                            received_message = message.body.body.text;
                            if (message.body.body.user.name != null) { //名前セット無しに対応
                                received_from = message.body.body.user.name;
                                ;
                                //received_fromの文字列に"@"が含まれる場合、"@"の後ろに"\u200B"を追加
                                if (received_from.includes("@")) {
                                    received_from = received_from.replace("@", "@\u200B");
                                }
                            }
                            else {
                                received_from = message.body.body.user.username;
                                if (received_from.includes("@")) {
                                    received_from = received_from.replace("@", "@\u200B");
                                }
                            }
                            reply_id = message.body.body.id;
                            let raw_date = new Date();
                            let is_Post_Helper_required = false;
                            let is_reply = true;
                            //ここからおたのしみ部分
                            if (received_message != null) {
                                if (received_message.includes("サイコロ振って")) {
                                    //サイコロを振る
                                    let dice_result = Math.floor(Math.random() * 6) + 1;
                                    let dice_message = `(ｺﾛｺﾛ) ${dice_result}が出ました > ${received_from}さん`;
                                    reply_message = dice_message;
                                    is_Post_Helper_required = true;
                                }
                                else if (received_message.includes("d") && received_message.includes("振って")) {
                                    let roll_result_msg = null;
                                    if (received_message.match(/[０-９]/)) {
                                        roll_result_msg = "半角数字で入力してください！>" + received_from + "さん";
                                    }
                                    else {
                                        let raw_dice_roll = received_message.match(/[0-9]{1,}d[0-9]{1,}/)[0];
                                        let dice_roll = raw_dice_roll.match(/[0-9]{1,}/g);
                                        let times = dice_roll[0];
                                        let range = dice_roll[1];
                                        //(ｺﾛｺﾛ) 1 1 1 (合計3)が出ました >なずな＠Ship1 :w_ktn:​​さん
                                        if (times > 20) {
                                            roll_result_msg = "ダイスの数が多すぎますよ...>" + received_from + "さん";
                                        }
                                        else if (range > 999999999) {
                                            roll_result_msg = "ダイスの目の数が多すぎます..." + received_from + "さん";
                                        }
                                        else if (range <= 0 || times <= 0) {
                                            roll_result_msg = "それってやる意味あります...?" + received_from + "さん";
                                        }
                                        else {
                                            roll_result_msg = "(ｺﾛｺﾛ)  ";
                                            let roll_result = new Array();
                                            for (let index = 0; index < times; index++) {
                                                roll_result[index] = getRandomArbitrary(1, range);
                                                roll_result_msg = roll_result_msg + roll_result[index] + "  ";
                                            }
                                            let roll_sum = roll_result.reduce((a, x) => a += x, 0);
                                            roll_result_msg = roll_result_msg + "(合計" + roll_sum + ")が出ました>" + received_from + "さん";
                                        }
                                    }
                                    reply_message = roll_result_msg;
                                    is_Post_Helper_required = true;
                                }
                                else if (received_message.includes("今日の") && received_message.includes("運勢は") && ((received_message.includes("？")) || received_message.includes("?"))) {
                                    let date_url = raw_date.toFormat("YYYY/MM/DD");
                                    if (received_message.includes("牡羊座") || received_message.includes("おひつじ座")) {
                                        get_fortune(date_url, 0).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("牡牛座") || received_message.includes("おうし座")) {
                                        get_fortune(date_url, 1).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("双子座") || received_message.includes("ふたご座")) {
                                        get_fortune(date_url, 2).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("蟹座") || received_message.includes("かに座")) {
                                        get_fortune(date_url, 3).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("獅子座") || received_message.includes("しし座")) {
                                        get_fortune(date_url, 4).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("乙女座") || received_message.includes("おとめ座")) {
                                        get_fortune(date_url, 5).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("天秤座") || received_message.includes("てんびん座")) {
                                        get_fortune(date_url, 6).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("蠍座") || received_message.includes("さそり座")) {
                                        get_fortune(date_url, 7).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("射手座") || received_message.includes("いて座")) {
                                        get_fortune(date_url, 8).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("山羊座") || received_message.includes("やぎ座")) {
                                        get_fortune(date_url, 9).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("水瓶座") || received_message.includes("みずがめ座")) {
                                        get_fortune(date_url, 10).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                    else if (received_message.includes("魚座") || received_message.includes("うお座")) {
                                        get_fortune(date_url, 11).then(result_message => post_note(result_message, true, reply_id));
                                    }
                                }
                                else if (received_message.includes("色決めて")) {
                                    let r = getRandomArbitrary(0, 255);
                                    let g = getRandomArbitrary(0, 255);
                                    let b = getRandomArbitrary(0, 255);
                                    let color_hex = rgb2hex([r, g, b]);
                                    reply_message = (`RGB: ${r},${g},${b}(#​ ${color_hex})とかどう？ >${received_from}さん \nhttps://colorate.azurewebsites.net/ja/Color/${color_hex}`);
                                    is_Post_Helper_required = true;
                                }
                                else if (received_message.includes("いい") && ((received_message.includes("？")) || received_message.includes("?"))) {
                                    let yn = getRandomArbitrary(1, 100);
                                    if (yn <= 17) {
                                        reply_message = 'いいよ';
                                    }
                                    else if (yn > 17 && yn <= 28) {
                                        reply_message = "いいと思います";
                                    }
                                    else if (yn >= 29 && yn <= 40) {
                                        reply_message = "やっちまいな！";
                                    }
                                    else if (yn >= 41 && yn <= 51) {
                                        reply_message = "許す";
                                    }
                                    else if (yn >= 52 && yn <= 62) {
                                        reply_message = "(乂'ω')ﾀﾞﾒｰ";
                                    }
                                    else if (yn >= 63 && yn <= 72) {
                                        reply_message = "今は耐える時";
                                    }
                                    else if (yn >= 73 && yn <= 84) {
                                        reply_message = "だめだよ";
                                    }
                                    else if (yn >= 85 && yn <= 95) {
                                        reply_message = "アカン";
                                    }
                                    else if (yn > 95) {
                                        reply_message = "好きにすればいいんじゃないですかね";
                                    }
                                    reply_message = reply_message + " >" + received_from + "さん";
                                    is_Post_Helper_required = true;
                                    is_reply = true;
                                }
                                if (is_Post_Helper_required) {
                                    post_note(reply_message, is_reply, reply_id);
                                }
                            }
                        }
                    }
                }
            }
        });
        //接続済みのストリームからjsonを受け取る
    });
}
ws_connect();
//Misskeyにnoteを投稿する
async function post_note(message, is_reply, reply_id) {
    var options;
    if (is_reply) {
        options = {
            url: 'https://sushi.ski/api/notes/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            json: {
                i: TOKEN,
                visibility: "public",
                "localOnly": false,
                text: message,
                replyId: reply_id
            }
        };
    }
    else {
        options = {
            url: 'https://sushi.ski/api/notes/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            json: {
                i: TOKEN,
                visibility: "public",
                "localOnly": false,
                text: message,
            }
        };
    }
    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
                console.log(error);
            }
            else {
                resolve(body);
                //console.log(body);
            }
        });
    });
}
async function get_fortune(date_url, horoscope) {
    const jugemkey = "http://api.jugemkey.jp/api/horoscope/free/" + date_url;
    const options = {
        url: jugemkey,
        method: 'GET',
        json: true
    };
    const raw_result = await request(options);
    let result = raw_result.horoscope[date_url][horoscope];
    let result_message = "今日の" + result['sign'] + "の運勢は...\n総合運:" + result['total'] + "/5\n金運:" + result['money'] + "/5\n仕事運:" + result['job'] + "/5\n恋愛運:" + result['love'] + "/5\nラッキーアイテム:" + result['item'] + "\nラッキーカラー:" + result['color'] + "\nコメント:" + result['content'];
    return result_message;
}
//乱数は基本これ使う
function getRandomArbitrary(min, max) {
    let result = Math.random() * (max - min) + min;
    return Math.floor(result);
}
//ランダムカラーピッカーのもの
function rgb2hex(rgb) {
    return rgb.map(function (value) {
        return ("0" + value.toString(16)).slice(-2);
    }).join("");
}
