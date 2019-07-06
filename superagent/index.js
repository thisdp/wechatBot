const superagent = require('../config/superagent');
const config = require('../config/index');
const cheerio = require('cheerio');
const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
let md5 = crypto.createHash('md5');
let uniqueId = md5.update(machineIdSync()).digest('hex'); // 获取机器唯一识别码并MD5，方便机器人上下文关联
const ONE = 'http://wufazhuce.com/'; // ONE的web版网站
const TXHOST = 'http://api.tianapi.com/txapi/'; // 天行host
const APIKEY = '762be789103e1ae7b65573f8d4fc0df6'; // 天行key
const TULINGAPI = 'http://www.tuling123.com/openapi/api'; // 图灵1.0接口api

async function getOne() {
  // 获取每日一句
  try {
    let res = await superagent.req(ONE, 'GET');
    let $ = cheerio.load(res.text);
    let todayOneList = $('#carousel-one .carousel-inner .item');
    let todayOne = $(todayOneList[0])
      .find('.fp-one-cita')
      .text()
      .replace(/(^\s*)|(\s*$)/g, '');
    return todayOne;
  } catch (err) {
    console.log('错误', err);
    return err;
  }
}

async function getTXweather() {
  // 获取天行天气
  let url = TXHOST + 'tianqi/';
  try {
    let res = await superagent.req(url, 'GET', {
      key: APIKEY,
      city: config.CITY
    });
    let content = JSON.parse(res.text);
    if (content.code === 200) {
      let todayInfo = content.newslist[0];
      let obj = {
        weatherTips: todayInfo.tips,
        todayWeather:`今天${todayInfo.weather}<br>温度:${todayInfo.lowest}/${todayInfo.highest}<br>${todayInfo.wind} ${todayInfo.windspeed}<br>空气:${todayInfo.air_level} ${todayInfo.air}<br>`
      };
      console.log('获取天行天气成功', obj);
      return obj;
    } else {
      console.log('获取接口失败', content.code);
    }
  } catch (err) {
    console.log('获取接口失败', err);
  }
}

// 天行对接的图灵机器人
async function getTXTLReply(word) {
  let url = TXHOST + 'tuling/';
  let res = await superagent.req(url, 'GET', {
    key: config.TXAPIKEY,
    question: word,
    userid: uniqueId
  });
  let content = JSON.parse(res.text);
  if (content.code === 200) {
    console.log('天行对接的图灵机器人:', content);
    let response = content.newslist[0].reply;
    return response;
  } else {
    return '我好像迷失在无边的网络中了，接口调用错误：' + content.msg;
  }
}

// 图灵智能聊天机器人
async function getTuLingReply(word) {
  let url = TULINGAPI;
  let res = await superagent.req(url, 'GET', {
    key: config.TULINGKEY,
    info: word
  });
  let content = JSON.parse(res.text);
  if (content.code === 100000) {
    return content.text;
  } else {
    return '出错了：' + content.text;
  }
}

// 天行聊天机器人
async function getReply(word) {
  let url = TXHOST + 'robot/';
  let res = await superagent.req(url, 'GET', {
    key: APIKEY,
    question: word,
    mode: 1,
    datatype: 0,
    userid: uniqueId
  });
  let content = JSON.parse(res.text);
  if (content.code === 200) {
    let response = '';
    if (content.datatype === 'text') {
      response = content.newslist[0].reply
    } else if (content.datatype === 'view') {
      response =`虽然我不太懂你说的是什么，但是感觉很高级的样子，因此我也查找了类似的文章去学习，你觉得有用吗<br>《${content.newslist[0].title}》${content.newslist[0].url}`
    } else {
      response = '你太厉害了，说的话把我难倒了，我要去学习了，不然没法回答你的问题';
    }
    return response;
  } else {
    return '我好像迷失在无边的网络中了，你能找回我么';
  }
}

async function getSweetWord() {
  // 获取土味情话
  let url = TXHOST + 'saylove/';
  try {
    let res = await superagent.req(url, 'GET', { key: APIKEY });
    let content = JSON.parse(res.text);
    if (content.code === 200) {
      let sweet = content.newslist[0].content;
      let str = sweet.replace('\r\n', '<br>');
      return str;
    } else {
      console.log('获取接口失败', content.msg);
    }
  } catch (err) {
    console.log('获取接口失败', err);
  }
}

/**
 * 获取垃圾分类结果
 * @param {String} word 垃圾名称
 */

async function getRubbishType(word) {
  let url = TXHOST + 'lajifenlei/';
  let res = await superagent.req(url, 'GET', { key: APIKEY, word: word });
  let content = JSON.parse(res.text);
  if (content.code === 200) {
    let type;
    if (content.newslist[0].type == 0) {
      type = '是可回收垃圾';
    } else if (content.newslist[0].type == 1) {
      type = '是有害垃圾';
    } else if (content.newslist[0].type == 2) {
      type = '是厨余(湿)垃圾';
    } else if (content.newslist[0].type == 3) {
      type = '是其他(干)垃圾';
    }
    let response =
      content.newslist[0].name +
      type +
      '<br>解释：' +
      content.newslist[0].explain +
      '<br>主要包括：' +
      content.newslist[0].contain +
      '<br>投放提示：' +
      content.newslist[0].tip;
    return response;
  } else {
    console.log('查询失败提示：', content.msg);
    return '暂时还没找到这个分类信息呢';
  }
}

module.exports = {
  getOne,
  getTXweather,
  getReply,
  getSweetWord,
  getTuLingReply,
  getTXTLReply,
  getRubbishType
};
