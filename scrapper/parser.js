const { JSDOM, VirtualConsole } = require("jsdom");
const jQuery = require("jquery");

function parseHtmlToDOM(html) {
  const htmlDOM = new JSDOM(html);
  return jQuery(htmlDOM.window);
}

module.exports = {
  parseHtmlToDOM
};
