const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(
  `<body><div id="container" styles="width:1024px;height:1024px"></div></body>`,
  {
    url: "http://localhost", 
    pretendToBeVisual: true,
    resources: 'usable'
  });
global.window = dom.window;
global.document = dom.window.document;
global.Image = window.Image;
window.console = global.console;
global.fetch = require("node-fetch");

Object.keys(document.defaultView).forEach((property) => {
  if (typeof global[property] === 'undefined') {
    global[property] = document.defaultView[property];
  }
});

global.navigator = {
  userAgent: 'node.js'
};

