function removeWhiteSpace(string) {
  return string.trim();
}

function removeCssAndJSFromHTML(html) {
  if (typeof html == "string") {
    let body = /<body.*?>([\s\S]*)<\/body>/.exec(html);
    if (Array.isArray(body) && body.length > 0) {
      return `<!DOCTYPE html><html><body>${body[1]}</body></html>`;
    }
  }
  return "";
}

module.exports = {
  removeWhiteSpace,
  removeCssAndJSFromHTML
};
